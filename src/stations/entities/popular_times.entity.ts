import { UUIDV4 } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Station } from './station.entity';

@Table({})
export class PopularTimes extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.STRING)
  day: string;

  @Column(DataType.INTEGER)
  hour: number;

  @Column(DataType.STRING)
  intensity: string;

  @Column(DataType.INTEGER)
  raw: number;

  // Relations
  @ForeignKey(() => Station)
  stationId: string;

  @BelongsTo(() => Station, 'stationId')
  station: Station;
}
