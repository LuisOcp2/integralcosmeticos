import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoInversionista {
  PERSONA_NATURAL = 'PERSONA_NATURAL',
  JURIDICA = 'JURIDICA',
}

export enum PerfilRiesgo {
  CONSERVADOR = 'CONSERVADOR',
  MODERADO = 'MODERADO',
  AGRESIVO = 'AGRESIVO',
}

@Entity('inversionistas')
export class Inversionista {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clienteId: string;

  @Column({ type: 'enum', enum: TipoInversionista })
  tipoInversionista: TipoInversionista;

  @Column({ type: 'enum', enum: PerfilRiesgo })
  perfilRiesgo: PerfilRiesgo;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  montoMaximoInversion: number | null;

  @Column({ type: 'boolean', default: false })
  documentosVerificados: boolean;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;
}
