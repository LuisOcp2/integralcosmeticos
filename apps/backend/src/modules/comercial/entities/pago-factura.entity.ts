import { MetodoPago } from '@cosmeticos/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Factura } from './factura.entity';

@Entity('pagos_factura')
export class PagoFactura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  facturaId: string;

  @ManyToOne(() => Factura, (factura) => factura.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facturaId' })
  factura: Factura;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({
    type: 'enum',
    enum: MetodoPago,
  })
  metodoPago: MetodoPago;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia?: string | null;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @Column('uuid')
  registradoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'registradoPorId' })
  registradoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
