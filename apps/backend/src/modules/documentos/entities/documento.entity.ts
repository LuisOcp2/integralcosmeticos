import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CarpetaDocumento } from './carpeta-documento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { VersionDocumento } from './version-documento.entity';

export enum TipoDocumento {
  CONTRATO = 'CONTRATO',
  FACTURA = 'FACTURA',
  MANUAL = 'MANUAL',
  POLITICA = 'POLITICA',
  CERTIFICADO = 'CERTIFICADO',
  REPORTE = 'REPORTE',
  OTRO = 'OTRO',
}

@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'uuid' })
  carpetaId: string;

  @ManyToOne(() => CarpetaDocumento, (carpeta) => carpeta.documentos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'carpetaId' })
  carpeta: CarpetaDocumento;

  @Column({ type: 'enum', enum: TipoDocumento })
  tipo: TipoDocumento;

  @Column({ type: 'varchar', length: 200 })
  nombreArchivo: string;

  @Column({ type: 'varchar', length: 500 })
  archivoUrl: string;

  @Column({ type: 'int' })
  tamano: number;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'text', array: true, default: [] })
  etiquetas: string[];

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ type: 'date', nullable: true })
  vencimientoEn: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  entidadTipo: string | null;

  @Column({ type: 'uuid', nullable: true })
  entidadId: string | null;

  @OneToMany(() => VersionDocumento, (version) => version.documento)
  versiones: VersionDocumento[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
