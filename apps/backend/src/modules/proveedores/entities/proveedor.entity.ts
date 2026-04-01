import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrdenCompra } from '../../orden-compras/entities/orden-compra.entity';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: string; // UUID

  @Column({ name: 'codigo', unique: true })
  codigo: string;

  @Column({ name: 'razon_social' })
  razonSocial: string;

  @Column({ name: 'nombre_comercial', nullable: true })
  nombreComercial?: string;

  @Column({ name: 'nit', unique: true, nullable: true })
  numeroDocumentoLegal?: string;

  @Column({ name: 'tipo_documento', nullable: true })
  tipoDocumento?: string;

  @Column({ name: 'email', nullable: true })
  email?: string;

  @Column({ name: 'telefono', nullable: true })
  telefono?: string;

  @Column({ name: 'celular', nullable: true })
  celular?: string;

  @Column({ name: 'direccion', nullable: true })
  direccion?: string;

  @Column({ name: 'ciudad', nullable: true })
  ciudad?: string;

  @Column({ name: 'departamento', nullable: true })
  departamento?: string;

  @Column({ name: 'pais', default: 'Colombia' })
  pais: string;

  @Column({ name: 'contacto_nombre', nullable: true })
  contactoNombre?: string;

  @Column({ name: 'contacto_cargo', nullable: true })
  contactoCargo?: string;

  @Column({ name: 'contacto_telefono', nullable: true })
  contactoTelefono?: string;

  @Column({ name: 'sitio_web', nullable: true })
  sitioWeb?: string;

  @Column({ name: 'condiciones_pago', nullable: true })
  condicionesPago?: string;

  @Column({ name: 'descuento_proveedor', nullable: true, default: 0 })
  descuentoProveedor?: number;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  @Column({ name: 'observaciones', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'createdAt' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  actualizadoEn: Date;

  @OneToMany(() => OrdenCompra, (ordenCompra) => ordenCompra.proveedor)
  ordenesCompra: OrdenCompra[];
}
