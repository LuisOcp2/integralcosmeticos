import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Rol, Permiso } from '@cosmeticos/shared-types';

@Entity('usuarios')
@Index(['email'], { unique: true })
@Index(['sedeId'])
@Index(['empresaId'])
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: Rol,
    default: Rol.CAJERO,
  })
  rol: Rol;

  @Column({ type: 'text', array: true, default: [] })
  permisosExtra: Permiso[];

  @Column({ type: 'text', array: true, default: [] })
  permisosRevocados: Permiso[];

  @Column({ name: 'sedeId', nullable: true, type: 'uuid' })
  sedeId: string | null;

  @Column({ name: 'empresaId', nullable: true, type: 'uuid' })
  empresaId: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  telefono: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  avatarUrl: string | null;

  @Column({ default: 0 })
  intentosFallidos: number;

  @Column({ nullable: true, type: 'timestamp' })
  bloqueadoHasta: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  ultimoLogin: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ultimaIp: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ nullable: true, type: 'timestamp', select: false })
  resetPasswordExpires: Date | null;

  @Column({ default: false })
  forzarCambioPassword: boolean;

  @Column({ nullable: true, type: 'text' })
  notas: string | null;

  @Column({ nullable: true, type: 'uuid' })
  creadoPorId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  desactivadoEn: Date | null;

  @Column({ nullable: true, type: 'uuid' })
  desactivadoPorId: string | null;

  /**
   * Versión del token. Se incrementa al cambiar el rol del usuario para invalidar
   * todos los JWT existentes de esa cuenta.
   */
  @Column({ default: 0 })
  tokenVersion: number;
}
