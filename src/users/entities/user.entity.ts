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
  paranoid: false,
  timestamps: true,
})
export class User extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  plate: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: false,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  otp: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  otpExpires: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  vehicleType: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  otpUsed: number;
}
