import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../config/env.schema';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService<EnvVars>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // The payload is what we signed. We can trust it directly if we want to save DB queries,
    // or we can query the DB to ensure the user is still active.
    
    // Quick validation example:
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active or deleted');
    }

    return payload; // this is attached to request.user
  }
}
