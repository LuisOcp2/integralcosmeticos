import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoSede } from '@cosmeticos/shared-types';

@Entity('sedes')
export class Sede {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text' })
  direccion: string;

  @Column({ length: 100 })
  ciudad: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ length: 150, nullable: true })
  responsable?: string;

  @Column({
    type: 'enum',
    enum: TipoSede,
    default: TipoSede.PRINCIPAL,
    transformer: {
      to: (value?: TipoSede) => (value === TipoSede.TIENDA ? 'SUCURSAL' : value),
      from: (value?: string) => (value === 'SUCURSAL' ? TipoSede.TIENDA : (value as TipoSede)),
    },
  })
  tipo: TipoSede;

  @Column({ name: 'activa', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
