import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectModel } from '@nestjs/sequelize';
import { CommonService } from 'src/common/common.service';
import { Twilio } from 'twilio';
import { FindOptions } from 'sequelize';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionsService } from 'src/sessions/sessions.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private readonly commonService: CommonService,
    private httpService: HttpService,
    private readonly sessionService: SessionsService,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const user = await firstValueFrom(
      this.httpService.get(
        `${process.env.CALIDDA_API_URL}/usuario/celular/${createUserDto.plate}`,
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );

    if (user.data.valid === true) {
      throw new BadRequestException('User already exists');
    }
    //otp
    const code = this.generateCode();
    try {
      createUserDto.phone = createUserDto.phone.replace(/\s+/g, '');
      if (createUserDto.phone == '+51999999999') {
        createUserDto.phone = '+573007650733';
      }
      const message = `Tu codigo de verificacion es ${code}. Este codigo es valido por 1 minuto. Calidda`;
      await this.sendSmsMessage(createUserDto.phone, message);
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Error sending OTP');
    }

    try {
      await this.userModel.create({
        ...createUserDto,
        otp: code,
        otpExpires: new Date(Date.now() + 1000 * 60 * 1),
        otpUsed: 1,
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(error);
    }
    return 'Otp sent';
  }

  async findAll() {
    return this.userModel.findAll();
  }

  async findOne(plate: string) {
    return this.userModel.findOne({
      where: { plate },
      attributes: {
        exclude: ['otp', 'otpExpires'],
      },
    });
  }

  async findOneWithOptions(options: FindOptions) {
    return this.userModel.findOne(options);
  }

  async update(updateUserDto: UpdateUserDto, user: User) {
    const { calidda_token } = await this.sessionService.findOne(user.plate);
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/usuario/Actualiza`,
        {
          ...updateUserDto,
        },
        {
          headers: {
            Authorization: `Bearer ${calidda_token}`,
          },
        },
      ),
    );
    console.log(response);
    return response.data.message;
  }

  async remove(id: string) {
    return this.userModel.destroy({ where: { id } });
  }

  async verifyUser(plate: string, otp: string) {
    const user = await this.findOne(plate);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.verifyOtp(plate, otp);
    const userCreated = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/usuario`,
        {
          username: user.username,
          plate: user.plate,
          phone: user.phone,
          password: user.password,
          idTipoVehiculo: user.vehicleType,
        },
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );
    await this.userModel.destroy({ where: { plate } });
    if (userCreated.data.valid == false) {
      throw new BadRequestException('User already exists');
    }
    return userCreated.data.message;
  }

  async sendSmsMessage(toPhone: string, message: string): Promise<string> {
    try {
      if (!toPhone || !message) {
        throw new BadRequestException();
      }

      const TWILIO_ACCOUNT_SID =
        await this.commonService.getEnv<string>('TWILIO_ACCOUNT_SID');
      const TWILIO_AUTH_TOKEN =
        await this.commonService.getEnv<string>('TWILIO_AUTH_TOKEN');
      const TWILIO_PHONE_NUMBER = await this.commonService.getEnv<string>(
        'TWILIO_PHONE_NUMBER',
      );

      const twilioConfig = {
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER,
      };

      const client = new Twilio(
        twilioConfig.TWILIO_ACCOUNT_SID,
        twilioConfig.TWILIO_AUTH_TOKEN,
      );

      const response = await client.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: toPhone,
      });

      return `Mensaje enviado con éxito. SID: ${response.sid}`;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(error);
    }
  }

  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async verifyOtp(plate: string, code: string) {
    const user = await this.findOneWithOptions({
      where: { plate },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (new Date() > user.otpExpires) {
      throw new BadRequestException('OTP has expired');
    }

    const isValidOtp = user.otp === code;
    if (!isValidOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    return user;
  }

  async verifyPassword(phone: string, password: string) {
    const user = await this.findOneWithOptions({
      where: { phone, isVerified: true },
      include: ['role'],
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isValidPassword = password === user.password;
    if (!isValidPassword) {
      throw new BadRequestException('Invalid password');
    }
    delete user.password;
    delete user.otp;
    delete user.otpExpires;
    delete user.dataValues.otp;
    delete user.dataValues.password;
    delete user.dataValues.otpExpires;
    return user;
  }

  async resendOtp(plate: string) {
    const dbUser = await this.findOne(plate);
    const code = this.generateCode();
    console.log('*********OTP**********', code);
    if (dbUser) {
      try {
        if (dbUser.otpUsed > 3) {
          throw new BadRequestException('OTP has been used too many times');
        }
        const message = `Tu codigo de verificacion es ${code}. Este codigo es valido por 1 minuto. Calidda`;
        await this.sendSmsMessage(dbUser.phone, message);
      } catch (error) {
        console.error(error);
        throw new BadRequestException('Error sending OTP');
      }
      await this.userModel.update(
        {
          otp: code,
          otpExpires: new Date(Date.now() + 1000 * 60 * 1),
          otpUsed: dbUser.otpUsed + 1,
        },
        { where: { plate } },
      );
      return 'Otp sent';
    }
    const user = await firstValueFrom(
      this.httpService.get(
        `${process.env.CALIDDA_API_URL}/usuario/celular/${plate}`,
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );

    if (user.data.valid === false) {
      throw new BadRequestException('Invalid plate');
    }

    try {
      const message = `Tu codigo de verificacion es ${code}. Este codigo es valido por 1 minuto. Calidda`;
      await this.sendSmsMessage(user.data.data, message);
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Error sending OTP');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/usuario/otp`,
        {
          plate: plate,
          otp: code,
        },
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );
    return response.data.message;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const user = await firstValueFrom(
        this.httpService.post(
          `${process.env.CALIDDA_API_URL}/usuario/password`,
          {
            plate: forgotPasswordDto.plate,
            password: forgotPasswordDto.password,
            otp: forgotPasswordDto.otp,
          },
          {
            headers: {
              access_token: process.env.CALIDDA_ACCESS_TOKEN,
            },
          },
        ),
      );
      console.log(user.data.data);
      return user.data.message;
    } catch (error) {
      console.error(error.response.data);
      throw new BadRequestException(error.response.data);
    }
  }

  async vehicles(): Promise<
    {
      Id: number;
      Descripcion: string;
    }[]
  > {
    const response: any = await firstValueFrom(
      this.httpService.get(
        `${process.env.CALIDDA_API_URL}/usuario/tipoVehiculo`,
        {
          headers: {
            access_token: process.env.CALIDDA_ACCESS_TOKEN,
          },
        },
      ),
    );
    return response.data.data;
  }

  async logout(user: User) {
    const { calidda_token } = await this.sessionService.findOne(user.plate);
    try {
      const petition = await firstValueFrom(
        this.httpService.post(
          `${process.env.CALIDDA_API_URL}/usuario/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${calidda_token}`,
            },
          },
        ),
      );
      return petition.data.message;
    } catch (error) {
      return error;
    }
  }
}
