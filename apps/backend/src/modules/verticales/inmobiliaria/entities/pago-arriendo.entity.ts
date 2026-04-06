import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum EstadoPagoArriendo {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  VENCIDO = 'VENCIDO',
}

@Entity('pagos_arriendo')
@Index(['contratoId'])
@Unique('uq_pago_contrato_mes_anio', ['contratoId', 'mes', 'anio'])
export class PagoArriendo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contratoId: string;

  @Column({ type: 'int' })
  mes: number;

  @Column({ name: 'anio', type: 'int' })
  anio: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'date' })
  fechaVencimiento: string;

  @Column({ type: 'date', nullable: true })
  fechaPago: string | null;

  @Column({ type: 'enum', enum: EstadoPagoArriendo, default: EstadoPagoArriendo.PENDIENTE })
  estado: EstadoPagoArriendo;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  penalidad: number;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;
}
