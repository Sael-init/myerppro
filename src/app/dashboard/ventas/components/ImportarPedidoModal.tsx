"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  IconX,
  IconSearch,
  IconLoader,
  IconFileImport,
  IconChevronRight,
  IconAlertCircle,
  IconInbox,
} from "@tabler/icons-react";
import documentoVentaService from "@/services/DocumentoventaService";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de fecha
// ─────────────────────────────────────────────────────────────────────────────

/** "2026-03-11T16:24:42.143" o "2026-03-11" → "11/03/2026" (solo para la tabla) */
function isoToDisplay(iso?: string): string {
  if (!iso) return "—";
  const part = iso.split("T")[0];
  const [y, m, d] = part.split("-");
  return `${d}/${m}/${y}`;
}

function toIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIso(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// DateInput — calendario nativo, almacena/recibe YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────

interface DateInputProps {
  label: string;
  value: string;            // yyyy-MM-dd
  onChange: (iso: string) => void;
}

function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300 transition-colors cursor-pointer"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos — mapeados al response real del SP
// ─────────────────────────────────────────────────────────────────────────────

export interface PedidoDetalleRow {
  item: number;
  bienId: string;
  bien_descripcion?: string;
  presentacionId: string;
  presentacion_descripcion?: string;
  cantidad: number;
  conversion_total?: number;
  saldo_cantidad?: number;
  precio: number;
  precio_sin_igv?: number;
  importe: number;
  descuento_producto?: number;
  afecto_inafecto?: boolean;
  observacion?: string;
}

export interface PedidoVentaRow {
  pedidoventaId:          string;
  numero_correlativo?:    string;
  fecha_emision?:         string;
  fecha_entrega?:         string;
  fecha_vencimiento?:     string;
  condicion_pago?:        string;
  estado?:                string;
  tipo_cambio?:           number;
  valorventa_afecto?:     number;
  valorventa_inafecto?:   number;
  igv?:                   number;
  total?:                 number;
  observacion?:           string;
  // Cliente
  clienteId?:             string;
  cliente_descripcion?:   string;
  cliente_num_docident?:  string;
  cliente_docidentId?:    string;
  cliente_direccion?:     string;
  cliente_referencia?:    string;
  // Trabajador
  trabajadorId?:          string;
  trabajador_nombres?:    string;
  trabajador_apellidos?:  string;
  // Moneda
  monedaId?:              string;
  moneda_descripcion?:    string;
  moneda_simbolo?:        string;
  // Forma de pago
  formaspagoId?:          string;
  formapago_descripcion?: string;
  // Otros
  puntoventaId?:          string;
  cuentausuarioId?:       string;
  lugar_despacho?:        string;
  estado_almacen?:        string;
  // Detalles
  detalle?: PedidoDetalleRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ImportarPedidoModalProps {
  empresaId: string;
  onImportar: (pedido: PedidoVentaRow) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

export default function ImportarPedidoModal({
  empresaId,
  onImportar,
  onClose,
}: ImportarPedidoModalProps) {
  const today        = toIso(new Date());
  const defaultDesde = daysAgo(5);

  const [fechaInicio, setFechaInicio] = useState(defaultDesde);
  const [fechaFin,    setFechaFin]    = useState(today);
  const [pedidos,     setPedidos]     = useState<PedidoVentaRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [busqueda,    setBusqueda]    = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPedidos = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await documentoVentaService.jalarPedidoVenta(
        empresaId,
        fechaInicio,
        fechaFin
      );
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? "Error al cargar pedidos");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, fechaInicio, fechaFin]);

  useEffect(() => { fetchPedidos(); }, []);

  // ── Filtro local ───────────────────────────────────────────────────────────

  const tieneSaldoDisponible = (p: PedidoVentaRow) => {
    if (!p.detalle || p.detalle.length === 0) return false;
    return p.detalle.some((det) => (det.saldo_cantidad ?? 0) > 0);
  };

  const pedidosFiltrados = pedidos
    .filter(tieneSaldoDisponible)
    .filter((p) => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        p.pedidoventaId?.toLowerCase().includes(q)        ||
        p.numero_correlativo?.toLowerCase().includes(q)   ||
        p.cliente_descripcion?.toLowerCase().includes(q)  ||
        p.cliente_num_docident?.toLowerCase().includes(q) ||
        p.cliente_referencia?.toLowerCase().includes(q)
      );
    });

  const pedidosSinSaldo = pedidos.filter((p) => !tieneSaldoDisponible(p)).length;

  // ── Selección ──────────────────────────────────────────────────────────────

  const handleSeleccionar = (pedido: PedidoVentaRow) => {
    onImportar(pedido);
    onClose();
  };

  // ── Formato ────────────────────────────────────────────────────────────────

  const formatMoney = (val?: number, simbolo?: string) => {
    if (val == null) return "—";
    const formatted = new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
    return simbolo ? `${simbolo} ${formatted}` : formatted;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <IconFileImport size={22} className="text-blue-400" />
            <div>
              <h2 className="text-white font-bold text-base">Importar Pedido de Venta</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Seleccione un pedido para pre-llenar el formulario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <DateInput label="Desde" value={fechaInicio} onChange={setFechaInicio} />
          <DateInput label="Hasta" value={fechaFin}    onChange={setFechaFin}    />

          <button
            onClick={fetchPedidos}
            disabled={loading}
            className="self-end flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
          >
            {loading
              ? <IconLoader size={15} className="animate-spin" />
              : <IconSearch size={15} />}
            Buscar
          </button>

          <div className="ml-auto self-end flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[220px]">
            <IconSearch size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filtrar por cliente, N°..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="text-xs outline-none text-slate-700 bg-transparent flex-1"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}>
                <IconX size={12} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconLoader size={28} className="animate-spin text-blue-500" />
              <span className="text-sm">Cargando pedidos...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-400">
              <IconAlertCircle size={28} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={fetchPedidos} className="text-xs text-blue-600 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconInbox size={28} />
              <span className="text-sm text-center">
                {pedidos.length === 0
                  ? "No hay pedidos en el rango seleccionado"
                  : pedidosSinSaldo === pedidos.length
                    ? "Todos los pedidos del rango ya tienen saldo en cero"
                    : "Sin resultados para la búsqueda"}
              </span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-500 uppercase font-bold">
                  <th className="px-4 py-3 w-32">N° Correlativo</th>
                  <th className="px-4 py-3 w-28">Fecha Emisión</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 w-28">Moneda</th>
                  <th className="px-4 py-3 w-36">Forma de Pago</th>
                  <th className="px-4 py-3 text-right w-28">Total</th>
                  <th className="px-4 py-3 text-center w-24">Estado</th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosFiltrados.map((p) => {
                  const isSelected = selectedId === p.pedidoventaId;
                  return (
                    <tr
                      key={p.pedidoventaId}
                      onClick={() => setSelectedId(p.pedidoventaId)}
                      onDoubleClick={() => handleSeleccionar(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-l-2 border-l-blue-500"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* N° Correlativo */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-700">
                          {p.numero_correlativo ?? p.pedidoventaId}
                        </span>
                      </td>

                      {/* Fecha Emisión — DD/MM/YYYY */}
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {isoToDisplay(p.fecha_emision)}
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {p.cliente_descripcion ?? p.clienteId ?? "—"}
                        </p>
                        {p.cliente_num_docident && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.cliente_docidentId ?? ""} {p.cliente_num_docident}
                          </p>
                        )}
                      </td>

                      {/* Moneda */}
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono font-semibold">
                          {p.moneda_simbolo ?? ""} {p.moneda_descripcion ?? p.monedaId ?? "—"}
                        </span>
                      </td>

                      {/* Forma de Pago */}
                      <td className="px-4 py-3 text-slate-600">
                        {p.formapago_descripcion ?? p.formaspagoId ?? "—"}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {formatMoney(p.total, p.moneda_simbolo)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        {p.estado && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              p.estado === "Aprobado"
                                ? "bg-emerald-100 text-emerald-700"
                                : p.estado === "Pendiente"
                                  ? "bg-amber-100 text-amber-700"
                                  : p.estado === "Anulado"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p.estado}
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSeleccionar(p); }}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                          title="Importar este pedido"
                        >
                          <IconChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">
            {!loading && (
              <>
                {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""} con saldo disponible
                {busqueda && ` (filtrado)`}
                {pedidosSinSaldo > 0 && (
                  <span className="ml-2 text-slate-400">
                    · {pedidosSinSaldo} sin saldo (oculto{pedidosSinSaldo !== 1 ? "s" : ""})
                  </span>
                )}
                {selectedId && (
                  <span className="ml-2 text-blue-500 font-medium">
                    · Doble click o{" "}
                    <button
                      className="underline hover:no-underline"
                      onClick={() => {
                        const p = pedidos.find((x) => x.pedidoventaId === selectedId);
                        if (p) handleSeleccionar(p);
                      }}
                    >
                      click aquí
                    </button>{" "}
                    para importar el seleccionado
                  </span>
                )}
              </>
            )}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}