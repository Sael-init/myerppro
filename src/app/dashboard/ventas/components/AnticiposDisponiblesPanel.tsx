"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import documentoVentaService from "@/services/DocumentoventaService";
import type { DocumentoVenta } from "@/types/Documentoventa.types";
import {
  IconX,
  IconSearch,
  IconLoader,
  IconCashBanknote,
  IconAlertCircle,
  IconInbox,
  IconCheck,
} from "@tabler/icons-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const IGV_PORCENTAJE = 0.18;

// anticipo_saldo_afecto / anticipo_saldo_exonerado son la base SIN IGV (base imponible).
// El listado (getByEmpresa) puede no traer estas columnas nuevas si el SP aún no fue
// actualizado — en ese caso se cae a los campos estándar del documento
// (valorventa_afecto/valorventa_exonerado), que sí vienen siempre.
function getGravadoIgvImporte(a: any): { gravado: number; igv: number; exonerado: number; importe: number } {
  const gravado   = a.anticipo_saldo_afecto    ?? a.valorventa_afecto    ?? 0;
  const exonerado = a.anticipo_saldo_exonerado ?? a.valorventa_exonerado ?? 0;
  const igv       = Math.round(gravado * IGV_PORCENTAJE * 100) / 100;
  return {
    gravado:   Math.round(gravado * 100) / 100,
    igv,
    exonerado: Math.round(exonerado * 100) / 100,
    importe:   Math.round((gravado + igv + exonerado) * 100) / 100,
  };
}

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

const formatMoney = (val?: number | null, simbolo?: string) => {
  if (val == null) return "—";
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return simbolo ? `${simbolo} ${formatted}` : formatted;
};

// ── DateInput ────────────────────────────────────────────────────────────────

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

// ── Props ────────────────────────────────────────────────────────────────────

interface AnticiposDisponiblesPanelProps {
  empresaId: string;
  clienteId: string;
  /** documentoventaId de los anticipos que ya están aplicados al documento actual */
  yaAplicadosIds?: string[];
  onAgregar: (anticipos: DocumentoVenta[]) => void;
  onClose: () => void;
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function AnticiposDisponiblesPanel({
  empresaId,
  clienteId,
  yaAplicadosIds = [],
  onAgregar,
  onClose,
}: AnticiposDisponiblesPanelProps) {
  const [anticipos, setAnticipos] = useState<DocumentoVenta[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [busqueda,   setBusqueda]   = useState("");
  const [fechaDesde, setFechaDesde] = useState(daysAgo(90));
  const [fechaHasta, setFechaHasta] = useState(toIso(new Date()));

  const yaAplicadosSet = useMemo(() => new Set(yaAplicadosIds), [yaAplicadosIds]);

  // ── Fetch: documentos del cliente, filtrados a documento_como_anticipo = "SI" ──
  const fetchAnticipos = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentoVentaService.getByEmpresa(
        empresaId,
        1,
        100,
        undefined,
        {
          clienteIds: [clienteId],
          ...(fechaDesde ? { fechaDesde } : {}),
          ...(fechaHasta ? { fechaHasta } : {}),
        }
      );
      const soloAnticipos = (res.data ?? []).filter(
        (d: any) =>
          (d.documento_como_anticipo ?? "").toUpperCase() === "SI" &&
          (d.estado ?? "").toUpperCase() !== "ANULADO"
      );
      setAnticipos(soloAnticipos);
    } catch (err: any) {
      setError(err.message ?? "Error al cargar los anticipos del cliente");
      setAnticipos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, clienteId, fechaDesde, fechaHasta]);

  useEffect(() => { fetchAnticipos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtro local: saldo mínimo + búsqueda ──────────────────────────────────
  // Se ocultan anticipos ya prácticamente agotados (saldo afecto y exonerado ambos < 1),
  // que no aportan un saldo útil para aplicar a una nueva venta.
  const anticiposFiltrados = anticipos.filter((a: any) => {
    const { gravado, exonerado } = getGravadoIgvImporte(a);
    if (gravado < 1 && exonerado < 1) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      a.documentoventaId?.toLowerCase().includes(q) ||
      a.serie?.toLowerCase().includes(q) ||
      a.numero?.toLowerCase().includes(q)
    );
  });

  // ── Selección múltiple ────────────────────────────────────────────────────
  const toggleSeleccion = (documentoventaId: string) => {
    if (yaAplicadosSet.has(documentoventaId)) return;
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(documentoventaId) ? next.delete(documentoventaId) : next.add(documentoventaId);
      return next;
    });
  };

  // El listado (getByEmpresa) puede no traer las columnas nuevas de anticipo
  // (anticipo_saldo_afecto/exonerado, total_base_anticipo) si el SP del listado
  // aún no fue actualizado. Para evitar mostrar/enviar saldos en 0, se pide el
  // detalle completo (getById) de cada anticipo seleccionado antes de aplicarlo.
  const handleAgregarSeleccionados = async () => {
    const elegidos = anticipos.filter((a: any) => seleccionados.has(a.documentoventaId));
    if (elegidos.length === 0) return;
    setAgregando(true);
    try {
      const detalles = await Promise.all(
        elegidos.map(async (a) => {
          try {
            const full = await documentoVentaService.getById(a.documentoventaId);
            return { ...a, ...full };
          } catch {
            return a; // si falla el detalle, se usa el objeto del listado tal cual
          }
        })
      );
      onAgregar(detalles);
      onClose();
    } finally {
      setAgregando(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <IconCashBanknote size={22} className="text-emerald-400" />
            <div>
              <h2 className="text-white font-bold text-base">Anticipos Disponibles</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Seleccione uno o varios anticipos (documento_como_anticipo = SI) del cliente
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
          <DateInput label="Desde" value={fechaDesde} onChange={setFechaDesde} />
          <DateInput label="Hasta" value={fechaHasta} onChange={setFechaHasta} />

          <button
            onClick={fetchAnticipos}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
          >
            {loading
              ? <IconLoader size={15} className="animate-spin" />
              : <IconSearch size={15} />}
            Buscar
          </button>

          <div className="ml-auto flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[220px]">
            <IconSearch size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filtrar por N° documento..."
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
              <span className="text-sm">Cargando anticipos...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-400">
              <IconAlertCircle size={28} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={fetchAnticipos} className="text-xs text-blue-600 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          ) : anticiposFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconInbox size={28} />
              <span className="text-sm text-center">
                {anticipos.length === 0
                  ? "Este cliente no tiene anticipos disponibles"
                  : "Sin resultados para la búsqueda"}
              </span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-500 uppercase font-bold">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 w-32">Documento</th>
                  <th className="px-4 py-3 w-28">Fecha Emisión</th>
                  <th className="px-4 py-3 text-right w-28">Gravado</th>
                  <th className="px-4 py-3 text-right w-28">IGV</th>
                  <th className="px-4 py-3 text-right w-28">Exonerado</th>
                  <th className="px-4 py-3 text-right w-32">Importe</th>
                  <th className="px-4 py-3 text-center w-24">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {anticiposFiltrados.map((a: any) => {
                  const yaAplicado = yaAplicadosSet.has(a.documentoventaId);
                  const isChecked  = yaAplicado || seleccionados.has(a.documentoventaId);
                  const simbolo    = a.moneda?.abreviatura;
                  const { gravado, igv, exonerado, importe } = getGravadoIgvImporte(a);
                  return (
                    <tr
                      key={a.documentoventaId}
                      onClick={() => toggleSeleccion(a.documentoventaId)}
                      className={`transition-colors ${
                        yaAplicado
                          ? "bg-slate-50 opacity-60 cursor-not-allowed"
                          : isChecked
                            ? "bg-blue-50 border-l-2 border-l-blue-500 cursor-pointer"
                            : "hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center justify-center w-4 h-4 rounded border ${
                            isChecked
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isChecked && <IconCheck size={11} />}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-700">
                          {a.serie && a.numero ? `${a.serie}-${a.numero}` : a.documentoventaId}
                        </span>
                        {yaAplicado && (
                          <span className="block text-[9px] font-bold text-blue-500 uppercase mt-0.5">
                            Ya agregado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {isoToDisplay(a.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatMoney(gravado, simbolo)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatMoney(igv, simbolo)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatMoney(exonerado, simbolo)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                        {formatMoney(importe, simbolo)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.estado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700">
                            {a.estado}
                          </span>
                        )}
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
                {anticiposFiltrados.length} anticipo{anticiposFiltrados.length !== 1 ? "s" : ""} disponible{anticiposFiltrados.length !== 1 ? "s" : ""}
                {busqueda && ` (filtrado)`}
                {seleccionados.size > 0 && (
                  <span className="ml-2 text-blue-600 font-semibold">
                    · {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAgregarSeleccionados}
              disabled={seleccionados.size === 0 || agregando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
            >
              {agregando ? <IconLoader size={15} className="animate-spin" /> : <IconCashBanknote size={15} />}
              Agregar {seleccionados.size > 0 ? `(${seleccionados.size})` : ""}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
