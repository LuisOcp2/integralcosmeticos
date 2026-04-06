import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Documento } from './documento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('documentos_versiones')
export class VersionDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentoId: string;

  @ManyToOne(() => Documento, (documento) => documento.versiones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentoId' })
  documento: Documento;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 500 })
  archivoUrl: string;

  @Column({ type: 'varchar', length: 200 })
  nombreArchivo: string;

  @Column({ type: 'text', nullable: true })
  cambios: string | null;

  @Column({ type: 'uuid' })
  subidoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subidoPorId' })
  subidoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
