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

  @Column({ name: 'numero_doc', type: 'varchar', length: 40, unique: true })
  numeroDoc: string;

  @Column({ name: 'varianteId', type: 'uuid' })
  varianteId: string;

  @Column({ name: 'productoId', type: 'uuid' })
  productoId: string;

  @Column({ name: 'sedeOrigenId', type: 'uuid', nullable: true })
  sedeId?: string | null;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'sedeDestinoId', type: 'uuid', nullable: true })
  sedeDestinoId?: string | null;

  @Column({ name: 'usuarioId', type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ name: 'stock_anterior', type: 'int', default: 0 })
  stockAnterior: number;

  @Column({ name: 'stock_nuevo', type: 'int', default: 0 })
  stockNuevo: number;

  @CreateDateColumn()
  createdAt: Date;
}
