import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ImportacionCatalogoJob } from './importacion-catalogo-job.entity';

export enum EstadoImportacionCatalogoRow {
  VALID = 'VALID',
  INVALID = 'INVALID',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SKIPPED = 'SKIPPED',
  ERROR = 'ERROR',
}

@Entity('importaciones_catalogo_rows')
export class ImportacionCatalogoRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  jobId: string;

  @ManyToOne(() => ImportacionCatalogoJob, (job) => job.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: ImportacionCatalogoJob;

  @Column({ type: 'int' })
  rowNumber: number;

  @Column({ type: 'jsonb' })
  rawData: any;

  @Column({ type: 'jsonb', nullable: true })
  normalizedData?: any;

  @Column({ type: 'varchar', length: 30, default: EstadoImportacionCatalogoRow.VALID })
  status: EstadoImportacionCatalogoRow;

  @Column({ type: 'text', nullable: true })
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  variantId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
