import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Sede } from '../../../sedes/entities/sede.entity';
import { LiquidacionNomina } from './liquidacion-nomina.entity';

export enum EstadoNominaColectiva {
  EN_PROCESO = 'EN_PROCESO',
  APROBADA = 'APROBADA',
  PAGADA = 'PAGADA',
}

@Entity('rrhh_nominas_colectivas')
export class NominaColectiva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  mes: number;

  @Column({ name: 'ano', type: 'int' })
  ano: number;

  @Column({ type: 'uuid' })
  sedeId: string;

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @Column({ type: 'enum', enum: EstadoNominaColectiva, default: EstadoNominaColectiva.EN_PROCESO })
  estado: EstadoNominaColectiva;

  @Column({ type: 'int' })
  totalEmpleados: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalDevengado: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalDeducciones: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalNeto: number;

  @Column({ type: 'uuid', nullable: true })
  aprobadaPorId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pagadaEn: Date | null;

  @OneToMany(() => LiquidacionNomina, (liquidacion) => liquidacion.nominaColectiva)
  liquidaciones: LiquidacionNomina[];
}
