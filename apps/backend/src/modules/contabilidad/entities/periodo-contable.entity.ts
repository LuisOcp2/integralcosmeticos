import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoPeriodoContable } from '../enums/contabilidad.enums';

@Entity('periodos_contables')
@Index(['ano', 'mes'], { unique: true })
export class PeriodoContable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  ano: number;

  @Column({ type: 'integer' })
  mes: number;

  @Column({
    type: 'enum',
    enum: EstadoPeriodoContable,
    default: EstadoPeriodoContable.ABIERTO,
  })
  estado: EstadoPeriodoContable;

  @Column({ type: 'uuid', nullable: true })
  cerradoPorId?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cerradoEn?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  asientoCierreId?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
