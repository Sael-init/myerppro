"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  IconX,
  IconSearch,
  IconLoader,
  IconFileImport,
  IconChevronRight,
  IconAlertCircle,
  IconInbox,
  IconRefresh,
} from "@tabler/icons-react";
import documentoVentaService from "@/services/documentoventaService";
import type { DocumentoVenta } from "@/types/Documentoventa.types";

// ─────────────────────────────────────────────────────────────────────────────

function toIso(date: Date) {
  return date.toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIso(d);
}
function isoToDisplay(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
const formatMoney = (val?: number) => {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  empresaId: string;
  onImportar: (doc: DocumentoVenta) => void;
  onClose: () => void;
}

export default function ImportarDVModal({ empresaId, onImportar, onClose }: Props) {
  const today        = toIso(new Date());
  const defaultDesde = daysAgo(30);

  const [fechaInicio, setFechaInicio] = useState(defaultDesde);
  const [fechaFin,    setFechaFin]    = useState(today);
  const [docs,        setDocs]        = useState<DocumentoVenta[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingDet,  setLoadingDet]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [busqueda,    setBusqueda]    = useState("");

  const fetchDocs = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentoVentaService.getByEmpresa(empresaId, 1, 200, undefined, {
        fechaDesde:           fechaInicio,
        fechaHasta:           fechaFin,
        estadoDocumentoSunat: [],
        monedaIds:            [],
        tipodoccomercialIds:  [],
      });
      setDocs(res.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Error al cargar documentos");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, fechaInicio, fechaFin]);

  useEffect(() => { fetchDocs(); }, []);

  // ── Filtro local ───────────────────────────────────────────────────────────
  const TIPOS_EXCLUIDOS = new Set(["X037", "X038", "X077", "X078"]);

  const docsFiltrados = docs.filter((d) => {
    const estado  = (d.estado ?? "").toUpperCase();
    const tipoDoc = (d.tipodoccomercialId ?? "").toUpperCase();

    if (TIPOS_EXCLUIDOS.has(tipoDoc)) return false;
    if (estado === "RECHAZADO") return false;

    if (!busqueda.trim()) return true;
    const q    = busqueda.toLowerCase();
    const desc = (d as any).cliente?.descripcion ?? (d as any).clienteDescripcion ?? "";
    const num  = `${d.serie}-${d.numero}`.toLowerCase();
    return num.includes(q) || desc.toLowerCase().includes(q);
  });

  // ── Importar: fetch detalle completo y lanzar callback ────────────────────
  const handleSeleccionar = async (doc: DocumentoVenta) => {
    setLoadingDet(doc.documentoventaId);
    try {
      const full = await documentoVentaService.getById(doc.documentoventaId);
      onImportar(full);
      onClose();
    } catch {
      setError("No se pudo cargar el detalle del documento");
    } finally {
      setLoadingDet(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <IconFileImport size={22} className="text-blue-400" />
            <div>
              <h2 className="text-white font-bold text-base">Importar Documento de Venta</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Documentos en estado <span className="text-emerald-400 font-semibold">COMPROMETIDO</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
            <IconX size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
          </div>
          <button
            onClick={fetchDocs} disabled={loading}
            className="self-end flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
          >
            {loading ? <IconLoader size={15} className="animate-spin" /> : <IconSearch size={15} />}
            Buscar
          </button>
          <div className="ml-auto self-end flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[220px]">
            <IconSearch size={14} className="text-slate-400 shrink-0" />
            <input type="text" placeholder="Filtrar por documento, cliente..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="text-xs outline-none text-slate-700 bg-transparent flex-1" />
            {busqueda && <button onClick={() => setBusqueda("")}><IconX size={12} className="text-slate-400 hover:text-slate-600" /></button>}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconLoader size={28} className="animate-spin text-blue-500" />
              <span className="text-sm">Cargando documentos comprometidos...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-400">
              <IconAlertCircle size={28} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={fetchDocs} className="flex items-center gap-1 text-xs text-blue-600 underline hover:no-underline">
                <IconRefresh size={13} /> Reintentar
              </button>
            </div>
          ) : docsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <IconInbox size={28} />
              <span className="text-sm text-center">
                {docs.length === 0
                  ? "No hay documentos comprometidos en el rango seleccionado"
                  : "Sin resultados para la búsqueda"}
              </span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-500 uppercase font-bold">
                  <th className="px-4 py-3 w-28">Fecha</th>
                  <th className="px-4 py-3 w-36">Documento</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 w-28">Tipo Doc</th>
                  <th className="px-4 py-3 text-right w-32">Total</th>
                  <th className="px-4 py-3 text-center w-24">Moneda</th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docsFiltrados.map((doc) => {
                  const isSelected  = selectedId === doc.documentoventaId;
                  const isLoadingThis = loadingDet === doc.documentoventaId;
                  const clienteDesc = (doc as any).cliente?.descripcion ?? (doc as any).clienteDescripcion ?? doc.clienteId ?? "—";
                  return (
                    <tr
                      key={doc.documentoventaId}
                      onClick={() => setSelectedId(doc.documentoventaId)}
                      onDoubleClick={() => !isLoadingThis && handleSeleccionar(doc)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {isoToDisplay(doc.fecha_emision)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800">{doc.serie}-{doc.numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 truncate max-w-[220px] uppercase">{clienteDesc}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {doc.tipodoccomercialId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {formatMoney((doc as any).total)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {(doc as any).monedaId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSeleccionar(doc); }}
                          disabled={!!loadingDet}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
                          title="Importar este documento"
                        >
                          {isLoadingThis
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">
            {!loading && (
              <>
                {docsFiltrados.length} documento{docsFiltrados.length !== 1 ? "s" : ""} comprometido{docsFiltrados.length !== 1 ? "s" : ""}
                {busqueda && " (filtrado)"}
                {selectedId && (
                  <span className="ml-2 text-blue-500 font-medium">
                    · Doble click o{" "}
                    <button className="underline hover:no-underline"
                      onClick={() => { const d = docs.find((x) => x.documentoventaId === selectedId); if (d) handleSeleccionar(d); }}>
                      click aquí
                    </button>{" "}
                    para importar el seleccionado
                  </span>
                )}
              </>
            )}
          </p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
