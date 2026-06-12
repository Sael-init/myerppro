"use client";

import { useState, useEffect, useCallback } from "react";
import cotizacionService from "@/services/cotizacionService";
import type { Cotizacion } from "@/types/cotizacion.types";
import {
  IconX,
  IconSearch,
  IconLoader,
  IconFileDescription,
  IconChevronRight,
  IconAlertCircle,
  IconInbox,
} from "@tabler/icons-react";

// ── Helpers de fecha ─────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIso(d);
}

function isoToDisplay(iso?: string): string {
  if (!iso) return "—";
  const part = iso.split("T")[0];
  const [y, m, d] = part.split("-");
  return `${d}/${m}/${y}`;
}

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

interface Props {
  isOpen:     boolean;
  onClose:    () => void;
  onImportar: (cotizacion: Cotizacion) => void;
}

const EMPRESA_ID = "005";

const fmt = (n?: number | null, sym?: string) => {
  if (n == null) return "—";
  const s = n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sym ? `${sym} ${s}` : s;
};

const estadoBadge = (estado?: string) => {
  const e = (estado ?? "").toUpperCase();
  if (e === "REGISTRADO") return "bg-sky-100 text-sky-700";
  if (e === "PENDIENTE")  return "bg-amber-100 text-amber-700";
  if (e === "ACEPTADO")   return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-500";
};

// ── Componente ───────────────────────────────────────────────────────────────

export default function ImportarCotizacionPanel({ isOpen, onClose, onImportar }: Props) {
  const today        = toIso(new Date());
  const defaultDesde = daysAgo(30);

  const [fechaInicio,    setFechaInicio]    = useState(defaultDesde);
  const [fechaFin,       setFechaFin]       = useState(today);
  const [cotizaciones,   setCotizaciones]   = useState<Cotizacion[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [loadingImport,  setLoadingImport]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [busqueda,       setBusqueda]       = useState("");

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cotizacionService.getAll(
        EMPRESA_ID, 1, 100, undefined,
        { fechaDesde: fechaInicio, fechaHasta: fechaFin, estado: null }
      );
      const ESTADOS_VALIDOS = ["REGISTRADO", "PENDIENTE"];
      setCotizaciones(
        (res.data as Cotizacion[]).filter(
          (c) => ESTADOS_VALIDOS.includes((c.estado ?? "").toUpperCase())
        )
      );
    } catch (err: any) {
      setError(err.message ?? "Error al cargar cotizaciones");
      setCotizaciones([]);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    if (isOpen) fetchCotizaciones();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setBusqueda("");
    }
  }, [isOpen]);

  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      (c.numeroCorrelativo ?? c.numero_correlativo ?? "").toLowerCase().includes(q) ||
      (c.cotizacionventaId ?? "").toLowerCase().includes(q)                         ||
      (c.cliente?.descripcion ?? "").toLowerCase().includes(q)                      ||
      (c.clienteId ?? "").toLowerCase().includes(q)
    );
  });

  const handleImportar = async (cot: Cotizacion) => {
    setLoadingImport(true);
    try {
      const full = await cotizacionService.getById(cot.cotizacionventaId);
      onImportar(full);
      onClose();
    } catch {
      // silencioso — el toast lo maneja el padre
    } finally {
      setLoadingImport(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <IconFileDescription size={22} className="text-blue-400" />
            <div>
              <h2 className="text-white font-bold text-base">Importar Cotización</h2>
              <p className="text-slate-400 text-xs mt-0.5 normal-case">
                Seleccione una cotización para pre-llenar el formulario
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
        <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <DateInput label="Desde" value={fechaInicio} onChange={setFechaInicio} />
          <DateInput label="Hasta" value={fechaFin}    onChange={setFechaFin}    />

          <button
            onClick={fetchCotizaciones}
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
              placeholder="Filtrar por cliente, correlativo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="text-xs outline-none text-slate-700 bg-transparent flex-1 normal-case"
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
              <span className="text-sm">Cargando cotizaciones...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-400">
              <IconAlertCircle size={28} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={fetchCotizaciones} className="text-xs text-blue-600 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          ) : cotizacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconInbox size={28} />
              <span className="text-sm text-center">
                {cotizaciones.length === 0
                  ? "No se encontraron cotizaciones en el rango seleccionado"
                  : "Sin resultados para la búsqueda"}
              </span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-500 uppercase font-bold">
                  <th className="px-4 py-3 w-36">Correlativo</th>
                  <th className="px-4 py-3 w-28">Fecha Emisión</th>
                  <th className="px-4 py-3 w-28">Vencimiento</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 w-24">Moneda</th>
                  <th className="px-4 py-3 w-28">Forma Pago</th>
                  <th className="px-4 py-3 text-right w-28">Total</th>
                  <th className="px-4 py-3 text-center w-28">Estado</th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizacionesFiltradas.map((cot) => {
                  const isSelected  = selectedId === cot.cotizacionventaId;
                  const correlativo = cot.numeroCorrelativo ?? cot.numero_correlativo ?? cot.cotizacionventaId;
                  const monedaSym   = cot.moneda?.abreviatura === "D" ? "US$" : "S/";
                  return (
                    <tr
                      key={cot.cotizacionventaId}
                      onClick={() => setSelectedId(cot.cotizacionventaId)}
                      onDoubleClick={() => handleImportar(cot)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-l-2 border-l-blue-500"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-700">{correlativo}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {isoToDisplay(cot.fechaEmision ?? cot.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {isoToDisplay(cot.fechaVencimiento ?? cot.fecha_vencimiento)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px] normal-case">
                          {cot.cliente?.descripcion ?? cot.clienteId ?? "—"}
                        </p>
                        {(cot.cliente?.numDocIdent ?? cot.cliente?.num_docident) && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {cot.cliente?.numDocIdent ?? cot.cliente?.num_docident}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {cot.moneda?.abreviatura ?? cot.monedaId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 normal-case">
                        {cot.formaPago?.descripcion ?? cot.formaspagoId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {fmt(cot.total, monedaSym)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoBadge(cot.estado)}`}>
                          {(cot.estado ?? "—").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleImportar(cot); }}
                          disabled={loadingImport}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
                          title="Importar esta cotización"
                        >
                          {loadingImport && selectedId === cot.cotizacionventaId
                            ? <IconLoader size={14} className="animate-spin" />
                            : <IconChevronRight size={14} />}
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-400 normal-case">
            {!loading && (
              <>
                {cotizacionesFiltradas.length} cotización{cotizacionesFiltradas.length !== 1 ? "es" : ""} disponible{cotizacionesFiltradas.length !== 1 ? "s" : ""}
                {busqueda && " (filtrado)"}
                {selectedId && (
                  <span className="ml-2 text-blue-500 font-medium">
                    · Doble click o{" "}
                    <button
                      className="underline hover:no-underline"
                      onClick={() => {
                        const c = cotizaciones.find((x) => x.cotizacionventaId === selectedId);
                        if (c) handleImportar(c);
                      }}
                    >
                      click aquí
                    </button>{" "}
                    para importar la seleccionada
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
