import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TriggerWorkflowTipo {
  // Se dispara al registrar movimientos en inventario.
  STOCK_BAJO_MINIMO = 'STOCK_BAJO_MINIMO',
  // Se dispara al completar una venta.
  VENTA_COMPLETADA = 'VENTA_COMPLETADA',
  // Se dispara al crear un cliente.
  CLIENTE_NUEVO = 'CLIENTE_NUEVO',
  // Se dispara por cron diario en el motor.
  FACTURA_VENCIDA = 'FACTURA_VENCIDA',
  // Se dispara por cron configurable en trigger.configuracion.expresionCron.
  PROGRAMADO = 'PROGRAMADO',
}

export enum AccionWorkflowTipo {
  ENVIAR_NOTIFICACION = 'ENVIAR_NOTIFICACION',
  CREAR_ACTIVIDAD_CRM = 'CREAR_ACTIVIDAD_CRM',
  WEBHOOK_EXTERNO = 'WEBHOOK_EXTERNO',
  ESPERAR_MINUTOS = 'ESPERAR_MINUTOS',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ type: 'jsonb' })
  trigger: {
    tipo: TriggerWorkflowTipo;
    configuracion?: Record<string, unknown>;
  };

  @Column({ type: 'jsonb', array: true, default: [] })
  pasos: Array<{
    tipo: AccionWorkflowTipo;
    config: Record<string, unknown>;
  }>;

  @Column({
    type: 'jsonb',
    default: {
      ejecuciones: 0,
      exitosas: 0,
      fallidas: 0,
      ultimaEjecucion: null,
    },
  })
  estadisticas: {
    ejecuciones: number;
    exitosas: number;
    fallidas: number;
    ultimaEjecucion: string | null;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
