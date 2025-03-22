import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { CommonService } from 'src/common/common.service';
import { AuthProperties } from '../interfaces/auth.interface';
import { SessionsService } from 'src/sessions/sessions.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly commonService: CommonService,
    private readonly sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: commonService.getEnv<string>('JWT_KEY'),
      passReqToCallback: true,
    });
  }

  async secretOrKeyProvider(request, rawJwtToken, done) {
    try {
      const jwtKey = await this.commonService.getEnv<string>('JWT_KEY');
      done(null, jwtKey);
    } catch (error) {
      done(error, null);
    }
  }

  async validate(
    request: Request,
    payload: AuthProperties,
  ): Promise<AuthProperties> {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const session = await this.sessionsService.findOne(payload.plate);

    if (session.token !== token) {
      throw new UnauthorizedException();
    }

    return {
      ...payload,
    };
  }
}
