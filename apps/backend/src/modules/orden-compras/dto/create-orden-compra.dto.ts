export class CreateOrdenCompraDto {
  numeroOrden: string;
  proveedorId: number;
  total: number;
  estado?: string;
  fechaEntregaEsperada?: Date;
}
