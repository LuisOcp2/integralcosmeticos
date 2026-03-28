import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parametros_configuracion')
@Unique(['clave'])
export class ParametroConfiguracion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  clave: string;

  @Column({ type: 'text', nullable: true })
  valor?: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'tipo_dato', length: 20, default: 'STRING' })
  tipoDato: string;

  @Column({ length: 60, nullable: true })
  modulo?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
