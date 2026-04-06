import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stockMinimo: number;

  @Column({ name: 'stock_maximo', type: 'int', nullable: true })
  stockMaximo?: number | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
