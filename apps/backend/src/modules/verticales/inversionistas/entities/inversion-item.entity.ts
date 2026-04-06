import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum TipoInversionItem {
  ACCION = 'ACCION',
  BONO = 'BONO',
  FINCA_RAIZ = 'FINCA_RAIZ',
  CDT = 'CDT',
  FONDO = 'FONDO',
  CRYPTO = 'CRYPTO',
  OTRO = 'OTRO',
}

@Entity('inversion_items')
@Index(['portafolioId'])
export class InversionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  portafolioId: string;

  @Column({ type: 'enum', enum: TipoInversionItem })
  tipo: TipoInversionItem;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  simbolo: string | null;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  moneda: string;

  @Column({ type: 'decimal', precision: 14, scale: 6 })
  cantidadUnidades: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  precioCompra: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  precioActual: number;

  @Column({ type: 'date' })
  fechaCompra: string;

  @Column({ type: 'date', nullable: true })
  fechaVencimiento: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  dividendos: number;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
