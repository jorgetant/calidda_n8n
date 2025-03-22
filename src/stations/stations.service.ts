import { Injectable } from '@nestjs/common';
import {
  CreateStationDto,
  CreateVisitStationDto,
} from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Station } from './entities/station.entity';
import { VisitStation } from './entities/visitStation.entity';
import { User } from 'src/users/entities/user.entity';
import { Op } from 'sequelize';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { PopularTimes } from './entities/popular_times.entity';
import { Saturation } from './entities/saturation.entity';
import { CreateSaturationDto } from './interfaces/saturation';
import { CreatePriceDto } from './interfaces/prices';
import { Prices } from './entities/prices.entity';

@Injectable()
export class StationsService {
  constructor(
    @InjectModel(Station)
    private stationModel: typeof Station,
    @InjectModel(VisitStation)
    private visitStationModel: typeof VisitStation,
    private httpService: HttpService,
    @InjectModel(PopularTimes)
    private popularTimesModel: typeof PopularTimes,
    @InjectModel(Saturation)
    private saturationModel: typeof Saturation,
    @InjectModel(Prices)
    private pricesModel: typeof Prices,
  ) {}

  create(createStationDto: CreateStationDto) {
    return this.stationModel.create({ ...createStationDto });
  }

  findAll() {
    return this.stationModel.findAll({
      include: [
        {
          association: 'popular_times',
        },
      ],
    });
  }

  async findStationsNearby(
    latitude: string,
    longitude: string,
    radius?: number,
    search?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Configuración base de la consulta
    const query: any = {
      attributes: {
        include: [
          [
            this.stationModel.sequelize.literal(`
              6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(latitude))
              )
            `),
            'distance',
          ],
        ],
      },
      order: this.stationModel.sequelize.literal('distance ASC'),
      where: {},
    };

    // Si se proporciona un radio, añadimos la condición de distancia
    if (radius) {
      query.where = this.stationModel.sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(latitude))
        ) <= ${radius}
      `);
    }

    // Si se proporciona búsqueda, añadimos condición de name o address
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
        ],
      };

      query.where = radius
        ? { [Op.and]: [query.where, searchCondition] }
        : searchCondition;
    }

    const stations = await this.stationModel.findAll(query);

    return stations.map((station) => ({
      ...station.toJSON(),
      distanceMaps: null,
      durationMaps: null,
    }));
  }

  async findOne(id: string, latitude: string, longitude: string) {
    const station = await this.stationModel.findByPk(id, {
      attributes: {
        include: [
          [
            this.stationModel.sequelize.literal(`
              6371 * acos(
                cos(radians(${parseFloat(latitude)})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(${parseFloat(longitude)})) + 
                sin(radians(${parseFloat(latitude)})) * 
                sin(radians(latitude))
              )
            `),
            'distance',
          ],
        ],
      },
      include: [
        {
          association: 'saturations',
          order: [['createdAt', 'DESC']],
          limit: 12,
        },
      ],
    });

    try {
      const origin = `${latitude},${longitude}`;
      const destination = `${station.latitude},${station.longitude}`;
      const response = await firstValueFrom(
        this.httpService.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&departure_time=now&key=${process.env.GOOGLE_API_KEY}`,
        ),
      );
      return {
        ...station.toJSON(),
        distanceMaps: response.data.rows[0].elements[0].distance.text || 0,
        durationMaps:
          response.data.rows[0].elements[0].duration_in_traffic.text || 0,
      };
    } catch (error) {
      console.error('Error getting Google distances:', error);
      return station;
    }
  }

  findOneByOsinergmin(osinergmin: string) {
    return this.stationModel.findOne({
      where: { osinergmin_code: osinergmin },
      include: [
        {
          association: 'popular_times',
        },
      ],
    });
  }

  update(id: number, updateStationDto: UpdateStationDto) {
    return this.stationModel.update(updateStationDto, {
      where: { id },
    });
  }

  remove(id: number) {
    return this.stationModel.destroy({
      where: { id },
    });
  }

  async createVisitStation(
    createVisitStationDto: CreateVisitStationDto,
    user: User,
  ) {
    const station = await this.stationModel.findByPk(
      createVisitStationDto.stationId,
    );
    const visitStation = await this.visitStationModel.create({
      ...createVisitStationDto,
      timestamp: createVisitStationDto.timestamp || new Date(),
      userId: user.plate,
      saturation: station.saturation_level,
    });
    return visitStation;
  }

  async createSaturation(createSaturationDto: CreateSaturationDto) {
    const saturation = await this.saturationModel.create({
      ...createSaturationDto,
    });
    return saturation;
  }

  async updateStation(id: string, updateStationDto: UpdateStationDto) {
    return this.stationModel.update(updateStationDto, {
      where: { id },
    });
  }

  async updatePriceByOsinergminCode(
    osinergmin_code: string,
    price: string,
  ): Promise<Station> {
    await this.stationModel.update({ price }, { where: { osinergmin_code } });
    return this.stationModel.findOne({ where: { osinergmin_code } });
  }

  async getStationsHistory(
    plate: string,
    latitude: string,
    longitude: string,
    limit: number,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const visits = await this.visitStationModel.findAll({
      attributes: ['stationId', 'createdAt'],
      where: {
        userId: plate,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'station',
          attributes: {
            include: [
              [
                this.stationModel.sequelize.literal(`
                  6371 * acos(
                    cos(radians(${lat})) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(${lng})) + 
                    sin(radians(${lat})) * 
                    sin(radians(latitude))
                  )
                `),
                'distance',
              ],
            ],
          },
        },
      ],
      limit,
    });

    const response = [];
    for (const visit of visits) {
      const visitJSON = visit.toJSON();
      const station = response.find((s) => s.id === visitJSON.stationId);
      if (!station) {
        response.push({
          ...visitJSON.station,
          lastVisit: visitJSON.createdAt,
        });
      }
    }
    return response;
  }

  async searchStationsOnGoogleMaps() {
    //     *   `output`: Aquí especificas el formato de la respuesta, que puede ser `json` (recomendado) o `xml`.
    //     *   `parameters`: Aquí es donde añades los parámetros de tu búsqueda.
    // 2.  **Parámetros Obligatorios:**
    //     *   **`query`:** Este es el parámetro más importante. Aquí defines el texto de tu búsqueda. Por ejemplo:
    //         *   `query=restaurante+italiano+en+Madrid`
    //         *   `query=museo+del+prado`
    //         *   `query=cafeteria+cerca+de+mi`
    //     *   **`key`:** Tu clave de API de Google Maps. Debes tener una clave válida para poder usar la API. La añades así:
    //         *   `key=TU_CLAVE_DE_API`
    // 3.  **Parámetros Opcionales (para refinar la búsqueda):**
    //     *   **`location`:** Especifica un punto geográfico (latitud y longitud) para buscar lugares cercanos. Por ejemplo:
    //         *   `location=40.416775,-3.703790` (Madrid)
    //     *   **`radius`:** Define un radio (en metros) alrededor de la `location` para limitar la búsqueda. Por ejemplo:
    //         *   `radius=5000` (5 kilómetros)
    //     *   **`type`:** Restringe los resultados a un tipo específico de lugar. Por ejemplo:
    //         *   `type=restaurant`
    //         *   `type=cafe`
    //         *   `type=museum`
    //     *   **`language`:** Especifica el idioma en el que quieres recibir los resultados. Por ejemplo:
    //         *   `language=es` (español)
    //         *   `language=en` (inglés)
    //     *   **`region`**: Especifica el código de región, como `es` para España.
    //     * **`opennow`**: Si se establece en `true`, solo se devolverán los lugares que estén abiertos en el momento de la consulta.
    // 4.  **Ejemplo de URL Completa:**
    //     Aquí tienes un ejemplo de una URL completa para buscar restaurantes italianos en Madrid, dentro de un radio de 5 kilómetros, en español:
    //     ```
    // https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurante+italiano+en+Madrid&location=40.416775,-3.703790&radius=5000&language=es&key=TU_CLAVE_DE_API
    const locations: any = await this.httpService
      .get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json', //?location=-11.99569141,-77.08403872&radius=5000&language=es&key=AIzaSyDwvbGiFuQXMIFQqqntvHWvin291VtTGc8
        {
          params: {
            query: 'COESTI LA MARINA',
            location: '-12.07858792,-77.08423239',
            radius: '500',
            language: 'es',
            key: 'AIzaSyDwvbGiFuQXMIFQqqntvHWvin291VtTGc8',
            fields: 'formatted_address,place_id,name,geometry',
          },
        },
      )
      .toPromise();
    console.log(locations);

    const popularTimes = await this.httpService
      .get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: 'ChIJowY396HPBZERuMiROk5568U',
          key: 'AIzaSyDwvbGiFuQXMIFQqqntvHWvin291VtTGc8',
        },
      })
      .toPromise();
    console.log(popularTimes);
    return { locations: locations.data, popularTimes: popularTimes.data };
  }

  async getStations() {
    const stations = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/estacion/listar`,
        { filtros: '' },
        {
          headers: { access_token: process.env.CALIDDA_ACCESS_TOKEN },
        },
      ),
    );
    // Obtener todos los códigos Osinergmin de la API
    const apiOsinergminCodes = stations.data.data.map(
      (station) => station.codigoOsinergmin,
    );

    // Obtener todas las estaciones actuales de la base de datos
    const dbStations = await this.stationModel.findAll();

    // Identificar estaciones que ya no existen en la API
    const stationsToDelete = dbStations.filter(
      (dbStation) => !apiOsinergminCodes.includes(dbStation.osinergmin_code),
    );

    // Eliminar estaciones que ya no existen
    if (stationsToDelete.length > 0) {
      console.log(
        `Eliminando ${stationsToDelete.length} estaciones que ya no existen en la API`,
      );
      await Promise.all(
        stationsToDelete.map((station) =>
          this.stationModel.destroy({ where: { id: station.id } }),
        ),
      );
    }

    stations.data.data.forEach(async (station: any) => {
      const existingStation = await this.findOneByOsinergmin(
        station.codigoOsinergmin,
      );
      try {
        if (!existingStation) {
          await this.create({
            osinergmin_code: station.codigoOsinergmin,
            name: station.razonSocial,
            address: station.Direccion,
            latitude: parseFloat(station.Latitud),
            longitude: parseFloat(station.Longitud),
            client_type: station.esClienteCalidda ? 'CALIDDA' : 'NO CALIDDA',
            station_type: station.tipoEstacion,
            description: `Islas: ${station.cantIslas}, Mangueras: ${station.cantMangueras}, RUC: ${station.ruc}`,
            islands: station.cantIslas,
            mangueras: station.cantMangueras,
          });
        } else {
          await this.updateStation(existingStation.id, {
            name: station.razonSocial,
            address: station.Direccion,
            latitude: parseFloat(station.Latitud),
            longitude: parseFloat(station.Longitud),
            client_type: station.esClienteCalidda ? 'CALIDDA' : 'NO CALIDDA',
            station_type: station.tipoEstacion,
            description: `Islas: ${station.cantIslas}, Mangueras: ${station.cantMangueras}, RUC: ${station.ruc}`,
            islands: station.cantIslas,
            mangueras: station.cantMangueras,
          });
        }
      } catch (error) {
        console.error(error);
      }
    });

    return 'Success';
  }
  /**
   * Calculates the similarity between two strings using the Levenshtein Distance algorithm.
   * @param str1 - First string
   * @param str2 - Second string
   * @returns A similarity score (0 to 1), where 1 is an exact match.
   */
  levenshteinSimilarity(str1: string, str2: string): number {
    const track: number[][] = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j - 1][i] + 1,
          track[j][i - 1] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }

    const levenshteinDistance = track[str2.length][str1.length];
    return 1 - levenshteinDistance / Math.max(str1.length, str2.length);
  }

  /**
   * Finds gas stations within a given radius from a specified location and compares names.
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @param radius - Search radius in meters
   * @param targetName - The gas station name to search for
   */
  async findClosestGasStation(
    latitude: number,
    longitude: number,
    radius: number,
    targetName: string,
  ) {
    const url = `${process.env.GOOGLE_PLACES_URL}?location=${latitude},${longitude}&radius=${radius}&query=${targetName}&type=gas_station&key=${process.env.GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(
          `Google API Error: ${data.status} - ${
            data.error_message || 'No details provided'
          }`,
        );
      }

      const gasStations: { name: string; vicinity: string }[] = data.results;

      if (gasStations.length === 0) {
        console.log('⚠️ No gas stations found in the specified area.');
        return;
      }

      console.log('✅ Gas Stations Found:');

      let bestMatch: { name: string; vicinity: string } | undefined;
      let highestScore = 0;

      gasStations.forEach((station, index) => {
        const similarity = this.levenshteinSimilarity(
          targetName.toLowerCase(),
          station.name.toLowerCase(),
        );

        console.log(
          `${index + 1}. ${station.name} (Score: ${similarity.toFixed(2)})`,
        );
        console.log(station);

        if (similarity > highestScore) {
          highestScore = similarity;
          bestMatch = station;
        }
      });

      if (bestMatch && highestScore >= 0.25) {
        console.log(
          `\n🏆 Closest Match: ${bestMatch.name} - 📍 ${
            bestMatch.vicinity
          } (Score: ${highestScore.toFixed(2)})`,
        );
      } else {
        console.log('\n❌ No close match found.');
      }
    } catch (error) {
      console.error('❌ Error fetching gas stations:', error);
    }
  }

  async processExcelStations(file: any) {
    const workbook = XLSX.read(file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[1]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(data);
    const formattedStations = data.map((row: any) => ({
      osinergmin_code: row.CODIGO_OSINERG?.toString() || '',
      name: row.RAZON || '',
      province: row.PROVINCIA || '',
      district: row.DISTRITO || '',
      client_type: row['Tipo Cliente'] || '',
      station_type: row['Tipo Estacion'] || '',
      description: `Islas: ${row.Islas || 0}, Mangueras: ${row.Mangueras || 0}, RUC: ${row.RUC || ''}, Producto: ${row.PRODUCTO || ''}`,
      latitude: parseFloat(row.COORDENADA_Y) || 0,
      longitude: parseFloat(row.COORDENADA_X) || 0,
      address: row.DIRECCION || '',
      islands: row.Islas || 0,
    }));

    // Guardar las estaciones en la base de datos
    const results = await Promise.allSettled(
      formattedStations.map(async (station) => {
        try {
          const existingStation = await this.findOneByOsinergmin(
            station.osinergmin_code,
          );
          if (!existingStation) {
            await this.create(station as any);
            return {
              status: 'created',
              osinergmin_code: station.osinergmin_code,
            };
          }
          return {
            status: 'existing',
            osinergmin_code: station.osinergmin_code,
          };
        } catch (error) {
          return {
            status: 'error',
            osinergmin_code: station.osinergmin_code,
            error: error.message,
          };
        }
      }),
    );

    return {
      total: formattedStations.length,
      results: results.reduce((acc: any, result) => {
        const status = result?.status || 'error';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async processPopularTimes() {
    const stations = await this.stationModel.findAll({
      where: {
        google_name: {
          [Op.not]: null,
        },
        google_address: {
          [Op.not]: null,
        },
      },
    });

    // Clear all existing popular times data
    await this.popularTimesModel.destroy({
      where: {},
      truncate: true,
    });

    for (const station of stations) {
      try {
        // Make API request to get popular times
        const response = await firstValueFrom(
          this.httpService.post(
            `${process.env.BESTTIME_URL}?api_key_private=${process.env.BESTTIME_API_KEY}&venue_name=${station.google_name}&venue_address=${station.google_address}`,
          ),
        );

        if (response.data.status === 'OK') {
          // Process each day's data
          for (const analysis of response.data.analysis) {
            const dayText = analysis.day_info.day_text;

            // Process each hour's data
            for (const hourData of analysis.hour_analysis) {
              await this.popularTimesModel.create({
                stationId: station.id,
                day: dayText,
                hour: hourData.hour,
                intensity: hourData.intensity_txt,
                raw: analysis.day_raw[hourData.hour],
              });
            }
          }

          console.log(
            `✅ Processed popular times for station: ${station.name}`,
          );
        } else {
          console.error(
            `❌ Error processing station ${station.name}: ${response.data.status}`,
          );
        }

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(error);
        console.error(
          `❌ Error processing station ${station.name}:`,
          error.message,
        );
      }
    }

    return { message: 'Popular times processing completed' };
  }

  async findVisitsInTimeRange(
    stationId: string,
    startTime: Date,
    endTime: Date,
  ) {
    return await this.visitStationModel.findAll({
      where: {
        stationId,
        timestamp: {
          [Op.between]: [startTime, endTime],
        },
      },
    });
  }

  async createPrice(createPriceDto: CreatePriceDto) {
    return await this.pricesModel.create({
      ...createPriceDto,
    });
  }

  async updatePrices() {
    const stations = await firstValueFrom(
      this.httpService.post(
        `${process.env.CALIDDA_API_URL}/estacion/listar`,
        { filtros: '' },
        {
          headers: { access_token: process.env.CALIDDA_ACCESS_TOKEN },
        },
      ),
    );

    for (const station of stations.data.data) {
      const stationDB = await this.updatePriceByOsinergminCode(
        station.codigoOsinergmin,
        Number(station.precio_venta_precio).toFixed(2),
      );
      await this.createPrice({
        stationId: stationDB.id,
        price: Number(station.precio_venta_precio).toFixed(2),
        file_date: new Date().toISOString().split('T')[0],
        hour: new Date().getHours().toString(),
      });
    }
  }
}
