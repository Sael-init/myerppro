// src/app/dashboard/ventas/crear/notaSalidaHelper.ts
// Arma el payload de Nota de Salida a partir de los datos ya cargados en el
// Documento de Venta + Guía de Remisión, para no volver a pedirle nada al usuario.
import type { NotaSalidaPayload, NotaSalidaDetalle } from "@/types/notaSalida.types";
import type { CreateDocumentoVentaDetalleDTO } from "@/types/Documentoventa.types";
import type { DVentaFormData, GuiaFormData } from "./store";

// Código fijo de transacción para salidas generadas desde una Guía de Remisión.
const TRANSACCION_ID_SALIDA_VENTA = "SV";

interface BuildNotaSalidaPayloadParams {
  empresaId: string;
  cuentaUsuarioDefault: string;
  dVentaForm: DVentaFormData;
  guiaForm: GuiaFormData;
  detalles: CreateDocumentoVentaDetalleDTO[];
  /** Serie-número (o id) del Documento de Venta recién creado, si el backend lo devolvió */
  docReferenciaNumero?: string;
}

export function buildNotaSalidaPayload({
  empresaId,
  cuentaUsuarioDefault,
  dVentaForm,
  guiaForm,
  detalles,
  docReferenciaNumero,
}: BuildNotaSalidaPayloadParams): Partial<NotaSalidaPayload> {
  const detallesNota: NotaSalidaDetalle[] = (detalles as any[]).map((d, idx) => ({
    item:           d.item ?? idx + 1,
    bienId:         d.bienId ?? "",
    cantidad:       Number(d.cantidad ?? 0),
    precio:         Number(d.precio ?? 0),
    importe:        Number(d.importe ?? Number(d.cantidad ?? 0) * Number(d.precio ?? 0)),
    presentacionId: d.presentacionId ?? null,
    loteId:         null,
  }));

  return {
    transaccionId:         TRANSACCION_ID_SALIDA_VENTA,
    monedaId:              dVentaForm.monedaId,
    tipo_cambio:            Number(dVentaForm.tipoCambio) || 1,
    // Mismo tipo de documento comercial que se envía en el Documento de Venta (X028 Factura, X007 Boleta, etc.)
    tipodoccomercialId:     dVentaForm.tipodoccomercialId,
    doc_referencia:         "DOCUMENTO_VENTA",
    doc_referencia_numero:  docReferenciaNumero ?? "",
    // Mismo almacén de origen que se llenó en la Guía de Remisión
    almacenId:              guiaForm.almacenId,
    almacenDestinoId:       guiaForm.almacenDestinoId || "",
    estado:                 "REGISTRADO",
    cuentausuario:          dVentaForm.cuentausuarioId?.trim() || cuentaUsuarioDefault,
    observaciones:          guiaForm.observacion || "",
    empresaId,
    detalles:               detallesNota,
  };
}
