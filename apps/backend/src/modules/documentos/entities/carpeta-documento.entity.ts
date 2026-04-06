import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Documento } from './documento.entity';

export enum AccesoCarpetaDocumento {
  PUBLICO = 'PUBLICO',
  PRIVADO = 'PRIVADO',
  DEPARTAMENTO = 'DEPARTAMENTO',
}

@Entity('documentos_carpetas')
export class CarpetaDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'uuid', nullable: true })
  padreId: string | null;

  @ManyToOne(() => CarpetaDocumento, (carpeta) => carpeta.hijos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'padreId' })
  padre: CarpetaDocumento | null;

  @OneToMany(() => CarpetaDocumento, (carpeta) => carpeta.padre)
  hijos: CarpetaDocumento[];

  @Column({ type: 'enum', enum: AccesoCarpetaDocumento, default: AccesoCarpetaDocumento.PUBLICO })
  acceso: AccesoCarpetaDocumento;

  @Column({ type: 'uuid' })
  creadaPorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creadaPorId' })
  creadaPor: Usuario;

  @OneToMany(() => Documento, (documento) => documento.carpeta)
  documentos: Documento[];

  @CreateDateColumn()
  createdAt: Date;
}
