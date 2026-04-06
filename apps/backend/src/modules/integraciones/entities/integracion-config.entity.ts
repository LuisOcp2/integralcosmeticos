import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoIntegracion {
  SIIGO = 'SIIGO',
  DIAN_FE = 'DIAN_FE',
  WHATSAPP_BUSINESS = 'WHATSAPP_BUSINESS',
  SMTP = 'SMTP',
  S3 = 'S3',
  WOMPI = 'WOMPI',
  CUSTOM_WEBHOOK = 'CUSTOM_WEBHOOK',
}

export enum EstadoIntegracion {
  OK = 'OK',
  ERROR = 'ERROR',
  SIN_CONFIGURAR = 'SIN_CONFIGURAR',
}

@Entity('integraciones_config')
@Index(['tipo'], { unique: true })
export class IntegracionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TipoIntegracion })
  tipo: TipoIntegracion;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'boolean', default: false })
  activa: boolean;

  @Column({ type: 'jsonb', default: {} })
  credenciales: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  configuracion: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  ultimaSync: Date | null;

  @Column({ type: 'enum', enum: EstadoIntegracion, default: EstadoIntegracion.SIN_CONFIGURAR })
  estado: EstadoIntegracion;

  @Column({ type: 'text', nullable: true })
  mensajeError: string | null;
}
