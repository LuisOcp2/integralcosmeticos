import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Area } from './area.entity';
import { Empleado } from './empleado.entity';

export enum NivelCargo {
  OPERATIVO = 'OPERATIVO',
  TECNICO = 'TECNICO',
  PROFESIONAL = 'PROFESIONAL',
  DIRECTIVO = 'DIRECTIVO',
}

@Entity('rrhh_cargos')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'uuid' })
  areaId: string;

  @ManyToOne(() => Area, (area) => area.cargos, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salarioBase: number;

  @Column({ type: 'enum', enum: NivelCargo })
  nivel: NivelCargo;

  @OneToMany(() => Empleado, (empleado) => empleado.cargo)
  empleados: Empleado[];
}
