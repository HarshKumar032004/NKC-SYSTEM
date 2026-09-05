import { Controller, Post, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute per IP
  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    // Get IP address from headers or socket
    const ip = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const user = await this.authService.validateUser(body.email, body.password, Array.isArray(ip) ? ip[0] : ip);
    const result = await this.authService.login(user, Array.isArray(ip) ? ip[0] : ip, userAgent);

    if ('mfa_required' in result) {
      return result; // return { mfa_required: true, userId: '...' }
    }

    // Set HTTP-only cookie for refresh token
    ;(res as any).setCookie('refreshToken', (result as any).refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' for broader compatibility and reliable cross-navigation
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // Changed from /api/v1/auth to / so that entire frontend and backend see it consistently during logout
    });

    return {
      accessToken: (result as any).accessToken,
      user: (result as any).user,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute per IP
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = (req as any).cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let userId;
    let oldJti;
    try {
      // Extract the userId and JTI from the payload directly.
      const payloadBuffer = Buffer.from(refreshToken.split('.')[1], 'base64');
      const payload = JSON.parse(payloadBuffer.toString());
      userId = payload.sub;
      oldJti = payload.jti;

      if (!oldJti) {
        throw new UnauthorizedException('Invalid refresh token structure');
      }
    } catch (error) {
      ;(res as any).clearCookie('refreshToken', { path: '/' });
      throw new UnauthorizedException('Invalid refresh token');
    }

    let tokens;
    try {
      tokens = await this.authService.refreshTokens(userId, refreshToken, oldJti);
    } catch (error) {
      // If refresh fails (e.g. user deleted, token rotated, JTI missing), clear the cookie!
      ;(res as any).clearCookie('refreshToken', { path: '/' });
      throw error;
    }

    ;(res as any).setCookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      accessToken: tokens.accessToken,
      user: (tokens as any).user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser('sub') userId: string, 
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const refreshToken = (req as any).cookies?.refreshToken;
    if (refreshToken) {
      const payloadBuffer = Buffer.from(refreshToken.split('.')[1], 'base64');
      const payload = JSON.parse(payloadBuffer.toString());
      const jti = payload.jti;
      if (jti) {
        await this.authService.logout(userId, jti);
      }
    }
    
    ;(res as any).clearCookie('refreshToken', { path: '/' });
    return { success: true };
  }

  // --- MFA Endpoints --- //

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  async setupMfa(@CurrentUser('sub') userId: string) {
    return this.authService.setupMfa(userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 MFA attempts per minute per IP
  @Post('mfa/verify')
  async verifyMfa(@Body() body: any, @Res({ passthrough: true }) res: FastifyReply) {
    const { userId, token } = body;
    
    // Once verified, we generate full tokens and complete login
    const tokens = await this.authService.verifyMfa(userId, token);

    ;(res as any).setCookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  // --- Password Recovery --- //

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 password reset requests per minute per IP
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 password reset attempts per minute per IP
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@CurrentUser('sub') userId: string, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }
}
