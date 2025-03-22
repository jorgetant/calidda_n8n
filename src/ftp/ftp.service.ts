import { Injectable } from '@nestjs/common';
import { NodeSSH } from 'node-ssh';
import { promisify } from 'util';
import { StationsService } from 'src/stations/stations.service';
import { StationsType } from './interfaces/stationsType';
// import { CreateSaturationDto } from 'src/stations/interfaces/saturation';
import axios from 'axios';
import { Parameterization } from './entities/parameterization.entity';
import { InjectModel } from '@nestjs/sequelize';

interface TrafficPoint {
  lat: number;
  lng: number;
  distance: number; // en km
  direction: string;
}

@Injectable()
export class FtpService {
  private client: NodeSSH;
  constructor(
    private readonly stationsService: StationsService,
    @InjectModel(Parameterization)
    private parameterizationModel: typeof Parameterization,
  ) {}

  async connect() {
    this.client = new NodeSSH();
    try {
      await this.client.connect({
        host: process.env.FTP_HOST,
        username: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        timeout: 10000,
        tryKeyboard: true,
        secure: true,
        port: 22,
      });
      console.log('connected');
    } catch (error) {
      console.error('error', error);
      throw new Error(`Error al conectar: ${error.message}`);
    }
  }

  async listSaturationFiles(
    shouldSaveSaturation: boolean,
    remotePath: string = '/data',
  ) {
    try {
      await this.connect();
      const sftp = await this.client.requestSFTP();

      const readdirAsync = promisify(sftp.readdir).bind(sftp);
      const list = await readdirAsync(remotePath);

      const files = list.map((item) => ({
        name: item.filename,
        size: item.attrs.size,
        modifyTime: new Date(item.attrs.mtime * 1000),
        permissions: item.attrs.mode,
        type: item.attrs.isDirectory() ? 'directory' : 'file',
        time: item.attrs.mtime,
      }));

      const latestSaturationFile = files
        .filter((file) => file.name.startsWith('saturacion_estaciones_'))
        .sort((a, b) => b.modifyTime.getTime() - a.modifyTime.getTime())[0];

      if (latestSaturationFile) {
        const filePath = `${remotePath}/${latestSaturationFile.name}`;
        const csvData = await this.readCsvFile(filePath);
        latestSaturationFile['content'] = csvData;

        // saturation by ftp
        await this.calculateSaturation(
          csvData,
          latestSaturationFile.name.slice(22, 30),
          latestSaturationFile.name.slice(30, 32),
          shouldSaveSaturation,
        );

        return latestSaturationFile;
      }

      return files;
    } catch (err) {
      console.error('error', err);
      throw new Error(`Error al listar archivos: ${err.message}`);
    } finally {
      this.client.dispose();
    }
  }

  async readCsvFile(remotePath: string): Promise<any[]> {
    try {
      const sftp = await this.client.requestSFTP();
      const readFileAsync = promisify(sftp.readFile).bind(sftp);
      const content = await readFileAsync(remotePath);
      const csvString = content.toString('latin1');

      // Procesamos el CSV
      const lines = csvString.split('\n');
      const headers = lines[0].split(',').map((header) => header.trim());

      const data = lines
        .slice(1)
        .filter((line) => line.trim()) // Elimina líneas vacías
        .map((line) => {
          const values = line.split(',').map((value) => value.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          return row;
        });

      return data;
    } catch (err) {
      console.error('Error al leer archivo CSV:', err);
      throw new Error(`Error al leer archivo CSV: ${err.message}`);
    }
  }

  async calculateSaturation(
    array: any[],
    file_date: string,
    hour: string,
    shouldSaveSaturation: boolean,
  ) {
    const max_volume_light_vehicle = 1400;
    const max_volume_heavy_vehicle = 2600;
    const AVERAGE_VISIT_DURATION = 15; // minutos promedio por visita

    const currentHour = parseInt(hour);
    const currentDay = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'America/Bogota',
    });
    //const hoursSince6am = currentHour >= 6 ? currentHour - 6 : currentHour + 18;
    //const percentageOfDay = (hoursSince6am / 24) * 100;

    // Obtener todas las estaciones
    const allStations = await this.stationsService.findAll();

    const intensityMap = {
      low: 20,
      'below average': 40,
      average: 60,
      'above average': 80,
      high: 100,
    };

    const results = [];

    // Crear fecha de referencia para búsqueda de visitas
    const referenceDate = new Date();
    referenceDate.setHours(currentHour);
    referenceDate.setMinutes(0);
    referenceDate.setSeconds(0);

    const startTime = new Date(referenceDate.getTime() - 60 * 60 * 1000); // 1 hora antes
    const endTime = new Date(referenceDate.getTime() + 60 * 60 * 1000); // 1 hora después

    // Función auxiliar para generar puntos de referencia
    const generateReferencePoints = (
      stationLat: number,
      stationLng: number,
      radiusKm: number = 1,
    ): TrafficPoint[] => {
      const points: TrafficPoint[] = [
        {
          lat: stationLat + radiusKm / 111.32,
          lng: stationLng,
          distance: radiusKm,
          direction: 'Norte',
        },
        {
          lat: stationLat - radiusKm / 111.32,
          lng: stationLng,
          distance: radiusKm,
          direction: 'Sur',
        },
        {
          lat: stationLat,
          lng:
            stationLng +
            radiusKm / (111.32 * Math.cos((stationLat * Math.PI) / 180)),
          distance: radiusKm,
          direction: 'Este',
        },
        {
          lat: stationLat,
          lng:
            stationLng -
            radiusKm / (111.32 * Math.cos((stationLat * Math.PI) / 180)),
          distance: radiusKm,
          direction: 'Oeste',
        },
      ];
      return points;
    };

    for (const station of allStations) {
      let ftpSaturation = null;
      let popularTimesSaturation = null;
      let visitsSaturation = null;
      let trafficSaturation = null;

      // Obtener puntos de referencia para el tráfico
      const referencePoints = generateReferencePoints(
        station.latitude,
        station.longitude,
      );

      try {
        // Calcular el tráfico desde cada punto hacia la estación
        const trafficPromises = referencePoints.map((point) =>
          this.getTrafficInfo(
            `${point.lat},${point.lng}`,
            `${station.latitude},${station.longitude}`,
          ),
        );

        const trafficResults = await Promise.all(trafficPromises);

        // Calcular la saturación por tráfico
        if (trafficResults.some((result) => result !== null)) {
          const validResults = trafficResults.filter(
            (result) => result !== null,
          );
          const avgExcessTraffic =
            validResults.reduce(
              (sum, result) => sum + result.excess_traffic_percent,
              0,
            ) / validResults.length;

          // Normalizar el exceso de tráfico a una escala de 0-100
          trafficSaturation = Math.min(avgExcessTraffic, 100);
        }
      } catch (error) {
        console.error(
          `Error getting traffic data for station ${station.name}:`,
          error,
        );
      }

      // Calcular saturación por FTP
      const ftpStation = array.find(
        (s) => s.CODIGO_OSINERGMIN === station.osinergmin_code,
      );
      if (ftpStation) {
        const currentVolume = parseFloat(ftpStation.VOLUMEN);
        const totalIslands = parseInt(ftpStation.ISLAS);
        let maxCapacity;
        if (station.station_type === StationsType.light) {
          maxCapacity = totalIslands * max_volume_light_vehicle;
        } else {
          const lightIslands = Math.ceil(totalIslands * 0.6);
          const heavyIslands = totalIslands - lightIslands;
          maxCapacity =
            lightIslands * max_volume_light_vehicle +
            heavyIslands * max_volume_heavy_vehicle;
        }
        ftpSaturation = (currentVolume / maxCapacity) * 100;
      }

      // Calcular saturación por Popular Times
      const popularTime = station.popular_times?.find(
        (pt) => pt.day === currentDay && pt.hour === currentHour,
      );
      if (popularTime) {
        popularTimesSaturation =
          intensityMap[popularTime.intensity.toLowerCase()] || null;
      }

      // Calcular saturación por visitas programadas
      const scheduledVisits = await this.stationsService.findVisitsInTimeRange(
        station.id,
        startTime,
        endTime,
      );

      if (scheduledVisits.length > 0) {
        // Calcular capacidad por hora basada en islas
        const islandsCapacity =
          station.station_type === StationsType.light
            ? station.islands * (60 / AVERAGE_VISIT_DURATION) // Capacidad por hora para vehículos ligeros
            : station.islands * (60 / (AVERAGE_VISIT_DURATION * 1.5)); // Ajuste para vehículos pesados

        // Calcular porcentaje de ocupación basado en visitas programadas
        const scheduledLoad = scheduledVisits.length / islandsCapacity;
        visitsSaturation = Math.min(scheduledLoad * 100, 100); // Convertir a porcentaje, máximo 100%
      }

      // Cálculo de saturación final con pesos dinámicos
      let finalSaturation;
      const parameterization = await this.parameterizationModel.findAll();
      const weights = {
        popularTimes:
          parameterization.find((p) => p.name === 'Popular Times').percentage /
          100, // 40%
        ftp: parameterization.find((p) => p.name === 'FTP').percentage / 100, // 25%
        visits:
          parameterization.find((p) => p.name === 'Visitas Programadas')
            .percentage / 100, // 15%
        traffic:
          parameterization.find((p) => p.name === 'Trafico').percentage / 100, // 20%
      };

      // Determinar qué fuentes están disponibles
      const availableSources = {
        popularTimes: popularTimesSaturation !== null,
        ftp: ftpSaturation !== null,
        visits: visitsSaturation !== null,
        traffic: trafficSaturation !== null,
      };

      // Calcular la suma de los pesos de las fuentes disponibles
      const totalAvailableWeight = Object.entries(availableSources).reduce(
        (sum, [source, isAvailable]) =>
          sum + (isAvailable ? weights[source] : 0),
        0,
      );

      if (totalAvailableWeight > 0) {
        // Calcular la saturación ajustando los pesos proporcionalmente
        finalSaturation =
          ((availableSources.popularTimes
            ? popularTimesSaturation * weights.popularTimes
            : 0) +
            (availableSources.ftp ? ftpSaturation * weights.ftp : 0) +
            (availableSources.visits ? visitsSaturation * weights.visits : 0) +
            (availableSources.traffic
              ? trafficSaturation * weights.traffic
              : 0)) /
          totalAvailableWeight;
      } else {
        finalSaturation = null;
      }

      // Determinar nivel de saturación
      let saturationLevel;
      if (finalSaturation !== null) {
        if (finalSaturation >= 80) {
          saturationLevel = 'ALTO';
        } else if (finalSaturation >= 60) {
          saturationLevel = 'MEDIO';
        } else {
          saturationLevel = 'BAJO';
        }

        // const createSaturation: CreateSaturationDto = {
        //   stationId: station.id,
        //   file_date: file_date,
        //   hour: currentHour,
        //   saturation: finalSaturation,
        //   saturation_level: saturationLevel,
        // };
        if (shouldSaveSaturation) {
          // await this.stationsService.createSaturation(createSaturation);
        }
        await this.stationsService.updateStation(station.id, {
          saturation_level: saturationLevel,
        });

        results.push({
          ...ftpStation,
          osinergmin_code: station.osinergmin_code,
          name: station.name,
          ftpSaturation,
          popularTimesSaturation,
          visitsSaturation,
          trafficSaturation,
          saturation: finalSaturation,
          saturation_level: saturationLevel,
        });
      } else {
        await this.stationsService.createSaturation({
          stationId: station.id,
          file_date: file_date,
          hour: currentHour,
          saturation: null,
          saturation_level: 'No data',
        });

        results.push({
          ...ftpStation,
          osinergmin_code: station.osinergmin_code,
          name: station.name,
          ftpSaturation: null,
          popularTimesSaturation: null,
          visitsSaturation: null,
          trafficSaturation: null,
          saturation: null,
          saturation_level: 'No data',
        });
      }
    }

    return results;
  }

  // Función para obtener información del tráfico usando Google Maps API
  private async getTrafficInfo(
    origin: string,
    destination: string,
  ): Promise<{
    normal_duration_min: number;
    traffic_duration_min: number;
    excess_traffic_percent: number;
  } | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&departure_time=now&key=${process.env.GOOGLE_API_KEY}`;

      const response = await axios.get(url);
      const result = response.data.rows[0].elements[0];

      if (result.status !== 'OK') return null;
      const normalDuration = result.duration.value / 60;
      const trafficDuration = result.duration_in_traffic.value / 60;
      const excessTrafficPercent =
        ((trafficDuration - normalDuration) / normalDuration) * 100 > 0
          ? ((trafficDuration - normalDuration) / normalDuration) * 100
          : 0;

      return {
        normal_duration_min: Math.round(normalDuration),
        traffic_duration_min: Math.round(trafficDuration),
        excess_traffic_percent: Math.round(excessTrafficPercent),
      };
    } catch (error) {
      console.error('Error getting traffic info:', error);
      return null;
    }
  }

  async getStationsPrices(remotePath: string = '/data') {
    try {
      await this.connect();
      const sftp = await this.client.requestSFTP();

      const readdirAsync = promisify(sftp.readdir).bind(sftp);
      const list = await readdirAsync(remotePath);

      const files = list.map((item) => ({
        name: item.filename,
        size: item.attrs.size,
        modifyTime: new Date(item.attrs.mtime * 1000),
        permissions: item.attrs.mode,
        type: item.attrs.isDirectory() ? 'directory' : 'file',
        time: item.attrs.mtime,
      }));

      const latestPricesFile = files
        .filter((file) => file.name.startsWith('precios_estaciones_'))
        .sort((a, b) => b.modifyTime.getTime() - a.modifyTime.getTime())[0];

      if (latestPricesFile) {
        const filePath = `${remotePath}/${latestPricesFile.name}`;
        const csvData = await this.readCsvFile(filePath);

        // Obtener todas las estaciones
        const allStations = await this.stationsService.findAll();

        const currentHour = latestPricesFile.name.slice(27, 29);
        const fileDate = latestPricesFile.name.slice(19, 27);

        for (const station of allStations) {
          const ftpStation = csvData.find(
            (s) => s.CODIGO_OSINERGMIN === station.osinergmin_code,
          );

          if (ftpStation) {
            const formattedPrice = Number(ftpStation.PRECIO_VENTA).toFixed(2);
            await this.stationsService.createPrice({
              stationId: station.id,
              price: formattedPrice,
              file_date: fileDate,
              hour: currentHour,
            });
            await this.stationsService.updateStation(station.id, {
              price: formattedPrice,
            });
          }
        }

        return {
          message: 'Precios actualizados correctamente',
          fileName: latestPricesFile.name,
          processedStations: allStations.length,
        };
      }

      return {
        message: 'No se encontraron archivos de precios',
        fileName: null,
        processedStations: 0,
      };
    } catch (error) {
      console.error('Error al procesar precios:', error);
      throw new Error(`Error al procesar precios: ${error.message}`);
    } finally {
      this.client.dispose();
    }
  }
}
