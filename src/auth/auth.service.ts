import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthProperties } from './interfaces/auth.interface';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginDto, LogUserAccessDto } from './dto/login.dto';
import { SessionsService } from 'src/sessions/sessions.service';
import { User } from 'src/users/entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
    private readonly httpService: HttpService,
  ) {}
  async generateToken(payload: AuthProperties, options?: JwtSignOptions) {
    //Generate jwt
    const token = this.jwtService.sign(payload, options);
    return token;
  }

  async login(loginDto: LoginDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/usuario/auth`,
        loginDto,
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );
    console.log(response.data);

    if (response.data.valid === false) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.generateToken({
      plate: response.data.data.plate,
      username: response.data.data.username,
      vehicleType: response.data.data.vehicleType,
    });
    await this.sessionsService.saveUserToken(
      response.data.data.plate,
      token,
      response.data.token,
    );
    await this.sessionsService.saveUserAccess(response.data.data.plate, {
      timestamp: new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
      ),
    });

    return { token, response: response.data.data };
  }

  async logUserAccess(logUserAccessDto: LogUserAccessDto, user: User) {
    await this.sessionsService.saveUserAccess(user.plate, logUserAccessDto);
    return {
      message: 'User access logged',
    };
  }
}
