import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('configuraciones_notificacion')
@Index('idx_config_notif_usuario_unico', ['usuarioId'], { unique: true })
export class ConfiguracionNotificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ default: true })
  inApp: boolean;

  @Column({ default: false })
  email: boolean;

  @Column({ type: 'timestamp', nullable: true })
  silenciadoHasta?: Date | null;

  @Column({ type: 'text', array: true, default: [] })
  categoriasDesactivadas: string[];

  @UpdateDateColumn()
  updatedAt: Date;
}
