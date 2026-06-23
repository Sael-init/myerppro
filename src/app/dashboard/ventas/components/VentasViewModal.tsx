// src/app/dashboard/documentos-venta/components/VentasViewModal.tsx
"use client";

import { useState, useEffect } from "react";
import documentoVentaService from "@/services/DocumentoventaService";
import Modal from "@/components/ui/Modal";
import {
  IconLoader,
  IconX,
  IconFileText,
  IconUser,
  IconCalendar,
  IconCurrencyDollar,
  IconFileInvoice,
  IconInfoCircle,
  IconShieldCheck,
  IconReceipt,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { DocumentoVenta } from "@/types/Documentoventa.types";

// =====================================================
// PROPS
// =====================================================
interface Props {
  documentoventaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// =====================================================
// CAMPO INFO REUTILIZABLE
// =====================================================
const InfoField = ({
  label,
  value,
  fullWidth = false,
  mono = false,
  highlight = false,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  mono?: boolean;
  highlight?: boolean;
}) => {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">
        {label}
      </dt>
      <dd
        className={`text-sm font-medium px-3 py-2 rounded-lg border ${
          highlight
            ? "bg-blue-50 text-blue-800 border-blue-200"
            : "bg-slate-50 text-slate-800 border-slate-200"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
};

// =====================================================
// BADGE ESTADO
// =====================================================
const EstadoBadge = ({ estado }: { estado: string }) => {
  let colorClass = "bg-gray-50 text-gray-600 border-gray-200";

  if (estado === "ACTIVO") {
    colorClass = "bg-green-100 text-green-700 border-green-200";
  } else if (estado === "ANULADO") {
    colorClass = "bg-red-50 text-red-600 border-red-100";
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}
    >
      {estado}
    </span>
  );
};

const SunatBadge = ({ estado }: { estado?: string }) => {
  const estadoSunat = estado || "PENDIENTE";
  let colorClass = "bg-gray-50 text-gray-600 border-gray-200";

  if (estadoSunat.includes("101") || estadoSunat.includes("ACEPTAD")) {
    colorClass = "bg-green-50 text-green-700 border-green-200";
  } else if (estadoSunat.includes("108") || estadoSunat.includes("ANULAD")) {
    colorClass = "bg-red-50 text-red-600 border-red-200";
  } else if (estadoSunat.includes("PENDIENTE")) {
    colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
  } else if (estadoSunat.includes("RECHAZAD")) {
    colorClass = "bg-red-50 text-red-600 border-red-200";
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}
    >
      SUNAT: {estadoSunat}
    </span>
  );
};

// =====================================================
// SECCIÓN CON TÍTULO
// =====================================================
const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon size={16} />
      </div>
      {title}
    </h4>
    {children}
  </div>
);

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function DocumentoVentaViewModal({
  documentoventaId,
  isOpen,
  onClose,
}: Props) {
  const [documento, setDocumento] = useState<DocumentoVenta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentoventaId) {
      setLoading(true);
      documentoVentaService
        .getById(documentoventaId)
        .then((res) => {
          setDocumento(res);
        })
        .catch((err) => {
          console.error("Error cargando documento de venta:", err);
          toast.error("Error al cargar el documento de venta");
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDocumento(null);
    }
  }, [isOpen, documentoventaId, onClose]);


  // ── Helpers ─────────────────────────────────────────
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Mapea monedaId ("001","002",...) o abreviatura ("D","S","E") a código ISO
  const getIsoCurrency = (monedaId?: string, abreviatura?: string): string => {
    const id    = (monedaId    ?? "").toUpperCase();
    const abrev = (abreviatura ?? "").toUpperCase();
    if (id === "002" || id === "USD" || abrev === "D" || abrev === "USD") return "USD";
    if (id === "003" || id === "EUR" || abrev === "E" || abrev === "EUR") return "EUR";
    return "PEN";
  };

  const formatearMoneda = (monto?: number, monedaId?: string) => {
    if (monto === null || monto === undefined) return "-";
    const currency = getIsoCurrency(
      monedaId ?? documento?.monedaId,
      documento?.moneda?.abreviatura
    );
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(monto);
  };

  const monedaSimbolo = (() => {
    const currency = getIsoCurrency(documento?.monedaId, documento?.moneda?.abreviatura);
    if (currency === "USD") return "US$";
    if (currency === "EUR") return "€";
    return "S/";
  })();

  const isNotaCredito = !!(documento?.motivoelectronicoId?.trim());

  const motivoConcepto = (() => {
    if (!documento?.motivoelectronicoId) return null;
    const id = documento.motivoelectronicoId.trim();
    const concepto = documento.motivoNcNd?.concepto;
    return concepto ? `${id} – ${concepto}` : id;
  })();

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del Documento de Venta"
      size="xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">
            Cargando documento de venta...
          </p>
        </div>
      ) : documento ? (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
          {/* ═══════════════════════════════════════════
              HEADER DEL DOCUMENTO
             ═══════════════════════════════════════════ */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconFileText size={36} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800">
                {documento.tipoDocumentoComercial?.descripcion ||
                  documento.tipodoccomercialId}
              </h3>
              <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                <span className="text-sm font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {documento.serie}-{documento.numero}
                </span>
                <EstadoBadge estado={documento.estado} />
                <SunatBadge estado={documento.estado_documento_sunat} />
              </div>
            </div>
            <div className="text-right shrink-0 hidden md:block">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Total
              </span>
              <span className="text-xl font-bold text-slate-800">
                {formatearMoneda(documento.total, documento.monedaId)}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              CLIENTE
             ═══════════════════════════════════════════ */}
          <Section title="Cliente" icon={IconUser}>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField
                label="Razón Social / Nombre"
                value={documento.cliente?.descripcion}
                fullWidth
              />
              <InfoField
                label="Documento de Identidad"
                value={documento.cliente?.numDocIdent}
                mono
              />
              <InfoField label="ID Cliente" value={documento.clienteId} mono />
            </dl>
          </Section>

          {/* ═══════════════════════════════════════════
              INFORMACIÓN DEL DOCUMENTO
             ═══════════════════════════════════════════ */}
          <Section title="Información del Documento" icon={IconCalendar}>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoField
                label="Fecha de Emisión"
                value={formatearFecha(documento.fecha_emision)}
              />
              <InfoField
                label="Fecha del Documento"
                value={formatearFecha(documento.fecha_doc)}
              />
              {documento.fecha_vencimiento && (
                <InfoField
                  label="Fecha de Vencimiento"
                  value={formatearFecha(documento.fecha_vencimiento)}
                />
              )}
              <InfoField
                label="Moneda"
                value={`${documento.moneda?.descripcion || documento.monedaId} (${documento.moneda?.abreviatura || documento.monedaId})`}
              />
              <InfoField
                label="Tipo de Cambio"
                value={documento.tipo_cambio?.toFixed(3)}
                mono
              />
              <InfoField
                label="Condición de Pago"
                value={documento.condicion_pago}
                highlight={documento.condicion_pago === "CREDITO"}
              />
              <InfoField
                label="Punto de Venta"
                value={
                  documento.puntoVenta?.descripcion || documento.puntoventaId
                }
              />
              <InfoField
                label="Sede"
                value={documento.sede?.descripcion}
              />
              {documento.trabajador && (
                <InfoField
                  label="Trabajador"
                  value={`${documento.trabajador.nombres} ${documento.trabajador.apellidos}`}
                />
              )}
              {documento.formaPago && (
                <InfoField
                  label="Forma de Pago"
                  value={documento.formaPago.descripcion}
                />
              )}
              {documento.tipoPago && (
                <InfoField
                  label="Tipo de Pago"
                  value={documento.tipoPago.descripcion}
                />
              )}
              {documento.ordencompra_numero && (
                <InfoField
                  label="Orden de Compra"
                  value={documento.ordencompra_numero}
                  mono
                />
              )}
              {motivoConcepto && (
                <InfoField
                  label="Motivo Nota Crédito"
                  value={motivoConcepto}
                  highlight
                  fullWidth
                />
              )}
            </dl>
          </Section>

          {/* ═══════════════════════════════════════════
              TOTALES
             ═══════════════════════════════════════════ */}
          <Section title="Totales" icon={IconCurrencyDollar}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Valor Venta Afecto
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formatearMoneda(documento.valorventa_afecto, documento.monedaId)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Valor Venta Inafecto
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formatearMoneda(documento.valorventa_inafecto, documento.monedaId)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  IGV (18%)
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formatearMoneda(documento.igv, documento.monedaId)}
                </span>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-500 uppercase block">
                  Total
                </span>
                <span className="text-lg font-bold text-blue-800 font-mono">
                  {formatearMoneda(documento.total, documento.monedaId)}
                </span>
              </div>
              <div
                className={`rounded-lg p-3 border ${
                  documento.saldo > 0
                    ? "bg-orange-50 border-orange-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase block ${
                    documento.saldo > 0 ? "text-orange-500" : "text-green-500"
                  }`}
                >
                  Saldo
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    documento.saldo > 0 ? "text-orange-700" : "text-green-700"
                  }`}
                >
                  {formatearMoneda(documento.saldo, documento.monedaId)}
                </span>
              </div>
              {documento.valorventa_gratuito != null &&
                documento.valorventa_gratuito > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-500 uppercase block">
                      V. Gratuito
                    </span>
                    <span className="text-sm font-bold text-purple-800 font-mono">
                      {formatearMoneda(
                        documento.valorventa_gratuito,
                        documento.monedaId
                      )}
                    </span>
                  </div>
                )}
            </div>

            {/* Detracción */}
            {documento.detraccion && (
              <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-600 uppercase block mb-2">
                  Detracción
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {documento.detraccion_porcentaje != null && (
                    <div>
                      <span className="text-[10px] text-amber-500">
                        Porcentaje
                      </span>
                      <span className="block font-bold text-amber-800">
                        {documento.detraccion_porcentaje}%
                      </span>
                    </div>
                  )}
                  {documento.detraccion_monto != null && (
                    <div>
                      <span className="text-[10px] text-amber-500">Monto</span>
                      <span className="block font-bold text-amber-800 font-mono">
                        {formatearMoneda(
                          documento.detraccion_monto,
                          documento.monedaId
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total en letras */}
            {documento.total_letras && (
              <div className="mt-3">
                <InfoField
                  label="Total en Letras"
                  value={documento.total_letras}
                  fullWidth
                />
              </div>
            )}
          </Section>

          {/* ═══════════════════════════════════════════
              DETALLES DEL DOCUMENTO
             ═══════════════════════════════════════════ */}
          {documento.detalles && documento.detalles.length > 0 && (
            <Section title={`Detalles (${documento.detalles.length} items)`} icon={IconReceipt}>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-bold text-slate-600">
                        #
                      </th>
                      <th className="px-3 py-2.5 text-left font-bold text-slate-600">
                        Producto / Presentación
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600">
                        Cant.
                      </th>
                      {isNotaCredito && (
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                          Cant. pendiente nota entrada
                        </th>
                      )}
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600">
                        Saldo
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-600">
                        Precio
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-600">
                        P. Sin IGV
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600">
                        IGV %
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-600">
                        Desc.
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-600">
                        Importe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documento.detalles.map((detalle) => (
                      <tr
                        key={detalle.item}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-slate-400">
                          {detalle.item}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">
                            {detalle.bien?.descripcion || detalle.bienId}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {detalle.presentacion?.descripcion ||
                              detalle.presentacionId}
                          </div>
                          {detalle.observacion && (
                            <div className="text-[10px] text-blue-500 italic mt-0.5">
                              {detalle.observacion}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {detalle.cantidad?.toFixed(2)}
                        </td>
                        {isNotaCredito && (
                          <td className="px-3 py-2 text-center font-mono">
                            {detalle.saldoTemporal != null
                              ? Number(detalle.saldoTemporal).toFixed(2)
                              : "-"}
                          </td>
                        )}
                        <td className="px-3 py-2 text-center font-mono">
                          {(detalle as any).saldoCantidad != null
                            ? Number((detalle as any).saldoCantidad).toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {monedaSimbolo}{" "}
                          {detalle.precio?.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {monedaSimbolo}{" "}
                          {detalle.precioSinIgv?.toFixed(2) || "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              detalle.afectoInafecto
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {detalle.afectoInafecto
                              ? `${detalle.porcentajeIgv || 18}%`
                              : "0%"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {detalle.descuentoProducto > 0
                            ? `${monedaSimbolo} ${detalle.descuentoProducto.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                          {formatearMoneda(detalle.importe, documento.monedaId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td
                        colSpan={isNotaCredito ? 9 : 8}
                        className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs uppercase"
                      >
                        Total:
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-800 font-mono">
                        {formatearMoneda(documento.total, documento.monedaId)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          )}

          {/* ═══════════════════════════════════════════
              OBSERVACIONES
             ═══════════════════════════════════════════ */}
          {documento.observacion && (
            <Section title="Observaciones" icon={IconInfoCircle}>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {documento.observacion}
              </p>
            </Section>
          )}

          {/* ═══════════════════════════════════════════
              INFORMACIÓN SUNAT / BOLETEO
             ═══════════════════════════════════════════ */}
          {(documento.identificador_boleteo ||
            documento.estado_boleteo ||
            documento.estado_documento_sunat) && (
            <Section title="SUNAT / Boleteo" icon={IconShieldCheck}>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoField
                  label="Estado Documento SUNAT"
                  value={documento.estado_documento_sunat}
                />
                {documento.identificador_boleteo && (
                  <InfoField
                    label="Identificador Boleteo"
                    value={documento.identificador_boleteo}
                    mono
                  />
                )}
                {documento.estado_boleteo && (
                  <InfoField
                    label="Estado Boleteo"
                    value={documento.estado_boleteo}
                  />
                )}
                {documento.codigo && (
                  <InfoField
                    label="Código"
                    value={documento.codigo}
                    mono
                  />
                )}
                {documento.asiento_contable && (
                  <InfoField
                    label="Asiento Contable"
                    value={documento.asiento_contable}
                    mono
                  />
                )}
              </dl>
            </Section>
          )}

          {/* ═══════════════════════════════════════════
              INFORMACIÓN DEL SISTEMA
             ═══════════════════════════════════════════ */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <IconFileInvoice size={14} />
              Información del Sistema
            </h4>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-slate-500 font-semibold">ID Documento</dt>
                <dd className="text-slate-700 font-mono">
                  {documento.documentoventaId}
                </dd>
              </div>
              {documento.codigo_auditoria && (
                <div>
                  <dt className="text-slate-500 font-semibold">
                    Código Auditoría
                  </dt>
                  <dd className="text-slate-700 font-mono">
                    {documento.codigo_auditoria}
                  </dd>
                </div>
              )}
              {documento.cuentaUsuario?.usuario && (
                <div>
                  <dt className="text-slate-500 font-semibold">Usuario</dt>
                  <dd className="text-slate-700">
                    {documento.cuentaUsuario.usuario}
                  </dd>
                </div>
              )}
              {documento.fecha_anulado && (
                <div>
                  <dt className="text-slate-500 font-semibold">
                    Fecha Anulado
                  </dt>
                  <dd className="text-red-600 font-mono">
                    {formatearFecha(documento.fecha_anulado)}
                  </dd>
                </div>
              )}
              {documento.documentoventa_referenciaId && (
                <div>
                  <dt className="text-slate-500 font-semibold">
                    Doc. Referencia
                  </dt>
                  <dd className="text-slate-700 font-mono">
                    {documento.documentoventa_referenciaId}
                  </dd>
                </div>
              )}
              {documento.estado_almacen && (
                <div>
                  <dt className="text-slate-500 font-semibold">
                    Estado Almacén
                  </dt>
                  <dd className="text-slate-700">{documento.estado_almacen}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ═══════════════════════════════════════════
              BOTÓN CERRAR
             ═══════════════════════════════════════════ */}
          <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-white pb-1">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <IconX size={18} /> Cerrar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400">
          No se pudo cargar la información del documento de venta
        </div>
      )}
    </Modal>
  );
}