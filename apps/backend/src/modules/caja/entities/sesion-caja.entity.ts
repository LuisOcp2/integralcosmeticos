import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoCaja } from '@cosmeticos/shared-types';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Venta } from '../../ventas/entities/venta.entity';
import { Caja } from './caja.entity';

@Entity('sesiones_caja')
export class SesionCaja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'cajaId' })
  cajaId: string;

  @ManyToOne(() => Caja, { nullable: false })
  @JoinColumn({ name: 'cajaId' })
  caja: Caja;

  @Column('uuid', { name: 'usuarioAperturaId' })
  cajeroId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuarioAperturaId' })
  cajero: Usuario;

  @Column('uuid', { name: 'usuarioCierreId', nullable: true })
  cerradaPorId?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuarioCierreId' })
  cerradaPor?: Usuario | null;

  @Column({
    name: 'activa',
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.ABIERTA,
    transformer: {
      to: (value?: EstadoCaja) => value === EstadoCaja.ABIERTA,
      from: (value: boolean) => (value ? EstadoCaja.ABIERTA : EstadoCaja.CERRADA),
    },
  })
  estado: EstadoCaja;

  @Column({ name: 'monto_inicial', type: 'decimal', precision: 12, scale: 2 })
  montoApertura: number;

  @Column({ name: 'fecha_apertura', type: 'timestamp' })
  fechaApertura: Date;

  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre?: Date | null;

  @Column({
    name: 'monto_final_declarado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  montoCierre?: number | null;

  @Column({ name: 'monto_final_sistema', type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoSistema?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia?: number | null;

  @Column({ name: 'observaciones_cierre', type: 'text', nullable: true })
  notasCierre?: string | null;

  @OneToMany(() => Venta, (venta) => venta.caja)
  ventas: Venta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
