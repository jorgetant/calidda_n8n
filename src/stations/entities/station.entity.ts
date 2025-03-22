import { UUIDV4 } from 'sequelize';
import {
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PopularTimes } from './popular_times.entity';
import { Saturation } from './saturation.entity';
import { Prices } from './prices.entity';

@Table({
  paranoid: false,
  timestamps: true,
})
export class Station extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  osinergmin_code: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  province: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  district: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  google_maps_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  client_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  station_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description: string;

  @Column({
    type: 'DECIMAL(10, 8)',
    allowNull: false,
  })
  latitude: number;

  @Column({
    type: 'DECIMAL(11, 8)',
    allowNull: false,
  })
  longitude: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  address: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  islands: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  google_name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  google_address: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  saturation_level: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  price: string;

  // Relations
  @HasMany(() => PopularTimes)
  popular_times: PopularTimes[];

  @HasMany(() => Saturation)
  saturations: Saturation[];

  @HasMany(() => Prices)
  prices: Prices[];
}
