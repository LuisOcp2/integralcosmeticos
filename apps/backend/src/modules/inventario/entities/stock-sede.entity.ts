import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stock_sedes')
@Index(['varianteId', 'sedeId'], { unique: true })
export class StockSede {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  varianteId: string;

  @Column('uuid')
  sedeId: string;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  @Column({ type: 'int', default: 0 })
  stockMinimo: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
