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

  @Column({ length: 10, default: 'COP' })
  moneda: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 19 })
  impuestoPorcentaje: number;

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
