import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoMovimientoInversion {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
  DIVIDENDO = 'DIVIDENDO',
  AJUSTE = 'AJUSTE',
  APORTE = 'APORTE',
  RETIRO = 'RETIRO',
}

@Entity('movimientos_inversion')
@Index(['itemId'])
export class MovimientoInversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'enum', enum: TipoMovimientoInversion })
  tipo: TipoMovimientoInversion;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'decimal', precision: 14, scale: 6, nullable: true })
  cantidadUnidades: number | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text', nullable: true })
  nota: string | null;

  @Column({ type: 'uuid' })
  registradoPorId: string;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;
}
