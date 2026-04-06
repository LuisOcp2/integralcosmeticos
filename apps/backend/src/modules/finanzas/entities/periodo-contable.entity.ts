import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoPeriodoFinanciero {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
  BLOQUEADO = 'BLOQUEADO',
}

@Entity('finanzas_periodos_contables')
@Index(['ano', 'mes'], { unique: true })
export class PeriodoContable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  ano: number;

  @Column({ type: 'integer' })
  mes: number;

  @Column({
    type: 'enum',
    enum: EstadoPeriodoFinanciero,
    default: EstadoPeriodoFinanciero.ABIERTO,
  })
  estado: EstadoPeriodoFinanciero;

  @Column({ type: 'timestamp', nullable: true })
  fechaCierre?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  cerradoPorId?: string | null;
}
