import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column({ type: 'uuid' })
  varianteId: string;

  @Column({ type: 'uuid', nullable: true })
  sedeOrigenId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  sedeDestinoId?: string | null;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'stock_anterior', type: 'int' })
  cantidadAnterior: number;

  @Column({ name: 'stock_nuevo', type: 'int' })
  cantidadNueva: number;

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;

  @Column({ name: 'numero_doc', type: 'varchar', length: 100, nullable: true })
  referencia?: string | null;

  @Column({ name: 'usuarioId', type: 'uuid' })
  realizadoPorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
