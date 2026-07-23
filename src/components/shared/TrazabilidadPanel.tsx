"use client";

import { useState, useEffect } from "react";
import {
  IconX, IconRoute, IconLoader,
  IconFileText, IconShoppingCart, IconFileInvoice,
  IconUser, IconCalendar, IconCurrencyDollar, IconReceipt,
  IconCashBanknote,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import trazabilidadService, { TrazabilidadTabla } from "@/services/TrazabilidadService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tabla: TrazabilidadTabla;
  id: string | null;
  onClose: () => void;
}

type NodeType = "cotizacion" | "pedido" | "documento" | "anticipo";

interface SelectedNode {
  type: NodeType;
  id: string;
  data: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(fecha?: string) {
  if (!fecha) return undefined;
  const p = fecha.split("T")[0].split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtMonto(val?: number | null, simbolo = "S/") {
  if (val == null) return "—";
  return `${simbolo} ${Number(val).toFixed(2)}`;
}

function parseJsonField(val: unknown): any[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado?: string }) {
  const s = (estado ?? "").toUpperCase();
  const cl =
    s === "CERRADO"      ? "bg-slate-100 text-slate-600 border-slate-300"   :
    s === "COMPROMETIDO" ? "bg-amber-50  text-amber-700  border-amber-300"  :
    s === "REGISTRADO"   ? "bg-blue-50   text-blue-700   border-blue-300"   :
    s === "ANULADO"      ? "bg-red-50    text-red-600    border-red-300"    :
    s === "APROBADO"     ? "bg-green-50  text-green-700  border-green-300"  :
    s === "ACTIVO"       ? "bg-green-100 text-green-700  border-green-200"  :
    s === "PENDIENTE"    ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                           "bg-gray-50   text-gray-600   border-gray-300";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cl}`}>
      {estado ?? "—"}
    </span>
  );
}

function SunatBadge({ estado }: { estado?: string }) {
  const s = (estado ?? "").toUpperCase();
  const cl =
    s.includes("ACEPTAD") || s.includes("101")      ? "bg-green-50  text-green-700  border-green-200"  :
    s.includes("RECHAZAD") || s.includes("ANULAD")  ? "bg-red-50    text-red-600    border-red-200"    :
    s.includes("PENDIENTE")                          ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                       "bg-gray-50   text-gray-500   border-gray-200";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cl}`}>
      SUNAT: {estado ?? "—"}
    </span>
  );
}

// ─── Componentes de estilo idéntico a VentasViewModal ─────────────────────────

const InfoField = ({
  label, value, fullWidth = false, mono = false, highlight = false,
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
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className={`text-sm font-medium px-3 py-2 rounded-lg border ${
        highlight
          ? "bg-blue-50 text-blue-800 border-blue-200"
          : "bg-slate-50 text-slate-800 border-slate-200"
      } ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
};

const Section = ({ title, icon: Icon, children }: {
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

// ─── Modal de detalle (mismo diseño que VentasViewModal) ─────────────────────

function NodeDetailModal({ node, onClose }: { node: SelectedNode | null; onClose: () => void }) {
  if (!node) return null;
  const { type, data } = node;
  const simbolo = data.moneda_simbolo ?? "S/";
  const fmt     = (n?: number | null) => fmtMonto(n, simbolo);

  // Configuración del header según tipo
  const cfgMap = {
    anticipo: {
      gradient:  "from-emerald-50 to-teal-50",
      iconBg:    "bg-emerald-100",
      iconColor: "text-emerald-600",
      Icon:       IconCashBanknote,
      typeLabel:  "Anticipo Aplicado",
      title:      `${data.serie}-${data.numero}`,
      badges:     null as React.ReactNode,
      total:      data.importeAnticipo as number | null,
    },
    cotizacion: {
      gradient:  "from-amber-50 to-yellow-50",
      iconBg:    "bg-amber-100",
      iconColor: "text-amber-600",
      Icon:       IconFileText,
      typeLabel:  "Cotización",
      title:      data.cotizacion_numero ?? "—",
      badges:     <EstadoBadge estado={data.cotizacion_estado} />,
      total:      data.cotizacion_total as number | null,
    },
    pedido: {
      gradient:  "from-blue-50 to-sky-50",
      iconBg:    "bg-blue-100",
      iconColor: "text-blue-600",
      Icon:       IconShoppingCart,
      typeLabel:  "Pedido de Venta",
      title:      data.numero_correlativo ?? "—",
      badges:     <EstadoBadge estado={data.estado} />,
      total:      data.total as number | null,
    },
    documento: {
      gradient:  "from-indigo-50 to-violet-50",
      iconBg:    "bg-indigo-100",
      iconColor: "text-indigo-600",
      Icon:       IconFileInvoice,
      typeLabel:  data.tipodoc_descripcion ?? "Documento",
      title:      `${data.serie}-${data.numero}`,
      badges:     (
        <div className="flex flex-wrap gap-1.5">
          <EstadoBadge estado={data.estado} />
          {data.estado_documento_sunat && <SunatBadge estado={data.estado_documento_sunat} />}
        </div>
      ),
      total:      data.total as number | null,
    },
  };
  const cfg = cfgMap[type];

  // Totales
  const afecto   = type === "cotizacion" ? data.cotizacion_valorventa_afecto   : data.valorventa_afecto;
  const inafecto = type === "cotizacion" ? data.cotizacion_valorventa_inafecto  : (data.valorventa_exonerado ?? data.valorventa_inafecto);
  const igv      = type === "cotizacion" ? data.cotizacion_igv                  : data.igv;
  const total    = type === "cotizacion" ? data.cotizacion_total                : data.total;
  const saldo    = type === "cotizacion" ? data.cotizacion_saldo                : data.saldo;

  const detalles: any[] = data.detalles ?? [];
  // Solo los nodos "documento" traen anticipos aplicados (DOCUMENTO_VENTA_ANTICIPO_APLICADO).
  const anticipos: any[] = parseJsonField(data.anticipos) ?? [];

  const modalTitle =
    type === "cotizacion" ? "Detalle de Cotización" :
    type === "pedido"     ? "Detalle de Pedido de Venta" :
    type === "anticipo"   ? "Detalle del Anticipo Aplicado" :
                            "Detalle del Documento";

  return (
    <Modal isOpen onClose={onClose} title={modalTitle} size="xl">
      <div className="space-y-6">

        {/* Header con gradiente */}
        <div className={`flex items-center gap-4 p-4 bg-gradient-to-r ${cfg.gradient} rounded-xl border border-slate-100`}>
          <div className={`w-16 h-16 rounded-2xl ${cfg.iconBg} flex items-center justify-center ${cfg.iconColor} shrink-0`}>
            <cfg.Icon size={36} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">{cfg.typeLabel}</h3>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              <span className="text-sm font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {cfg.title}
              </span>
              {cfg.badges}
            </div>
          </div>
          <div className="text-right shrink-0 hidden md:block">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total</span>
            <span className="text-xl font-bold text-slate-800">{fmt(cfg.total)}</span>
          </div>
        </div>

        {/* Cliente (cotización y documento) */}
        {(type === "cotizacion" || type === "documento") && (
          <Section title="Cliente" icon={IconUser}>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Razón Social / Nombre" value={data.cliente_descripcion} fullWidth />
              <InfoField label="Documento de Identidad" value={data.cliente_num_docident} mono />
              {type === "cotizacion" && (
                <InfoField label="Dirección" value={data.cliente_direccion} fullWidth />
              )}
            </dl>
          </Section>
        )}

        {/* Información */}
        {(type !== "anticipo" || data.asientoContable || data.catalogo53Id) && (
        <Section title={
          type === "cotizacion" ? "Información de la Cotización" :
          type === "pedido"     ? "Información del Pedido" :
          type === "anticipo"   ? "Información del Anticipo" :
                                  "Información del Documento"
        } icon={IconCalendar}>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {type === "anticipo" && <>
              <InfoField label="Asiento Contable" value={data.asientoContable} mono />
              <InfoField label="Catálogo 53"      value={data.catalogo53Id} mono />
            </>}

            {type === "cotizacion" && <>
              <InfoField label="Fecha de Emisión"     value={fmtFecha(data.cotizacion_fecha_emision)} />
              <InfoField label="Fecha de Vencimiento" value={fmtFecha(data.cotizacion_fecha_vencimiento)} />
              <InfoField label="Tipo de Cambio"       value={data.cotizacion_tipo_cambio} mono />
              <InfoField label="Condición de Pago"    value={data.cotizacion_condicion_pago}
                highlight={data.cotizacion_condicion_pago === "CREDITO"} />
              <InfoField label="Trabajador"           value={data.trabajador_descripcion} />
              <InfoField label="Forma de Pago"        value={data.formapago_descripcion} />
            </>}

            {type === "pedido" && <>
              <InfoField label="Fecha de Emisión"     value={fmtFecha(data.fecha_emision)} />
              <InfoField label="Fecha de Entrega"     value={fmtFecha(data.fecha_entrega)} />
              <InfoField label="Fecha de Vencimiento" value={fmtFecha(data.fecha_vencimiento)} />
              <InfoField label="Tipo de Entrega"      value={data.tipoentrega_descripcion} />
              <InfoField label="Lugar de Despacho"    value={data.lugar_despacho} />
              <InfoField label="Forma de Pago"        value={data.formapago_descripcion} />
              <InfoField label="Estado Almacén"       value={data.estado_almacen} />
              <InfoField label="Facturación"          value={data.estadofacturacion_descripcion} />
              <InfoField label="Trabajador"
                value={`${data.trabajador_nombres ?? ""} ${data.trabajador_apellidos ?? ""}`.trim() || undefined} />
            </>}

            {type === "documento" && <>
              <InfoField label="Fecha de Emisión"     value={fmtFecha(data.fecha_emision)} />
              <InfoField label="Fecha de Vencimiento" value={fmtFecha(data.fecha_vencimiento)} />
              <InfoField label="Condición de Pago"    value={data.condicion_pago}
                highlight={data.condicion_pago === "CREDITO"} />
              <InfoField label="Punto de Venta"       value={data.puntoventa_descripcion} />
              <InfoField label="Sede"                 value={data.sede_descripcion} />
              <InfoField label="Estado Almacén"       value={data.estado_almacen} />
              <InfoField label="Trabajador"
                value={`${data.trabajador_nombres ?? ""} ${data.trabajador_apellidos ?? ""}`.trim() || undefined} />
            </>}
          </dl>
        </Section>
        )}

        {/* Totales */}
        {type === "anticipo" ? (
          <Section title="Totales del Anticipo" icon={IconCurrencyDollar}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Afecto</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(data.anticipoSaldoAfecto)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Exonerado</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(data.anticipoSaldoExonerado)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Base</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(data.importeBaseAnticipo)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">IGV</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(data.importeIgvAnticipo)}</span>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Importe Aplicado</span>
                <span className="text-lg font-bold text-emerald-800 font-mono">{fmt(data.importeAnticipo)}</span>
              </div>
            </div>
          </Section>
        ) : (
        <Section title="Totales" icon={IconCurrencyDollar}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {afecto != null && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Venta Afecto</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(afecto)}</span>
              </div>
            )}
            {inafecto != null && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Venta Exonerado</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(inafecto)}</span>
              </div>
            )}
            {igv != null && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">IGV (18%)</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{fmt(igv)}</span>
              </div>
            )}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-500 uppercase block">Total</span>
              <span className="text-lg font-bold text-blue-800 font-mono">{fmt(total)}</span>
            </div>
            {saldo != null && (
              <div className={`rounded-lg p-3 border ${
                Number(saldo) > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
              }`}>
                <span className={`text-[10px] font-bold uppercase block ${
                  Number(saldo) > 0 ? "text-orange-500" : "text-green-500"
                }`}>Saldo</span>
                <span className={`text-lg font-bold font-mono ${
                  Number(saldo) > 0 ? "text-orange-700" : "text-green-700"
                }`}>{fmt(saldo)}</span>
              </div>
            )}
          </div>
        </Section>
        )}

        {/* Tabla de ítems */}
        {detalles.length > 0 && (
          <Section title={`Detalles (${detalles.length} ítems)`} icon={IconReceipt}>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">#</th>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">Producto / Presentación</th>
                    <th className="px-3 py-2.5 text-center font-bold text-slate-600">Cant.</th>
                    <th className="px-3 py-2.5 text-center font-bold text-slate-600">IGV %</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Precio</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((det: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-400">{det.item ?? i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{det.bien_descripcion}</div>
                        {det.presentacion_descripcion?.trim() && (
                          <div className="text-[10px] text-slate-500">{det.presentacion_descripcion.trim()}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{Number(det.cantidad).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          det.afectoInafecto
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {det.afectoInafecto ? `${det.porcentajeIgv ?? 18}%` : "0%"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(det.precio)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                        {fmt(det.importe)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs uppercase">
                      Total:
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 font-mono">
                      {fmt(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        {/* Anticipos aplicados (solo nodos "documento") */}
        {anticipos.length > 0 && (
          <Section title={`Anticipos Aplicados (${anticipos.length})`} icon={IconCashBanknote}>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">Documento</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Saldo Afecto</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Saldo Exonerado</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Base</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">IGV</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Importe Aplicado</th>
                  </tr>
                </thead>
                <tbody>
                  {anticipos.map((a: any, i: number) => (
                    <tr key={`${a.serie}-${a.numero}-${i}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">{a.serie}-{a.numero}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(a.anticipoSaldoAfecto)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(a.anticipoSaldoExonerado)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">{fmt(a.importeBaseAnticipo)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">{fmt(a.importeIgvAnticipo)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{fmt(a.importeAnticipo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs uppercase">Total:</td>
                    <td colSpan={4}></td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 font-mono">
                      {fmt(anticipos.reduce((acc, a) => acc + (a.importeAnticipo ?? 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        {/* Botón cerrar */}
        <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-white pb-1">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <IconX size={18} /> Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Flecha ondulada ──────────────────────────────────────────────────────────

function CurvedArrow() {
  return (
    <div className="flex items-center self-center shrink-0 px-4">
      <svg width="84" height="48" viewBox="0 0 84 48" fill="none">
        <path
          d="M 4 24 C 16 4, 28 44, 40 24 S 66 24, 76 24"
          stroke="#818cf8"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 69 17 L 76 24 L 69 31"
          stroke="#818cf8"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function CotizacionCard({ data, onClick, isSelected }: { data: any; onClick: () => void; isSelected: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 w-[148px] shrink-0 cursor-pointer transition-all
        ${isSelected
          ? "border-amber-400 bg-amber-100 shadow-md ring-2 ring-amber-300 ring-offset-1"
          : "border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-sm"}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? "bg-amber-200" : "bg-amber-100"}`}>
        <IconFileText size={22} className="text-amber-600" />
      </div>
      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Cotización</span>
      <span className="font-bold text-xs text-slate-800 text-center font-mono leading-tight break-all">
        {data.cotizacion_numero ?? data.cotizacionventaId}
      </span>
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-[10px] text-slate-500">{fmtFecha(data.cotizacion_fecha_emision) ?? "—"}</span>
        <span className="text-[11px] font-semibold text-slate-700">
          {fmtMonto(data.cotizacion_total, data.moneda_simbolo)}
        </span>
        <EstadoBadge estado={data.cotizacion_estado} />
      </div>
    </div>
  );
}

function PedidoCard({ pedido, onClick, isSelected }: { pedido: any; onClick: () => void; isSelected: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 w-[148px] shrink-0 cursor-pointer transition-all
        ${isSelected
          ? "border-blue-400 bg-blue-100 shadow-md ring-2 ring-blue-300 ring-offset-1"
          : "border-blue-200 bg-blue-50 hover:border-blue-400 hover:shadow-sm"}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? "bg-blue-200" : "bg-blue-100"}`}>
        <IconShoppingCart size={22} className="text-blue-600" />
      </div>
      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Pedido</span>
      <span className="font-bold text-xs text-slate-800 text-center font-mono leading-tight break-all">
        {pedido.numero_correlativo ?? pedido.pedidoventaId}
      </span>
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-[10px] text-slate-500">{fmtFecha(pedido.fecha_emision) ?? "—"}</span>
        <span className="text-[11px] font-semibold text-slate-700">
          {fmtMonto(pedido.total, pedido.moneda_simbolo)}
        </span>
        <EstadoBadge estado={pedido.estado} />
      </div>
    </div>
  );
}

function DocumentoCard({ doc, onClick, isSelected }: { doc: any; onClick: () => void; isSelected: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 w-[148px] shrink-0 cursor-pointer transition-all
        ${isSelected
          ? "border-indigo-400 bg-indigo-100 shadow-md ring-2 ring-indigo-300 ring-offset-1"
          : "border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:shadow-sm"}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? "bg-indigo-200" : "bg-indigo-100"}`}>
        <IconFileInvoice size={22} className="text-indigo-600" />
      </div>
      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide text-center leading-tight">
        {doc.tipodoc_descripcion ?? "Documento"}
      </span>
      <span className="font-bold text-xs text-slate-800 text-center font-mono leading-tight">
        {doc.serie}-{doc.numero}
      </span>
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-[10px] text-slate-500">{fmtFecha(doc.fecha_emision) ?? "—"}</span>
        <span className="text-[11px] font-semibold text-slate-700">
          {fmtMonto(doc.total, doc.moneda_simbolo)}
        </span>
        <EstadoBadge estado={doc.estado} />
      </div>
    </div>
  );
}

function AnticipoCard({ anticipo, onClick, isSelected }: { anticipo: any; onClick: () => void; isSelected: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 w-[148px] shrink-0 cursor-pointer transition-all
        ${isSelected
          ? "border-emerald-400 bg-emerald-100 shadow-md ring-2 ring-emerald-300 ring-offset-1"
          : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:shadow-sm"}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? "bg-emerald-200" : "bg-emerald-100"}`}>
        <IconCashBanknote size={22} className="text-emerald-600" />
      </div>
      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Anticipo</span>
      <span className="font-bold text-xs text-slate-800 text-center font-mono leading-tight">
        {anticipo.serie}-{anticipo.numero}
      </span>
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-[11px] font-semibold text-slate-700">
          {fmtMonto(anticipo.importeAnticipo, anticipo.moneda_simbolo)}
        </span>
      </div>
    </div>
  );
}

// Documento + (si tiene anticipos aplicados) su columna de AnticipoCard al costado,
// unidos por una flecha — mismo patrón visual que pedido → documentos.
function DocumentoWithAnticipos({ d, monedaSimbolo, selectedId, onSelect }: {
  d: any;
  monedaSimbolo?: string;
  selectedId: string | null;
  onSelect: (node: SelectedNode) => void;
}) {
  const docData: any     = { ...d, moneda_simbolo: monedaSimbolo };
  const docAnticipos: any[] = parseJsonField(d.anticipos) ?? [];
  return (
    <div className="flex items-center gap-0">
      <DocumentoCard
        doc={docData}
        isSelected={selectedId === d.documentoventaId}
        onClick={() => onSelect({ type: "documento", id: d.documentoventaId, data: docData })}
      />
      {docAnticipos.length > 0 && (
        <>
          <CurvedArrow />
          <div className="flex flex-col gap-3">
            {docAnticipos.map((a: any, k: number) => {
              const antId   = `${d.documentoventaId ?? ""}-ant-${a.serie}-${a.numero}-${k}`;
              const antData = { ...a, moneda_simbolo: monedaSimbolo };
              return (
                <AnticipoCard
                  key={antId}
                  anticipo={antData}
                  isSelected={selectedId === antId}
                  onClick={() => onSelect({ type: "anticipo", id: antId, data: antData })}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Vista en cadena ──────────────────────────────────────────────────────────

function ChainView({ data, selectedId, onSelect }: {
  data: any;
  selectedId: string | null;
  onSelect: (node: SelectedNode) => void;
}) {
  const hasCotizacion = !!data.cotizacionventaId;
  const hasPedidoRoot = !!data.pedidoventaId && !hasCotizacion;

  if (hasCotizacion) {
    const pedidos = parseJsonField(data.pedidos) ?? [];
    return (
      <div className="flex items-center gap-0">
        <div className="self-center">
          <CotizacionCard
            data={data}
            isSelected={selectedId === data.cotizacionventaId}
            onClick={() => onSelect({ type: "cotizacion", id: data.cotizacionventaId, data })}
          />
        </div>
        {pedidos.length > 0 && (
          <>
            <CurvedArrow />
            <div className="flex flex-col gap-6">
              {pedidos.map((p: any, i: number) => {
                const docs       = parseJsonField(p.documentos) ?? [];
                const pedidoData = { ...p, moneda_simbolo: data.moneda_simbolo };
                return (
                  <div key={p.pedidoventaId ?? i} className="flex items-center gap-0">
                    <PedidoCard
                      pedido={pedidoData}
                      isSelected={selectedId === p.pedidoventaId}
                      onClick={() => onSelect({ type: "pedido", id: p.pedidoventaId, data: pedidoData })}
                    />
                    {docs.length > 0 && (
                      <>
                        <CurvedArrow />
                        <div className="flex flex-col gap-3">
                          {docs.map((d: any, j: number) => (
                            <DocumentoWithAnticipos
                              key={d.documentoventaId ?? j}
                              d={d}
                              monedaSimbolo={data.moneda_simbolo}
                              selectedId={selectedId}
                              onSelect={onSelect}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  if (hasPedidoRoot) {
    const docs = parseJsonField(data.documentos) ?? [];
    return (
      <div className="flex items-center gap-0">
        <PedidoCard
          pedido={data}
          isSelected={selectedId === data.pedidoventaId}
          onClick={() => onSelect({ type: "pedido", id: data.pedidoventaId, data })}
        />
        {docs.length > 0 && (
          <>
            <CurvedArrow />
            <div className="flex flex-col gap-3">
              {docs.map((d: any, i: number) => (
                <DocumentoWithAnticipos
                  key={d.documentoventaId ?? i}
                  d={d}
                  monedaSimbolo={data.moneda_simbolo}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <DocumentoWithAnticipos
      d={data}
      monedaSimbolo={data.moneda_simbolo}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

// ─── Panel principal (exportado) ──────────────────────────────────────────────

export default function TrazabilidadPanel({ tabla, id, onClose }: Props) {
  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  useEffect(() => {
    if (!id) return;
    setData(null);
    setSelectedNode(null);
    setLoading(true);
    trazabilidadService
      .get(tabla, id)
      .then(setData)
      .catch((err: any) => {
        toast.error(err.message ?? "Error al cargar trazabilidad");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [tabla, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Panel de trazabilidad */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <IconRoute size={15} className="text-indigo-600" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Trazabilidad</span>
            {!loading && data && (
              <span className="text-xs text-slate-400">— haz clic en una tarjeta para ver el detalle</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            title="Cerrar"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-x-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <IconLoader className="animate-spin text-indigo-500 mb-3" size={32} />
              <p className="text-slate-400 text-xs">Cargando trazabilidad...</p>
            </div>
          ) : !data ? (
            <p className="text-center text-slate-400 py-8 text-sm">Sin datos</p>
          ) : (
            <ChainView
              data={data}
              selectedId={selectedNode?.id ?? null}
              onSelect={(node) =>
                setSelectedNode((prev) => prev?.id === node.id ? null : node)
              }
            />
          )}
        </div>
      </div>

      {/* Modal de detalle — se monta sobre todo (z-[100] del Modal) */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </>
  );
}
