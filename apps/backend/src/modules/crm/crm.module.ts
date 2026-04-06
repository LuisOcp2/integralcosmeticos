import { Module } from '@nestjs/common';
import { ActividadesModule } from './actividades/actividades.module';
import { LeadsModule } from './leads/leads.module';
import { OportunidadesModule } from './oportunidades/oportunidades.module';

@Module({
  imports: [LeadsModule, OportunidadesModule, ActividadesModule],
})
export class CrmModule {}
