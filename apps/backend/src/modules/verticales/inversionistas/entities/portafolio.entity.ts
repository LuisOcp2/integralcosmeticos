import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portafolios')
@Index(['inversionistaId'])
export class Portafolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inversionistaId: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
