import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoSede } from '@cosmeticos/shared-types';

@Entity('sedes')
export class Sede {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text' })
  direccion: string;

  @Column({ length: 100 })
  ciudad: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({
    type: 'enum',
    enum: TipoSede,
    default: TipoSede.TIENDA,
  })
  tipo: TipoSede;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
