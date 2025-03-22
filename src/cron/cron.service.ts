import { Injectable } from '@nestjs/common';
import { FtpService } from 'src/ftp/ftp.service';
import { Cron } from '@nestjs/schedule';
import { StationsService } from 'src/stations/stations.service';
import * as moment from 'moment';
import { CronExpression } from '@nestjs/schedule';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CronService {
  constructor(
    private readonly ftpService: FtpService,
    private readonly stationsService: StationsService,
    private readonly sequelize: Sequelize,
  ) {}
  private shouldSaveSaturation = true;
  // Cron cada hora
  //@Cron('*/5 * * * *')
  async connect() {
    const startTime = Date.now();
    console.log(
      'Iniciando proceso de listSaturationFiles:',
      new Date().toISOString(),
    );
    // save every 10 min
    // const tenMinutesInMs = 10 * 60 * 1000;
    // if (Date.now() - this.lastSaturationSave >= tenMinutesInMs) {
    //   // Guardar los logs de saturación
    //   await this.stationsService.createSaturation(createSaturation);
    //   this.lastSaturationSave = Date.now();
    // }
    await this.ftpService.listSaturationFiles(this.shouldSaveSaturation);
    this.shouldSaveSaturation = !this.shouldSaveSaturation;
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(
      `Proceso finalizado en ${duration} segundos`,
      new Date().toISOString(),
    );
  }

  // Cron ca las 7 am y 4 pm
  @Cron('0 7,16 * * *')
  async updateStations() {
    console.log('cron');
    await this.stationsService.getStations();
  }

  // Cron cada hora
  @Cron('0 * * * *')
  async stationsPrices() {
    console.log('cron');
    await this.stationsService.updatePrices();
  }

  // Cron semanal
  // @Cron('57 12 * * 1')
  async updatePopularTimes() {
    console.log('cron');
    await this.stationsService.processPopularTimes();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async createNextWeekPartition() {
    try {
      const nextWeekStart = moment().add(1, 'week').startOf('week');

      // Obtener el límite máximo actual y crear nueva partición
      const query = `
        DECLARE @MaxBoundary DATETIMEOFFSET;
        DECLARE @NextBoundary DATETIMEOFFSET;
        
        SELECT @MaxBoundary = MAX(r.value)
        FROM sys.partition_range_values r
        JOIN sys.partition_functions f ON r.function_id = f.function_id
        WHERE f.name = 'PricesPartitionFunction';
        
        SET @NextBoundary = DATEADD(WEEK, 1, @MaxBoundary);
        
        ALTER PARTITION SCHEME PricesPartitionScheme
        NEXT USED [PRIMARY];
        
        ALTER PARTITION FUNCTION PricesPartitionFunction()
        SPLIT RANGE (@NextBoundary);
      `;

      await this.sequelize.query(query);
      console.log(
        `Created new partition for week starting: ${nextWeekStart.format('YYYY-MM-DD')}`,
      );
    } catch (error) {
      console.error('Error creating partition:', error);
    }
  }

  // Método para inicializar la tabla particionada (llamar al iniciar la aplicación)
  async initializePartitionedTable() {
    try {
      // Crear función de particionamiento
      const createPartitionFunction = `
        IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'PricesPartitionFunction')
        BEGIN
          CREATE PARTITION FUNCTION PricesPartitionFunction (DATETIMEOFFSET)
          AS RANGE RIGHT FOR VALUES (
            '${moment().startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(1, 'week').startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(2, 'week').startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(3, 'week').startOf('week').format('YYYY-MM-DD')}'
          );
        END
      `;

      // Crear esquema de partición
      const createPartitionScheme = `
        IF NOT EXISTS (SELECT * FROM sys.partition_schemes WHERE name = 'PricesPartitionScheme')
        BEGIN
          CREATE PARTITION SCHEME PricesPartitionScheme
          AS PARTITION PricesPartitionFunction
          ALL TO ([PRIMARY]);
        END
      `;

      // Crear tabla particionada
      const createTable = `
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Prices')
        BEGIN
          CREATE TABLE [Prices] (
            [id] CHAR(36),
            [price] NVARCHAR(255) NULL,
            [file_date] NVARCHAR(255) NULL,
            [hour] NVARCHAR(255) NOT NULL,
            [createdAt] DATETIMEOFFSET NOT NULL,
            [updatedAt] DATETIMEOFFSET NOT NULL,
            [stationId] CHAR(36) NULL,
            PRIMARY KEY ([id], [createdAt])
              ON PricesPartitionScheme([createdAt]),
            FOREIGN KEY ([stationId]) REFERENCES [Stations] ([id]) 
              ON DELETE SET NULL
          );
        END
      `;

      await this.sequelize.query(createPartitionFunction);
      await this.sequelize.query(createPartitionScheme);
      await this.sequelize.query(createTable);

      console.log('Initialized partitioned table successfully');
    } catch (error) {
      console.error('Error initializing partitioned table:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async createNextWeekSaturationPartition() {
    try {
      const nextWeekStart = moment().add(1, 'week').startOf('week');

      const query = `
        DECLARE @MaxBoundary DATETIMEOFFSET;
        DECLARE @NextBoundary DATETIMEOFFSET;
        
        SELECT @MaxBoundary = MAX(r.value)
        FROM sys.partition_range_values r
        JOIN sys.partition_functions f ON r.function_id = f.function_id
        WHERE f.name = 'SaturationPartitionFunction';
        
        SET @NextBoundary = DATEADD(WEEK, 1, @MaxBoundary);
        
        ALTER PARTITION SCHEME SaturationPartitionScheme
        NEXT USED [PRIMARY];
        
        ALTER PARTITION FUNCTION SaturationPartitionFunction()
        SPLIT RANGE (@NextBoundary);
      `;

      await this.sequelize.query(query);
      console.log(
        `Created new Saturation partition for week starting: ${nextWeekStart.format('YYYY-MM-DD')}`,
      );
    } catch (error) {
      console.error('Error creating Saturation partition:', error);
    }
  }

  async initializeSaturationPartitionedTable() {
    try {
      // Crear función de particionamiento
      const createPartitionFunction = `
        IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'SaturationPartitionFunction')
        BEGIN
          CREATE PARTITION FUNCTION SaturationPartitionFunction (DATETIMEOFFSET)
          AS RANGE RIGHT FOR VALUES (
            '${moment().startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(1, 'week').startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(2, 'week').startOf('week').format('YYYY-MM-DD')}',
            '${moment().add(3, 'week').startOf('week').format('YYYY-MM-DD')}'
          );
        END
      `;

      // Crear esquema de partición
      const createPartitionScheme = `
        IF NOT EXISTS (SELECT * FROM sys.partition_schemes WHERE name = 'SaturationPartitionScheme')
        BEGIN
          CREATE PARTITION SCHEME SaturationPartitionScheme
          AS PARTITION SaturationPartitionFunction
          ALL TO ([PRIMARY]);
        END
      `;

      // Crear tabla particionada
      const createTable = `
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Saturation')
        BEGIN
          CREATE TABLE [Saturation] (
            [id] CHAR(36),
            [file_date] NVARCHAR(255) NULL,
            [hour] NVARCHAR(255) NOT NULL,
            [saturation] INT NULL,
            [saturation_level] NVARCHAR(255) NULL,
            [createdAt] DATETIMEOFFSET NOT NULL,
            [updatedAt] DATETIMEOFFSET NOT NULL,
            [stationId] CHAR(36) NULL,
            PRIMARY KEY ([id], [createdAt])
              ON SaturationPartitionScheme([createdAt]),
            FOREIGN KEY ([stationId]) REFERENCES [Stations] ([id]) 
              ON DELETE SET NULL
          );
        END
      `;

      await this.sequelize.query(createPartitionFunction);
      await this.sequelize.query(createPartitionScheme);
      await this.sequelize.query(createTable);

      console.log('Initialized Saturation partitioned table successfully');
    } catch (error) {
      console.error('Error initializing Saturation partitioned table:', error);
    }
  }

  // Método para ver las particiones de la tabla Saturation
  async getSaturationPartitionRanges() {
    try {
      const query = `
        SELECT 
          p.partition_number,
          CONVERT(VARCHAR, LAG(r.value) OVER (ORDER BY p.partition_number)) AS StartDate,
          CONVERT(VARCHAR, r.value) AS EndDate,
          p.rows AS NumberOfRows
        FROM sys.partitions p
        INNER JOIN sys.tables t ON p.object_id = t.object_id
        INNER JOIN sys.indexes i ON p.object_id = i.object_id AND p.index_id = i.index_id
        INNER JOIN sys.partition_schemes ps ON i.data_space_id = ps.data_space_id
        INNER JOIN sys.partition_functions pf ON ps.function_id = pf.function_id
        LEFT JOIN sys.partition_range_values r ON pf.function_id = r.function_id 
          AND r.boundary_id = p.partition_number - 1
        WHERE t.name = 'Saturation'
        ORDER BY p.partition_number;
      `;

      const [results] = await this.sequelize.query(query);
      console.log('Saturation Partition Ranges:');
      console.table(results);
      return results;
    } catch (error) {
      console.error('Error getting Saturation partition ranges:', error);
    }
  }
}
