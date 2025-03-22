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
export class Prices extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.STRING)
  price: string;

  @Column(DataType.STRING)
  file_date: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  hour: string;

  // Relations
  @ForeignKey(() => Station)
  stationId: string;

  @BelongsTo(() => Station, 'stationId')
  station: Station;
}
