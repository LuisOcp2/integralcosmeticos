import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activo } from './activo.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoMovimientoActivo {
  ALTA = 'ALTA',
  BAJA = 'BAJA',
  TRASLADO = 'TRASLADO',
  MANTENIMIENTO = 'MANTENIMIENTO',
}

@Entity('activos_movimientos')
export class MovimientoActivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  activoId: string;

  @ManyToOne(() => Activo, (activo) => activo.movimientos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activoId' })
  activo: Activo;

  @Column({ type: 'enum', enum: TipoMovimientoActivo })
  tipo: TipoMovimientoActivo;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'uuid', nullable: true })
  sedeOrigenId: string | null;

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sedeOrigenId' })
  sedeOrigen: Sede | null;

  @Column({ type: 'uuid', nullable: true })
  sedeDestinoId: string | null;

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sedeDestinoId' })
  sedeDestino: Sede | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo: number | null;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'uuid' })
  realizadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'realizadoPorId' })
  realizadoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
