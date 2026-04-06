import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PeriodoContable } from './periodo-contable.entity';

export enum TipoPresupuestoMensual {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

@Entity('presupuestos_mensuales')
@Index(['periodoId', 'categoria', 'tipo'], { unique: true })
export class PresupuestoMensual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  periodoId: string;

  @ManyToOne(() => PeriodoContable, { nullable: false })
  @JoinColumn({ name: 'periodoId' })
  periodo: PeriodoContable;

  @Column({ type: 'varchar', length: 100 })
  categoria: string;

  @Column({ type: 'enum', enum: TipoPresupuestoMensual })
  tipo: TipoPresupuestoMensual;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  montoPresupuestado: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoEjecutado: number;
}
