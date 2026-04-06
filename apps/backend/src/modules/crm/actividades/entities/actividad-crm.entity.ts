import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../../usuarios/entities/usuario.entity';
import { Cliente } from '../../../clientes/entities/cliente.entity';
import { Lead } from '../../leads/entities/lead.entity';
import { Oportunidad } from '../../oportunidades/entities/oportunidad.entity';

export enum TipoActividadCRM {
  LLAMADA = 'LLAMADA',
  REUNION = 'REUNION',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  TAREA = 'TAREA',
  NOTA = 'NOTA',
  VISITA = 'VISITA',
}

@Entity('crm_actividades')
@Index('idx_crm_actividades_fecha', ['fecha'])
@Index('idx_crm_actividades_completada', ['completada'])
@Index('idx_crm_actividades_fecha_proxima', ['fechaProximaAccion'])
export class ActividadCRM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TipoActividadCRM, enumName: 'crm_tipo_actividad_enum' })
  tipo: TipoActividadCRM;

  @Column({ type: 'uuid', nullable: true })
  leadId?: string | null;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead | null;

  @Column({ type: 'uuid', nullable: true })
  oportunidadId?: string | null;

  @ManyToOne(() => Oportunidad, { nullable: true })
  @JoinColumn({ name: 'oportunidadId' })
  oportunidad?: Oportunidad | null;

  @Column({ type: 'uuid', nullable: true })
  clienteId?: string | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente | null;

  @Column({ type: 'varchar', length: 200 })
  asunto: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'text', nullable: true })
  resultado?: string | null;

  @Column({ type: 'int', nullable: true })
  duracionMinutos?: number | null;

  @Column({ type: 'uuid' })
  realizadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'realizadoPorId' })
  realizadoPor: Usuario;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'boolean', default: false })
  completada: boolean;

  @Column({ type: 'text', nullable: true })
  proximaAccion?: string | null;

  @Column({ type: 'date', nullable: true })
  fechaProximaAccion?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
