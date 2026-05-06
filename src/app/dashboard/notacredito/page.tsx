"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import documentoVentaService from "@/services/documentoventaService";
import { DocumentoVenta, FiltrosDocumentoVenta } from "@/types/Documentoventa.types";
import { generarHtmlBoleta } from "@/utils/printDocumentoVenta";
import { toast } from "sonner";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import DateInput from "@/components/forms/DateInput";
import DocumentoVentaViewModal from "@/app/dashboard/ventas/components/VentasViewModal";
import ActionMenu from "@/components/shared/ActionMenu";

import {
  IconRefresh, IconSearch, IconFilter,
  IconCalendar, IconUser, IconPlus,
} from "@tabler/icons-react";

// ─── Constantes ──────────────────────────────────────────────────────────────

const EMPRESA_ID = "005";

// Siempre fijo — no se puede quitar
const LOCKED_TIPOS_DOC = ["X037", "X067"];

function getFechaLocal(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const INITIAL_FILTERS: FiltrosDocumentoVenta = {
  tipodoccomercialIds:  LOCKED_TIPOS_DOC,
  estadoDocumentoSunat: [],
  monedaIds:            [],
  condicionPago:        undefined,
  fechaDesde:           getFechaLocal(-30),
  fechaHasta:           getFechaLocal(0),
  estado:               undefined,
};

const ESTADOS_SUNAT = [
  { id: "PENDIENTEXML", label: "Pendiente XML" },
  { id: "ENVIADO",      label: "Enviado" },
  { id: "ACEPTADO",     label: "Aceptado" },
  { id: "RECHAZADO",    label: "Rechazado" },
  { id: "BAJA",         label: "Baja" },
  { id: "ANULADO",      label: "Anulado SUNAT" },
];
const ESTADOS_DOC = [
  { id: "REGISTRADO",   label: "Registrado" },
  { id: "COMPROMETIDO", label: "Comprometido" },
  { id: "ANULADO",      label: "Anulado" },
  { id: "CERRADO",      label: "Cerrado" },
];
const MONEDAS = [
  { id: "PEN", label: "Soles (S/)" },
  { id: "USD", label: "Dólares (US$)" },
];

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmtFecha(fecha: string): string {
  if (!fecha) return "-";
  const [y, m, d] = fecha.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function fmtMoneda(monto: number, abrev = "PEN"): string {
  const a = (abrev ?? "").toUpperCase();
  const currency =
    a === "USD" || a === "D" || a === "002" ? "USD" :
    a === "EUR" || a === "E" || a === "003" ? "EUR" : "PEN";
  return new Intl.NumberFormat("es-PE", {
    style: "currency", currency, minimumFractionDigits: 2,
  }).format(monto);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function NotaCreditoPage() {
  const router = useRouter();
  const {
    data: rawData, loading, meta,
    searchTerm, setSearchTerm,
    filters, setFilters,
    fetchData, handleAction,
  } = useCrud<DocumentoVenta>(documentoVentaService, EMPRESA_ID, INITIAL_FILTERS);

  const data = useMemo(
    () => rawData.filter((d) => d.tipoDocumentoComercial?.abreviatura === "NC"),
    [rawData]
  );

  const [tempFilters,     setTempFilters]     = useState<FiltrosDocumentoVenta>(INITIAL_FILTERS);
  const [showFilters,     setShowFilters]     = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [viewDocumentoId, setViewDocumentoId] = useState<string | null>(null);
  const [loadingPrint,    setLoadingPrint]    = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtros ───────────────────────────────────────────────────────────────
  const handleOpenSidebar = useCallback(() => {
    setTempFilters(filters);
    setShowFilters(true);
  }, [filters]);

  // Garantiza que el filtro de tipo siempre permanece bloqueado al aplicar
  const handleApplyFilters = useCallback(() => {
    setFilters({ ...tempFilters, tipodoccomercialIds: LOCKED_TIPOS_DOC });
    setShowFilters(false);
  }, [tempFilters, setFilters]);

  const handleClearFilters = useCallback(() => {
    setTempFilters(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  }, [setFilters]);

  const countActiveFilters = useMemo(() => {
    let c = 0;
    if (tempFilters.estadoDocumentoSunat?.length) c++;
    if (tempFilters.monedaIds?.length)            c++;
    if (tempFilters.condicionPago)                c++;
    if (tempFilters.fechaDesde)                   c++;
    if (tempFilters.fechaHasta)                   c++;
    if (tempFilters.estado)                       c++;
    return c;
  }, [tempFilters]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleView = useCallback((id: string) => {
    setViewDocumentoId(id);
    setShowViewModal(true);
  }, []);

  const handleAnular = useCallback((id: string) => {
    handleAction(id, "anular", EMPRESA_ID);
  }, [handleAction]);

  const handleValidarSunat = useCallback(async (id: string) => {
    toast.info(`Validar SUNAT ${id} — próximamente`);
  }, []);

  const handleImprimir = useCallback(async (id: string) => {
    try {
      setLoadingPrint(true);
      const response = await documentoVentaService.getById(id);
      const doc      = (response as any)?.data ?? response;
      const logoUrl  = `${window.location.origin}/image/logo.png`;
      const html     = generarHtmlBoleta(doc, logoUrl);
      const win      = window.open("", "_blank", "width=960,height=720");
      if (!win) {
        toast.error("El navegador bloqueó la ventana emergente. Habilita pop-ups para este sitio.");
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch (err: any) {
      toast.error(`Error al generar la impresión: ${err.message}`);
    } finally {
      setLoadingPrint(false);
    }
  }, []);

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: "Fecha Emisión",
      width:  "120px",
      render: (row: DocumentoVenta) => (
        <div className="flex items-center gap-2">
          <IconCalendar size={14} className="text-slate-400" />
          <span className="text-xs text-slate-700">{fmtFecha(row.fecha_emision)}</span>
        </div>
      ),
    },
    {
      header: "Documento",
      width:  "180px",
      render: (row: DocumentoVenta) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {row.tipoDocumentoComercial?.abreviatura || row.tipodoccomercialId}
          </span>
          <span className="font-mono font-bold text-blue-700 text-sm">
            {row.serie}-{row.numero}
          </span>
        </div>
      ),
    },
    {
      header:    "Cliente",
      className: "min-w-[250px]",
      render:    (row: DocumentoVenta) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <IconUser size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              {row.cliente?.descripcion || "Sin cliente"}
            </p>
            <p className="text-[10px] text-slate-500">
              {row.cliente?.numDocIdent || "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      header:    "Moneda",
      width:     "100px",
      className: "text-center",
      render:    (row: DocumentoVenta) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          {row.moneda?.abreviatura || row.monedaId}
        </span>
      ),
    },
    {
      header: "Totales",
      width:  "140px",
      render: (row: DocumentoVenta) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500">Total:</span>
            <span className="font-bold text-slate-800 text-sm">
              {fmtMoneda(row.total, row.moneda?.abreviatura ?? row.monedaId)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500">Saldo:</span>
            <span className={`font-semibold text-xs ${row.saldo > 0 ? "text-orange-600" : "text-green-600"}`}>
              {fmtMoneda(row.saldo, row.moneda?.abreviatura ?? row.monedaId)}
            </span>
          </div>
        </div>
      ),
    },
    {
      header:    "Estado",
      width:     "110px",
      className: "text-center",
      render:    (row: DocumentoVenta) => {
        const st = row.estado || "—";
        const cl =
          st === "REGISTRADO"   ? "bg-blue-50 text-blue-700 border-blue-200"    :
          st === "COMPROMETIDO" ? "bg-amber-50 text-amber-700 border-amber-200" :
          st === "ANULADO"      ? "bg-red-50 text-red-600 border-red-200"       :
          st === "CERRADO"      ? "bg-slate-100 text-slate-500 border-slate-200":
                                  "bg-gray-50 text-gray-500 border-gray-200";
        return (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${cl}`}>
            {st}
          </span>
        );
      },
    },
    {
      header:    "Estado SUNAT",
      width:     "140px",
      className: "text-center",
      render:    (row: DocumentoVenta) => {
        const st = row.estado_documento_sunat || "PENDIENTE";
        const cl =
          st.includes("101") || st.includes("ACEPTAD")  ? "bg-green-50 text-green-700 border-green-200"   :
          st.includes("108") || st.includes("ANULAD")   ? "bg-red-50 text-red-600 border-red-200"          :
          st.includes("RECHAZAD")                        ? "bg-red-50 text-red-600 border-red-200"          :
          st.includes("PENDIENTE")                       ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                           "bg-gray-50 text-gray-600 border-gray-200";
        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${cl}`}>
            {st}
          </span>
        );
      },
    },
    {
      header:    "Estado Almacén",
      width:     "160px",
      className: "text-center",
      render:    (row: DocumentoVenta) => {
        const st = row.estado_almacen;
        if (!st) return <span className="text-slate-300 text-[10px]">—</span>;
        const cl =
          st.includes("PENDIENTE") ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
          st.includes("ATENDIDO")  ? "bg-green-50 text-green-700 border-green-200"    :
          st.includes("ANULADO")   ? "bg-red-50 text-red-600 border-red-200"          :
          st.includes("PARCIAL")   ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                     "bg-slate-100 text-slate-500 border-slate-200";
        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${cl}`}>
            {st}
          </span>
        );
      },
    },
    {
      header:    "Acciones",
      className: "text-center",
      width:     "80px",
      render: (row: DocumentoVenta) => {
        const esAnulado    = row.estado?.toUpperCase() === "ANULADO";
        const esRegistrado = row.estado?.toUpperCase() === "REGISTRADO";
        const st           = (row.estado_documento_sunat ?? "").toUpperCase();
        const esAceptado   = st.includes("101") || st.includes("ACEPTAD");
        return (
          <ActionMenu
            onView={         () => row.documentoventaId && handleView(row.documentoventaId)}
            onAnular={       esRegistrado ? () => row.documentoventaId && handleAnular(row.documentoventaId) : undefined}
            onValidarSunat={ !esAceptado  ? () => row.documentoventaId && handleValidarSunat(row.documentoventaId) : undefined}
            onImprimir={     () => row.documentoventaId && handleImprimir(row.documentoventaId)}
            isAnulado={esAnulado}
            label={`${row.serie}-${row.numero} · ${row.estado || "ACTIVO"}`}
          />
        );
      },
    },
  ], [handleView, handleAnular, handleValidarSunat, handleImprimir]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Notas de Crédito
          </h1>
          <p className="text-sm text-slate-500">
            Gestión de notas de crédito electrónicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/notacredito/crear")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm"
          >
            <IconPlus size={18} /> Nueva Nota de Crédito
          </button>
          <button
            onClick={() => fetchData(meta.currentPage, debouncedSearch, filters)}
            className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-colors"
            disabled={loading}
          >
            <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por serie, número, cliente, documento..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handleOpenSidebar}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
            countActiveFilters > 0
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white border-slate-300"
          }`}
        >
          <IconFilter size={20} />
          Filtros {countActiveFilters > 0 && `(${countActiveFilters})`}
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={(page: number) => fetchData(page, debouncedSearch, filters)}
      />

      {/* Sidebar Filtros */}
      <SidebarFiltros
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        totalActive={countActiveFilters}
      >
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Estado SUNAT</p>
          <select
            value={tempFilters.estadoDocumentoSunat?.[0] ?? ""}
            onChange={(e) => setTempFilters((p) => ({ ...p, estadoDocumentoSunat: e.target.value ? [e.target.value] : [] }))}
            className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos</option>
            {ESTADOS_SUNAT.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Estado Documento</p>
          <select
            value={tempFilters.estado ?? ""}
            onChange={(e) => setTempFilters((p) => ({ ...p, estado: e.target.value || undefined }))}
            className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos</option>
            {ESTADOS_DOC.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Moneda</p>
          <select
            value={tempFilters.monedaIds?.[0] ?? ""}
            onChange={(e) => setTempFilters((p) => ({ ...p, monedaIds: e.target.value ? [e.target.value] : [] }))}
            className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas</option>
            {MONEDAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Rango de Fechas</p>
          <div className="flex flex-col gap-2">
            <DateInput
              label="Desde"
              name="fechaDesde"
              value={tempFilters.fechaDesde ?? ""}
              onChange={(e) => setTempFilters((p) => ({ ...p, fechaDesde: e.target.value || undefined }))}
            />
            <DateInput
              label="Hasta"
              name="fechaHasta"
              value={tempFilters.fechaHasta ?? ""}
              onChange={(e) => setTempFilters((p) => ({ ...p, fechaHasta: e.target.value || undefined }))}
            />
          </div>
        </div>
      </SidebarFiltros>

      {/* Modal Ver */}
      <DocumentoVentaViewModal
        documentoventaId={viewDocumentoId}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewDocumentoId(null); }}
      />
    </div>
  );
}
