import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { StationsService } from './stations.service';
import {
  CreateStationDto,
  CreateVisitStationDto,
} from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorators';
import { User } from 'src/users/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('visitStation')
  createVisitStation(
    @Body() createVisitStationDto: CreateVisitStationDto,
    @GetUser() user: User,
  ) {
    return this.stationsService.createVisitStation(createVisitStationDto, user);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  createStationsFromExcel(@UploadedFile() file: any) {
    return this.stationsService.processExcelStations(file);
  }

  @Post('google-maps')
  createStationsFromGoogleMaps(@Body() body: any) {
    return this.stationsService.findClosestGasStation(
      body.latitude,
      body.longitude,
      body.radius,
      body.targetName,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createStationDto: CreateStationDto) {
    return this.stationsService.create(createStationDto);
  }

  @Get()
  findAll() {
    return this.stationsService.getStations();
  }

  @Get('google-maps')
  searchStationsOnGoogleMaps() {
    return this.stationsService.searchStationsOnGoogleMaps();
  }

  @Get('popular-times')
  getPopularTimes() {
    return this.stationsService.processPopularTimes();
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  findStationsNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: number,
    @Query('search') search?: string,
  ) {
    console.log(latitude, longitude);
    return this.stationsService.findStationsNearby(
      latitude,
      longitude,
      radius,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getStationsHistory(
    @GetUser() user: User,
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('limit') limit?: number,
  ) {
    return this.stationsService.getStationsHistory(
      user.plate,
      latitude,
      longitude,
      limit,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    return this.stationsService.findOne(id, latitude, longitude);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStationDto: UpdateStationDto) {
    return this.stationsService.update(+id, updateStationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stationsService.remove(+id);
  }
}
