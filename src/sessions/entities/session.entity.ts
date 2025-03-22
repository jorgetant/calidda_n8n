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
  paranoid: true,
  timestamps: true,
})
export class Session extends Model {
  @PrimaryKey
  @Default(UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  token: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  calidda_token: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  plate: string;
}
