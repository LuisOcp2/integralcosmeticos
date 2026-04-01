import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AccionAuditoria {
  CREAR = 'CREAR',
  ACTUALIZAR = 'ACTUALIZAR',
  CAMBIAR_ROL = 'CAMBIAR_ROL',
  CAMBIAR_PASSWORD = 'CAMBIAR_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ACTIVAR = 'ACTIVAR',
  DESACTIVAR = 'DESACTIVAR',
  BLOQUEAR = 'BLOQUEAR',
  DESBLOQUEAR = 'DESBLOQUEAR',
  AGREGAR_PERMISO = 'AGREGAR_PERMISO',
  REVOCAR_PERMISO = 'REVOCAR_PERMISO',
  LOGIN = 'LOGIN',
  LOGIN_FALLIDO = 'LOGIN_FALLIDO',
}

@Entity('auditoria_usuarios')
@Index(['usuarioAfectadoId'])
@Index(['realizadoPorId'])
@Index(['createdAt'])
export class AuditoriaUsuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioAfectadoId: string;

  @Column({ nullable: true, type: 'uuid' })
  realizadoPorId: string | null;

  @Column({ type: 'enum', enum: AccionAuditoria })
  accion: AccionAuditoria;

  @Column({ type: 'jsonb', nullable: true })
  datosAnteriores: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  datosNuevos: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true, length: 300 })
  userAgent: string | null;

  @Column({ nullable: true, type: 'text' })
  motivo: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
