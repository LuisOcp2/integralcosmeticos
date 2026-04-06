import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../../usuarios/entities/usuario.entity';
import { Cliente } from '../../../clientes/entities/cliente.entity';

export enum OrigenLead {
  REFERIDO = 'REFERIDO',
  WEB = 'WEB',
  REDES_SOCIALES = 'REDES_SOCIALES',
  LLAMADA = 'LLAMADA',
  VISITA = 'VISITA',
  WHATSAPP = 'WHATSAPP',
  OTRO = 'OTRO',
}

export enum EstadoLead {
  NUEVO = 'NUEVO',
  CONTACTADO = 'CONTACTADO',
  CALIFICADO = 'CALIFICADO',
  OPORTUNIDAD = 'OPORTUNIDAD',
  GANADO = 'GANADO',
  PERDIDO = 'PERDIDO',
  DESCARTADO = 'DESCARTADO',
}

@Entity('crm_leads')
@Index('idx_crm_leads_estado', ['estado'])
@Index('idx_crm_leads_origen', ['origen'])
@Index('idx_crm_leads_asignado', ['asignadoAId'])
@Index('idx_crm_leads_sede', ['sedeId'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  empresa?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ type: 'enum', enum: OrigenLead, enumName: 'crm_origen_lead_enum' })
  origen: OrigenLead;

  @Column({
    type: 'enum',
    enum: EstadoLead,
    enumName: 'crm_estado_lead_enum',
    default: EstadoLead.NUEVO,
  })
  estado: EstadoLead;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  valorEstimado?: number | null;

  @Column({ type: 'int', nullable: true })
  probabilidad?: number | null;

  @Column({ type: 'uuid', nullable: true })
  asignadoAId?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'asignadoAId' })
  asignadoA?: Usuario | null;

  @Column({ type: 'uuid' })
  sedeId: string;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @Column({ type: 'text', nullable: true })
  motivoPerdida?: string | null;

  @Column({ type: 'date', nullable: true })
  fechaProximoContacto?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  ultimoContacto?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  convertidoAClienteId?: string | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'convertidoAClienteId' })
  convertidoACliente?: Cliente | null;

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
