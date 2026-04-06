import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Activo } from './activo.entity';

@Entity('activos_depreciaciones')
@Index('idx_activos_depreciacion_periodo', ['activoId', 'anio', 'mes'], { unique: true })
export class DepreciacionActivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  activoId: string;

  @ManyToOne(() => Activo, (activo) => activo.depreciaciones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activoId' })
  activo: Activo;

  @Column({ type: 'int' })
  anio: number;

  @Column({ type: 'int' })
  mes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoDepreciacion: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valorLibros: number;
}
