import { UUIDV4 } from 'sequelize';
import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class LogUser extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceInfo: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  ipAddress: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  timestamp: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  plate: string;
}
