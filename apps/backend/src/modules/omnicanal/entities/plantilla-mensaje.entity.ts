import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CanalOmnicanal } from './conversacion.entity';

export enum CategoriaPlantillaMensaje {
  BIENVENIDA = 'BIENVENIDA',
  COTIZACION = 'COTIZACION',
  SEGUIMIENTO = 'SEGUIMIENTO',
  SOPORTE = 'SOPORTE',
  PROMO = 'PROMO',
}

@Entity('omnicanal_plantillas_mensaje')
export class PlantillaMensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'enum', enum: CanalOmnicanal, enumName: 'omnicanal_canal_enum' })
  canal: CanalOmnicanal;

  @Column({
    type: 'enum',
    enum: CategoriaPlantillaMensaje,
    enumName: 'omnicanal_categoria_plantilla_enum',
  })
  categoria: CategoriaPlantillaMensaje;

  @Column({ type: 'varchar', length: 200, nullable: true })
  asunto?: string | null;

  @Column({ type: 'text' })
  cuerpo: string;

  @Column({ type: 'text', array: true, default: [] })
  variables: string[];

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
