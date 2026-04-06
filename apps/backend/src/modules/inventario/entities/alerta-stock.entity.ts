import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoAlertaStock {
  BAJO_MINIMO = 'BAJO_MINIMO',
  SIN_STOCK = 'SIN_STOCK',
  SOBRE_MAXIMO = 'SOBRE_MAXIMO',
}

@Entity('alertas_stock')
export class AlertaStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  varianteId: string;

  @Column('uuid')
  sedeId: string;

  @Column({ type: 'enum', enum: TipoAlertaStock })
  tipo: TipoAlertaStock;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ default: false })
  atendida: boolean;

  @Column({ type: 'timestamp', nullable: true })
  atendidaEn?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  atendidaPorId?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
