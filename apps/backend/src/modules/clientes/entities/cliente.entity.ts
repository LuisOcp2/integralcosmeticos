import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clientes')
@Index('idx_clientes_numero_documento', ['numeroDocumento'], { unique: true })
@Index('idx_clientes_email', ['email'], { unique: true })
@Index('idx_clientes_telefono', ['telefono'])
@Index('idx_clientes_celular', ['celular'])
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'tipo_documento',
    type: 'enum',
    enum: ['CC', 'NIT', 'CE', 'PAS', 'TI'],
    enumName: 'clientes_tipo_documento_enum',
  })
  tipoDocumento: 'CC' | 'NIT' | 'CE' | 'PAS' | 'TI';

  @Column({ name: 'documento', type: 'varchar', length: 20 })
  numeroDocumento: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellido?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  celular?: string | null;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento?: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  genero?: 'M' | 'F' | 'OTRO' | null;

  @Column({ type: 'text', nullable: true })
  direccion?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ciudad?: string | null;

  departamento?: string | null;

  @Column({ name: 'puntos_fidelidad', type: 'int', default: 0 })
  puntos: number;

  @Column({ name: 'total_compras_hist', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCompras: number;

  @Column({ name: 'num_compras', type: 'int', default: 0 })
  cantidadCompras: number;

  @Column({ name: 'ultima_compra', type: 'timestamptz', nullable: true })
  ultimaCompra?: Date | null;

  @Column({
    name: 'nivel_fidelidad',
    type: 'enum',
    enum: ['BRONCE', 'PLATA', 'ORO'],
    enumName: 'nivel_cliente',
    default: 'BRONCE',
  })
  nivelFidelidad: 'BRONCE' | 'PLATA' | 'ORO';

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'acepta_marketing', type: 'boolean', default: true })
  aceptaMarketing: boolean;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @Column({ name: 'sedeId', type: 'uuid', nullable: true })
  sedeRegistroId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
