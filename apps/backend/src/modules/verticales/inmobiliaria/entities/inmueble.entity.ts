import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoInmueble {
  APARTAMENTO = 'APARTAMENTO',
  CASA = 'CASA',
  LOCAL = 'LOCAL',
  OFICINA = 'OFICINA',
  BODEGA = 'BODEGA',
  LOTE = 'LOTE',
}

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  ARRENDADO = 'ARRENDADO',
  VENDIDO = 'VENDIDO',
  EN_OFERTA = 'EN_OFERTA',
}

export enum NegocioInmueble {
  VENTA = 'VENTA',
  ARRIENDO = 'ARRIENDO',
  AMBOS = 'AMBOS',
}

@Entity('inmuebles')
@Index(['codigo'], { unique: true })
export class Inmueble {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'enum', enum: TipoInmueble })
  tipo: TipoInmueble;

  @Column({ type: 'enum', enum: EstadoInmueble, default: EstadoInmueble.DISPONIBLE })
  estado: EstadoInmueble;

  @Column({ type: 'enum', enum: NegocioInmueble })
  negocio: NegocioInmueble;

  @Column({ type: 'text' })
  direccion: string;

  @Column({ type: 'varchar', length: 100 })
  ciudad: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barrio: string | null;

  @Column({ type: 'int', nullable: true })
  estrato: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  areaTotalM2: number;

  @Column({ type: 'int', nullable: true })
  habitaciones: number | null;

  @Column({ type: 'int', nullable: true })
  banos: number | null;

  @Column({ type: 'int', nullable: true })
  parqueaderos: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  valorVenta: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  valorArriendo: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  valorAdministracion: number | null;

  @Column({ type: 'uuid', nullable: true })
  propietarioId: string | null;

  @Column({ type: 'text', array: true, default: [] })
  fotos: string[];

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitud: number | null;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
