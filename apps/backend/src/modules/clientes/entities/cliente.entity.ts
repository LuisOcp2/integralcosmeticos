import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoDocumento } from '@cosmeticos/shared-types';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({
    type: 'enum',
    enum: TipoDocumento,
  })
  tipoDocumento: TipoDocumento;

  @Index({ unique: true })
  @Column({ length: 30 })
  documento: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  email?: string | null;

  @Column({ nullable: true, length: 30 })
  telefono?: string | null;

  @Column({ type: 'text', nullable: true })
  direccion?: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento?: Date | null;

  @Column({ type: 'int', default: 0 })
  puntosFidelidad: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
