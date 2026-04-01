export class CreateOrdenCompraDto {
  numeroOrden: string;
  proveedorId: string;
  total: number;
  estado?: string;
  fechaEntregaEsperada?: Date;
}
