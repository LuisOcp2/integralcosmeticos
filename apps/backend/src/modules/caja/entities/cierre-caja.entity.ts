import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoCaja } from '@cosmeticos/shared-types';

@Entity('cierre_cajas')
export class CierreCaja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sedeId: string;

  @Column('uuid')
  usuarioId: string;

  @Column({ type: 'timestamp with time zone' })
  fechaApertura: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fechaCierre?: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoInicial: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoFinal?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVentas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEfectivo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia?: number | null;

  @Column({
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.ABIERTA,
  })
  estado: EstadoCaja;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
