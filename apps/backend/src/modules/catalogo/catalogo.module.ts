import { Module } from '@nestjs/common';
import { CategoriasModule } from './categorias/categorias.module';
import { MarcasModule } from './marcas/marcas.module';
import { ProductosModule } from './productos/productos.module';
import { VariantesModule } from './variantes/variantes.module';

@Module({
  imports: [ProductosModule, VariantesModule, CategoriasModule, MarcasModule],
  exports: [ProductosModule, VariantesModule, CategoriasModule, MarcasModule],
})
export class CatalogoModule {}
