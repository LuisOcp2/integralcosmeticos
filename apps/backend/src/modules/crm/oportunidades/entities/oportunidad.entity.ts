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
import { Lead } from '../../leads/entities/lead.entity';

export enum EtapaOportunidad {
  PROSPECTO = 'PROSPECTO',
  PROPUESTA = 'PROPUESTA',
  NEGOCIACION = 'NEGOCIACION',
  CIERRE = 'CIERRE',
  GANADA = 'GANADA',
  PERDIDA = 'PERDIDA',
}

@Entity('crm_oportunidades')
@Index('idx_crm_oportunidades_etapa', ['etapa'])
@Index('idx_crm_oportunidades_asignado', ['asignadoAId'])
export class Oportunidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'uuid', nullable: true })
  leadId?: string | null;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead | null;

  @Column({ type: 'uuid', nullable: true })
  clienteId?: string | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente | null;

  @Column({
    type: 'enum',
    enum: EtapaOportunidad,
    enumName: 'crm_etapa_oportunidad_enum',
    default: EtapaOportunidad.PROSPECTO,
  })
  etapa: EtapaOportunidad;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  valor: number;

  @Column({ type: 'int' })
  probabilidad: number;

  @Column({ type: 'date' })
  fechaCierreEsperada: Date;

  @Column({ type: 'date', nullable: true })
  fechaCierreReal?: Date | null;

  @Column({ type: 'uuid' })
  asignadoAId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'asignadoAId' })
  asignadoA: Usuario;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'text', nullable: true })
  motivoPerdida?: string | null;

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
