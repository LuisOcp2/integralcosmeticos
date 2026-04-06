import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empleado } from './empleado.entity';
import { Cargo } from './cargo.entity';

@Entity('rrhh_areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'uuid', nullable: true })
  responsableId: string | null;

  @ManyToOne(() => Empleado, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsableId' })
  responsable: Empleado | null;

  @OneToMany(() => Empleado, (empleado) => empleado.area)
  empleados: Empleado[];

  @OneToMany(() => Cargo, (cargo) => cargo.area)
  cargos: Cargo[];

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
