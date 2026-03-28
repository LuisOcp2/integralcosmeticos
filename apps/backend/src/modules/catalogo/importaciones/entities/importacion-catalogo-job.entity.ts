import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModoImportacion } from '../dto/validar-importacion.dto';
import { ImportacionCatalogoRow } from './importacion-catalogo-row.entity';

export enum EstadoImportacionCatalogo {
  UPLOADED = 'UPLOADED',
  VALIDATED = 'VALIDATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
}

@Entity('importaciones_catalogo_jobs')
export class ImportacionCatalogoJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ length: 10 })
  format: 'csv' | 'xlsx';

  @Column({ type: 'varchar', length: 40, default: ModoImportacion.CREAR_O_ACTUALIZAR })
  mode: ModoImportacion;

  @Column({ default: true })
  dryRun: boolean;

  @Column({ type: 'varchar', length: 40, default: EstadoImportacionCatalogo.UPLOADED })
  status: EstadoImportacionCatalogo;

  @Column({ type: 'int', default: 0 })
  totalRows: number;

  @Column({ type: 'int', default: 0 })
  validRows: number;

  @Column({ type: 'int', default: 0 })
  errorRows: number;

  @Column({ type: 'int', default: 0 })
  processedRows: number;

  @Column({ type: 'int', default: 0 })
  createdProducts: number;

  @Column({ type: 'int', default: 0 })
  updatedProducts: number;

  @Column({ type: 'int', default: 0 })
  createdVariants: number;

  @Column({ type: 'int', default: 0 })
  updatedVariants: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  summary?: any;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @OneToMany(() => ImportacionCatalogoRow, (row: ImportacionCatalogoRow) => row.job, {
    cascade: false,
  })
  rows: ImportacionCatalogoRow[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
