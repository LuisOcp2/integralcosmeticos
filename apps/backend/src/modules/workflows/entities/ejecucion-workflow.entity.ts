import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Workflow } from './workflow.entity';

export enum EstadoEjecucionWorkflow {
  EN_PROCESO = 'EN_PROCESO',
  EXITOSA = 'EXITOSA',
  FALLIDA = 'FALLIDA',
}

@Entity('ejecuciones_workflow')
export class EjecucionWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => Workflow, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column({
    type: 'enum',
    enum: EstadoEjecucionWorkflow,
    enumName: 'workflow_estado_ejecucion_enum',
  })
  estado: EstadoEjecucionWorkflow;

  @Column({ type: 'jsonb' })
  contexto: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  resultado?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ type: 'int', nullable: true })
  duracionMs?: number | null;

  @Column({ type: 'timestamp' })
  inicioEn: Date;

  @Column({ type: 'timestamp', nullable: true })
  finEn?: Date | null;
}
