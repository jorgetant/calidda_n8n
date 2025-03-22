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
export class Saturation extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  file_date: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  hour: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  saturation: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  saturation_level: string;

  // Relations
  @ForeignKey(() => Station)
  stationId: string;

  @BelongsTo(() => Station, 'stationId')
  station: Station;
}
