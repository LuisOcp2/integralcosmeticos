import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';

@Entity('movimiento_inventarios')
export class MovimientoInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column('uuid')
  varianteId: string;

  @Column('uuid')
  sedeId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column('uuid', { nullable: true })
  sedeDestinoId?: string | null;

  @Column('uuid')
  usuarioId: string;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
