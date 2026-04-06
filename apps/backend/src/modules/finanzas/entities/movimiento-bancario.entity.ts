import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { CuentaBancaria } from './cuenta-bancaria.entity';

export enum TipoMovimientoBancario {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  TRASLADO = 'TRASLADO',
}

export enum CategoriaMovimientoBancario {
  VENTA = 'VENTA',
  COBRO_FACTURA = 'COBRO_FACTURA',
  PAGO_PROVEEDOR = 'PAGO_PROVEEDOR',
  NOMINA = 'NOMINA',
  IMPUESTO = 'IMPUESTO',
  GASTO_OPERATIVO = 'GASTO_OPERATIVO',
  OTRO = 'OTRO',
}

@Entity('movimientos_bancarios')
export class MovimientoBancario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cuentaBancariaId: string;

  @ManyToOne(() => CuentaBancaria, (cuenta) => cuenta.movimientos, { nullable: false })
  @JoinColumn({ name: 'cuentaBancariaId' })
  cuentaBancaria: CuentaBancaria;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia?: string | null;

  @Column({ type: 'enum', enum: TipoMovimientoBancario })
  tipo: TipoMovimientoBancario;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  saldoDespues: number;

  @Column({ type: 'enum', enum: CategoriaMovimientoBancario })
  categoria: CategoriaMovimientoBancario;

  @Column({ type: 'boolean', default: false })
  conciliado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  conciliadoEn?: Date | null;

  @Column('uuid', { nullable: true })
  ventaId?: string | null;

  @Column('uuid', { nullable: true })
  facturaId?: string | null;

  @Column('uuid', { nullable: true })
  ordenCompraId?: string | null;

  @Column('uuid')
  registradoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'registradoPorId' })
  registradoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
