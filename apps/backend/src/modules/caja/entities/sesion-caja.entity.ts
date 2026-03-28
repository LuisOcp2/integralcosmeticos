import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sesiones_caja')
export class SesionCaja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cajaId: string;

  @Column('uuid')
  usuarioAperturaId: string;

  @Column('uuid', { nullable: true })
  usuarioCierreId?: string | null;

  @Column({ name: 'fecha_apertura', type: 'timestamp with time zone' })
  fechaApertura: Date;

  @Column({ name: 'fecha_cierre', type: 'timestamp with time zone', nullable: true })
  fechaCierre?: Date | null;

  @Column({ name: 'monto_inicial', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoInicial: number;

  @Column({
    name: 'monto_final_declarado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  montoFinal?: number | null;

  @Column({ name: 'total_ventas', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVentas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia?: number | null;

  @Column({ name: 'activa', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
