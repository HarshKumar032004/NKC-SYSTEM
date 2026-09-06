import { Injectable, UnauthorizedException, Inject, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Redis } from 'ioredis';
import * as otplib from 'otplib';
import * as qrcode from 'qrcode';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { checkPwnedPassword } from '../utils/pwned-password.util';
import { EnvVars } from '../config/env.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AlertsService } from '../modules/alerts/alerts.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService<EnvVars>,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
    private readonly alertsService: AlertsService,
    private readonly mailerService: MailerService,
  ) {}

  // 15 mins lockout
  private LOCKOUT_DURATION = 15 * 60; 
  private MAX_FAILED_ATTEMPTS = 5;

  async validateUser(email: string, pass: string, ip: string): Promise<any> {
    const attemptKey = `login_attempts:${email}:${ip}`;
    const attempts = await this.redisClient.get(attemptKey);
    
    if (attempts && parseInt(attempts) >= this.MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException('Account temporarily locked due to too many failed attempts. Try again later.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Pre-computed argon2 hash for "dummy_password" to normalize timing
    // $argon2id$v=19$m=65536,t=3,p=4$qQfUjNlM2f3xP4h4X+p3/Q$y5v5h4U8q8z3R6t2z6y5v5h4U8q8z3R6t2z6y5v5h4U
    const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$vJ7W0F9mHqWwN9N7qH6z/A$p3lWJgWwT9N2V8u7O3X2F8K7W6L5R5D3W5N9L6F8Z8';

    if (!user || !user.isActive) {
      await this.incrementFailedAttempts(attemptKey);
      // Perform dummy verify to prevent timing attacks
      try { await argon2.verify(DUMMY_HASH, pass); } catch {}
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, pass);
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // On success, reset attempts
    await this.redisClient.del(attemptKey);
    return user;
  }

  private async incrementFailedAttempts(key: string) {
    const count = await this.redisClient.incr(key);
    if (count === 1) {
      await this.redisClient.expire(key, this.LOCKOUT_DURATION);
    }
  }

  async login(user: any, ip?: string, userAgent?: string) {
    if (ip && userAgent) {
      const currentDevice = `${ip}|${userAgent}`;
      const lastDevice = await this.redisClient.get(`device:${user.id}`);
      
      if (lastDevice && lastDevice !== currentDevice) {
        this.logger.warn(`[Security Alert Email Queued] Unrecognized device detected for user ${user.id} (${user.email}). IP: ${ip} | User-Agent: ${userAgent}`);
        // Run asynchronously so it doesn't block the login request if SMTP is slow/failing
        this.alertsService.sendSecurityAlert(
          'Unrecognized Device Login',
          `A new login was detected for your account from an unrecognized device or location.`,
          { ip, userAgent, email: user.email }
        ).catch(e => this.logger.error('Failed to send background alert', e));
      }
      
      await this.redisClient.set(`device:${user.id}`, currentDevice);
    }

    if (user.role?.name === 'SUPER_ADMIN') {
      this.alertsService.sendSecurityAlert(
        'SUPER_ADMIN Login Detected',
        `A SuperAdmin account (${user.email}) just logged into the system.`,
        { ip, userAgent, timestamp: new Date().toISOString() }
      ).catch(e => this.logger.error('Failed to send background alert', e));
    }

    if (user.mfaSecret) {
      return { mfa_required: true, userId: user.id };
    }
    return this.generateTokens(user);
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = otplib.generateSecret();
    const otpauthUrl = otplib.generateURI({ label: user.email, issuer: 'NKC IMS', secret });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Save the secret to pending status.
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaPendingSecret: secret },
    });

    return { secret, qrCodeDataUrl };
  }

  async verifyMfa(userId: string, token: string) {
    // Check per-user rate limit (max 5 attempts per 15 minutes)
    const rateLimitKey = `mfa_attempts:${userId}`;
    const attempts = await this.redisClient.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redisClient.expire(rateLimitKey, 900); // 15 minutes TTL
    }
    if (attempts > 5) {
      this.logger.warn(`[Security Alert Email Queued] Excessive MFA verification attempts for user ${userId}.`);
      await this.alertsService.sendSecurityAlert(
        'Excessive MFA Failures',
        `Multiple failed MFA attempts were detected for this account. Your account may be targeted.`,
        { userId, timestamp: new Date().toISOString() }
      );
      throw new UnauthorizedException('Too many MFA attempts. Please try again later.');
    }

    const user = await this.prisma.user.findUnique({ 
      where: { id: userId },
      include: { role: true } 
    });
    
    if (!user || (!user.mfaSecret && !user.mfaPendingSecret)) {
      throw new BadRequestException('MFA not set up for this user');
    }

    // Check against pending secret if they are verifying for the first time
    const secretToVerify = user.mfaPendingSecret || user.mfaSecret;

    const isValid = otplib.verifySync({ token, secret: secretToVerify! });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    if (user.mfaPendingSecret) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null },
      });
    }

    // Clear MFA attempts on success
    await this.redisClient.del(`mfa_attempts:${userId}`);

    return this.generateTokens(user);
  }

  async generateTokens(user: any) {
    const jti = randomUUID();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
      isSystemRole: user.role.isSystem,
    };

    const accessToken = this.jwtService.sign(payload);

    // Embed the JTI in the refresh token payload
    const rtPayload = { ...payload, jti };
    const refreshToken = this.jwtService.sign(rtPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Hash the refresh token before storing it in Redis
    const rtHash = await argon2.hash(refreshToken);
    
    // Store in Redis with 7 days TTL (in seconds: 7 * 24 * 60 * 60 = 604800)
    // Key format: refresh_token:${userId}:${jti}
    const redisKey = `refresh_token:${user.id}:${jti}`;
    await this.redisClient.set(redisKey, rtHash, 'EX', 604800);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name || user.role,
        branchId: user.branchId,
      }
    };
  }

  async refreshTokens(userId: string, refreshToken: string, oldJti: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Access Denied');
    }

    const redisKey = `refresh_token:${userId}:${oldJti}`;
    const rtHash = await this.redisClient.get(redisKey);
    
    if (!rtHash) {
      // Token rotation or replay attack protection trigger
      throw new UnauthorizedException('Access Denied: Token previously used or invalid');
    }

    const rtMatches = await argon2.verify(rtHash, refreshToken);
    if (!rtMatches) {
      throw new UnauthorizedException('Access Denied: Invalid token signature');
    }

    // Delete the old refresh token from Redis (Token Rotation)
    await this.redisClient.del(redisKey);

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(userId: string, jti: string) {
    await this.redisClient.del(`refresh_token:${userId}:${jti}`);
    return { success: true };
  }

  // --- Password Recovery --- //

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user || !user.isActive) return { success: true, message: 'If an account exists, a reset link has been sent.' };

    const resetToken = randomUUID() + randomUUID();
    
    // Store in Redis (15 mins = 900 seconds)
    await this.redisClient.setex(`reset_token:${resetToken}`, 900, user.id);

    const resetLink = `https://nkcims.com/reset-password?token=${resetToken}`;
    const fromEmail = this.configService.get<string>('MAIL_FROM') || 'noreply@nkcims.com';

    await this.mailerService.sendMail({
      to: email,
      from: fromEmail,
      subject: 'NKC IMS - Password Reset Request',
      text: `You requested a password reset. Click here: ${resetLink}`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your NKC IMS account.</p>
        <p>Please click the link below to reset your password. This link will expire in 15 minutes.</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
    
    return { success: true, message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisClient.get(`reset_token:${token}`);
    
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const matchedUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!matchedUser || !matchedUser.isActive) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const isPwned = await checkPwnedPassword(newPassword);
    if (isPwned) {
      throw new BadRequestException('This password has been exposed in a data breach. Please choose a different, secure password.');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpires: null,
      },
    });

    // Invalidate the token so it can't be reused
    await this.redisClient.del(`reset_token:${token}`);

    return { success: true, message: 'Password has been successfully reset.' };
  }

  // --- Password Change --- //

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Access Denied');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password.');
    }

    const isPwned = await checkPwnedPassword(newPassword);
    if (isPwned) {
      throw new BadRequestException('This new password has been exposed in a data breach. Please choose a different, secure password.');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: 'Password changed successfully.' };
  }
}
