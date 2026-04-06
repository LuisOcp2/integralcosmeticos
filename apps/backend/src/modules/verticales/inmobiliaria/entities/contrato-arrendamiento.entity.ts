import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoContratoArrendamiento {
  ACTIVO = 'ACTIVO',
  VENCIDO = 'VENCIDO',
  TERMINADO = 'TERMINADO',
}

@Entity('contratos_arrendamiento')
@Index(['inmuebleId'])
@Index(['arrendatarioId'])
export class ContratoArrendamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inmuebleId: string;

  @Column({ type: 'uuid' })
  arrendatarioId: string;

  @Column({ type: 'uuid' })
  propietarioId: string;

  @Column({ type: 'date' })
  fechaInicio: string;

  @Column({ type: 'date' })
  fechaFin: string;

  @Column({ type: 'int' })
  duracionMeses: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  canonMensual: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  deposito: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  incrementoPorcentaje: number | null;

  @Column({
    type: 'enum',
    enum: EstadoContratoArrendamiento,
    default: EstadoContratoArrendamiento.ACTIVO,
  })
  estado: EstadoContratoArrendamiento;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
