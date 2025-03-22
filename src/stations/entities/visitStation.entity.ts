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

@Table({
  timestamps: true,
})
export class VisitStation extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  timestamp: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  saturation: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  userId: string;

  // Relations
  @ForeignKey(() => Station)
  stationId: string;

  @BelongsTo(() => Station, 'stationId')
  station: Station;
}
