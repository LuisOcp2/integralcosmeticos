import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activo } from './activo.entity';

export enum MetodoDepreciacionActivo {
  LINEA_RECTA = 'LINEA_RECTA',
  REDUCCION_SALDOS = 'REDUCCION_SALDOS',
}

@Entity('activos_categorias')
export class CategoriaActivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int' })
  vidaUtilAnios: number;

  @Column({
    type: 'enum',
    enum: MetodoDepreciacionActivo,
    default: MetodoDepreciacionActivo.LINEA_RECTA,
  })
  metodoDep: MetodoDepreciacionActivo;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Activo, (activo) => activo.categoria)
  activos: Activo[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
