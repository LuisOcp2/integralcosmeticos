import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MovimientoBancario } from './movimiento-bancario.entity';

export enum TipoCuentaBancaria {
  CORRIENTE = 'CORRIENTE',
  AHORROS = 'AHORROS',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  OTRO = 'OTRO',
}

@Entity('cuentas_bancarias')
export class CuentaBancaria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  banco: string;

  @Column({ type: 'enum', enum: TipoCuentaBancaria })
  tipoCuenta: TipoCuentaBancaria;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  numeroCuenta: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldoActual: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  saldoInicial: number;

  @Column({ type: 'date' })
  fechaSaldoInicial: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'boolean', default: false })
  esPrincipal: boolean;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  moneda: string;

  @OneToMany(() => MovimientoBancario, (movimiento) => movimiento.cuentaBancaria)
  movimientos: MovimientoBancario[];
}
