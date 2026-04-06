import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from '../../entities/empleado.entity';
import { NominaColectiva } from './nomina-colectiva.entity';

export enum EstadoLiquidacionNomina {
  BORRADOR = 'BORRADOR',
  APROBADA = 'APROBADA',
  PAGADA = 'PAGADA',
}

@Entity('rrhh_liquidaciones_nomina')
@Index('uq_rrhh_liquidacion_empleado_mes_ano', ['empleadoId', 'mes', 'ano'], { unique: true })
export class LiquidacionNomina {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empleadoId: string;

  @ManyToOne(() => Empleado, (empleado) => empleado.liquidacionesNomina, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ type: 'uuid', nullable: true })
  nominaColectivaId: string | null;

  @ManyToOne(() => NominaColectiva, (nomina) => nomina.liquidaciones, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'nominaColectivaId' })
  nominaColectiva: NominaColectiva | null;

  @Column({ type: 'int' })
  mes: number;

  @Column({ name: 'ano', type: 'int' })
  ano: number;

  @Column({ type: 'int' })
  diasTrabajados: number;

  @Column({ type: 'int', default: 0 })
  diasAusencia: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salarioBase: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  auxilioTransporte: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasExtra: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  valorHorasExtra: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalDevengado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saludEmpleado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pensionEmpleado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  retencionFuente: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  otrasDeduciones: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalDeducciones: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  netoPagar: number;

  @Column({
    type: 'enum',
    enum: EstadoLiquidacionNomina,
    default: EstadoLiquidacionNomina.BORRADOR,
  })
  estado: EstadoLiquidacionNomina;
}
