import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PlanEmpresa {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum EstadoEmpresa {
  ACTIVA = 'ACTIVA',
  SUSPENDIDA = 'SUSPENDIDA',
  TRIAL = 'TRIAL',
  CANCELADA = 'CANCELADA',
}

@Entity('empresas')
@Index(['nit'], { unique: true })
export class Empresa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  nit: string;

  @Column({ type: 'varchar', length: 200 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'enum', enum: PlanEmpresa, default: PlanEmpresa.STARTER })
  plan: PlanEmpresa;

  @Column({ type: 'enum', enum: EstadoEmpresa, default: EstadoEmpresa.TRIAL })
  estado: EstadoEmpresa;

  @Column({ type: 'text', array: true, default: [] })
  modulos: string[];

  @Column({ type: 'int', default: 5 })
  maxUsuarios: number;

  @Column({ type: 'int', default: 1 })
  maxSedes: number;

  @Column({ type: 'date', nullable: true })
  vencimientoEn: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
