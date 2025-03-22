import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LogUserAccessDto } from './dto/login.dto';
import { GetUser } from './decorators/get-user.decorators';
import { User } from 'src/users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authService.login(loginDto);

    return response;
  }

  @Post('logUserAccess')
  @UseGuards(JwtAuthGuard)
  async logUserAccess(
    @Body() logUserAccessDto: LogUserAccessDto,
    @GetUser() user: User,
  ) {
    const response = await this.authService.logUserAccess(
      logUserAccessDto,
      user,
    );

    return response;
  }
}
