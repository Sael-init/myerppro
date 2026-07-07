"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import documentoVentaService from "@/services/DocumentoventaService";
import { DocumentoVenta, FiltrosDocumentoVenta } from "@/types/Documentoventa.types";
import { generarHtmlBoleta, generarHtmlBoletaInterna } from "@/utils/printDocumentoVenta";
import Link from "next/link";
import { toast } from "sonner";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import DateInput from "@/components/forms/DateInput";
import DocumentoVentaViewModal from "./components/VentasViewModal";
import TrazabilidadPanel from "@/components/shared/TrazabilidadPanel";
import ActionMenu from "@/components/shared/ActionMenu";

import {
  IconRefresh, IconSearch, IconFilter,
  IconCalendar, IconUser, IconPlus, IconReceipt,
  IconPrinter, IconClipboardList, IconX,
} from "@tabler/icons-react";

// ─── Helpers estáticos (fuera del componente) ────────────────────────────────

function getFechaLocal(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ✅ Fuera del componente → referencia estable, no se recrea en cada render
const INITIAL_FILTERS: FiltrosDocumentoVenta = {
  tipodoccomercialIds:  [],
  estadoDocumentoSunat: [],
  monedaIds:            [],
  condicionPago:        undefined,
  fechaDesde:           getFechaLocal(-5),
  fechaHasta:           getFechaLocal(0),
  estado:               undefined,
};

const TIPOS_DOC = [
  { id: "X001", label: "Factura" },
  { id: "X002", label: "Boleta" },
  { id: "X028", label: "Factura Electrónica" },
  { id: "X007", label: "Nota de Crédito" },
  { id: "X077", label: "Nota de Débito" },
  { id: "X029", label: "Guía de Remisión" },
];
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
const CONDICIONES_PAGO = [
  { id: "CONTADO",  label: "Contado" },
  { id: "CREDITO",  label: "Crédito" },
  { id: "GRATUITO", label: "Gratuito" },
];

// ─── Helpers de formato (fuera del componente) ───────────────────────────────

function fmtFecha(fecha: string): string {
  if (!fecha) return "-";
  // ✅ Parsear como fecha local (agregar T00:00:00 evita desfase UTC)
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

// ─── Componente principal ────────────────────────────────────────────────────

const EMPRESA_ID = "005";

export default function DocumentosVentaPage() {
  const router = useRouter();

  const {
    data, loading, meta,
    searchTerm, setSearchTerm,
    filters, setFilters,
    fetchData, handleAction,
  } = useCrud<DocumentoVenta>(documentoVentaService, EMPRESA_ID, INITIAL_FILTERS);

  const [tempFilters,        setTempFilters]        = useState<FiltrosDocumentoVenta>(INITIAL_FILTERS);
  const [showFilters,        setShowFilters]         = useState(false);
  const [showViewModal,      setShowViewModal]       = useState(false);
  const [viewDocumentoId,    setViewDocumentoId]     = useState<string | null>(null);
  const [showTrazabilidad,   setShowTrazabilidad]    = useState(false);
  const [trazabilidadId,     setTrazabilidadId]      = useState<string | null>(null);
  const [showBoleteoModal,   setShowBoleteoModal]    = useState(false);
  const [boleteoDocumentoId, setBoleteoDocumentoId]  = useState<string | null>(null);
  const [serieBoleteo,       setSerieBoleteo]        = useState("");
  const [loadingBoleteo,     setLoadingBoleteo]      = useState(false);
  const [loadingPrint,       setLoadingPrint]        = useState(false);
  const [showPrintChooser,   setShowPrintChooser]    = useState(false);
  const [printChooserDocId,  setPrintChooserDocId]   = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  // ✅ Solo se dispara cuando cambia búsqueda o filtros, no en cada render
  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtros ───────────────────────────────────────────────────────────────
  const handleOpenSidebar  = useCallback(() => { setTempFilters(filters); setShowFilters(true); }, [filters]);
  const handleApplyFilters = useCallback(() => { setFilters(tempFilters); setShowFilters(false); }, [tempFilters, setFilters]);
  const handleClearFilters = useCallback(() => { setTempFilters(INITIAL_FILTERS); setFilters(INITIAL_FILTERS); }, [setFilters]);

  const countActiveFilters = useMemo(() => {
    let c = 0;
    if (tempFilters.tipodoccomercialIds?.length)  c++;
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

  const handleTrazabilidad = useCallback((id: string) => {
    setTrazabilidadId(id);
    setShowTrazabilidad(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    router.push(`/dashboard/ventas/crear/d_ventas?editId=${id}`);
  }, [router]);

  const handleAnular = useCallback((id: string) => {
    handleAction(id, "anular", EMPRESA_ID);
  }, [handleAction]);

  const handleValidarSunat = useCallback(async (id: string) => {
    try {
      toast.loading("Validando documento en SUNAT...", { id: "validar-sunat" });
      const resultado = await documentoVentaService.enviarMifact(id);
      if (resultado.isSuccess && !resultado.errors) {
        toast.success(
          resultado.sunatDescription || resultado.message || "Documento validado en SUNAT correctamente",
          { id: "validar-sunat" }
        );
        fetchData(meta.currentPage, debouncedSearch, filters);
      } else {
        toast.error(resultado.errors || resultado.message || "SUNAT rechazó el documento", { id: "validar-sunat" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al validar el documento en SUNAT", { id: "validar-sunat" });
    }
  }, [fetchData, meta.currentPage, debouncedSearch, filters]);

  const handleBoletear = useCallback((id: string) => {
    setBoleteoDocumentoId(id);
    setSerieBoleteo("");
    setShowBoleteoModal(true);
  }, []);

  const handleDescargar = useCallback(async (id: string) => {
    try {
      toast.loading("Descargando archivos MiFact...", { id: "descargar-mifact" });
      const resultado = await documentoVentaService.descargarArchivosMifact(id, EMPRESA_ID);
      const resData = resultado?.data ?? resultado;
      const isSuccess = resData?.isSuccess ?? resData?.IsSuccess ?? false;
      const message = resData?.message ?? resData?.Message ?? "";
      if (isSuccess) {
        toast.success(message || "Archivos descargados correctamente", { id: "descargar-mifact" });
      } else {
        const errores = resData?.archivosConError ?? resData?.ArchivosConError ?? [];
        const guardados = resData?.archivosGuardados ?? resData?.ArchivosGuardados ?? [];
        if (errores.length > 0 && guardados.length > 0) {
          toast.warning(message || "Descarga parcial: algunos archivos fallaron", { id: "descargar-mifact" });
        } else {
          toast.error(message || "Error al descargar los archivos", { id: "descargar-mifact" });
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al descargar archivos MiFact", { id: "descargar-mifact" });
    }
  }, []);

  const handleImprimir = useCallback((id: string) => {
    setPrintChooserDocId(id);
    setShowPrintChooser(true);
  }, []);

  const ejecutarImpresion = useCallback(async (tipo: "estandar" | "interno") => {
    if (!printChooserDocId) return;
    setShowPrintChooser(false);
    try {
      setLoadingPrint(true);
      const response = await documentoVentaService.getById(printChooserDocId);
      const doc      = (response as any)?.data ?? response;
      const html     = tipo === "estandar"
        ? generarHtmlBoleta(doc, "")
        : generarHtmlBoletaInterna(doc);
      const win = window.open("", "_blank", "width=960,height=720");
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
  }, [printChooserDocId]);

  const handleConfirmarBoleteo = useCallback(async () => {
    if (!boleteoDocumentoId || !serieBoleteo.trim()) {
      toast.error("La serie es obligatoria");
      return;
    }
    try {
      setLoadingBoleteo(true);
      const resultado = await documentoVentaService.boletear(boleteoDocumentoId, serieBoleteo.trim());
      const resData   = resultado?.data ?? resultado;
      if (resData?.isSuccess) {
        toast.success(resData.message ?? "Boleteo completado exitosamente");
        if (resData.boletasConError > 0)
          toast.warning(`${resData.boletasConError} boleta(s) tuvieron error en SUNAT`);
        setShowBoleteoModal(false);
        fetchData(meta.currentPage, debouncedSearch, filters);
      } else {
        toast.error(resData?.message ?? "Error al procesar el boleteo");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al procesar el boleteo");
    } finally {
      setLoadingBoleteo(false);
    }
  }, [boleteoDocumentoId, serieBoleteo, fetchData, meta.currentPage, debouncedSearch, filters]);

  const displayData = useMemo(
    () => data.filter((d) => d.tipodoccomercialId !== "X037"),
    [data]
  );

  // ── Columnas — memoizadas para evitar re-render de DataTable ─────────────
  // ✅ useMemo con dependencias estables (callbacks memoizados arriba)
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
          st === "REGISTRADO"   ? "bg-blue-50 text-blue-700 border-blue-200"   :
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
          st.includes("101") || st.includes("ACEPTAD") ? "bg-green-50 text-green-700 border-green-200"  :
          st.includes("108") || st.includes("ANULAD")  ? "bg-red-50 text-red-600 border-red-200"         :
          st.includes("RECHAZAD")                       ? "bg-red-50 text-red-600 border-red-200"         :
          st.includes("PENDIENTE")                      ? "bg-yellow-50 text-yellow-700 border-yellow-200":
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
        const esAnulado      = row.estado?.toUpperCase() === "ANULADO";
        const esRegistrado   = row.estado?.toUpperCase() === "REGISTRADO";
        const st             = (row.estado_documento_sunat ?? "").toUpperCase();
        const esAceptado     = st.includes("101") || st.includes("ACEPTAD");
        return (
          <ActionMenu
            onView={        () => row.documentoventaId && handleView(row.documentoventaId)}
            onEdit={        !esAceptado ? () => row.documentoventaId && handleEdit(row.documentoventaId) : undefined}
            onAnular={      esRegistrado ? () => row.documentoventaId && handleAnular(row.documentoventaId) : undefined}
            onValidarSunat={ !esAceptado ? () => row.documentoventaId && handleValidarSunat(row.documentoventaId) : undefined}
            onBoletear={
              row.tipodoccomercialId === "X066" && row.estado_boleteo?.toUpperCase() !== "BOLETEADO"
                ? () => row.documentoventaId && handleBoletear(row.documentoventaId)
                : undefined
            }
            onImprimir={() => row.documentoventaId && handleImprimir(row.documentoventaId)}
            onDescargar={st === "ACEPTADO" ? () => row.documentoventaId && handleDescargar(row.documentoventaId) : undefined}
            onTrazabilidad={() => row.documentoventaId && handleTrazabilidad(row.documentoventaId)}
            isAnulado={esAnulado}
            label={`${row.serie}-${row.numero} · ${row.estado || "ACTIVO"}`}
          />
        );
      },
    },
  ], [handleView, handleEdit, handleAnular, handleValidarSunat, handleBoletear, handleImprimir, handleDescargar, handleTrazabilidad]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Documentos de Venta
          </h1>
          <p className="text-sm text-slate-500">
            Gestión de facturas, boletas y documentos comerciales
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(meta.currentPage, debouncedSearch, filters)}
            className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-colors"
            disabled={loading}
          >
            <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/dashboard/ventas/crear"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconPlus size={20} /> + Nuevo Documento
          </Link>
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

      {/* Table + Panel trazabilidad */}
      {showTrazabilidad ? (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <TrazabilidadPanel
            tabla="DOCUMENTOVENTA"
            id={trazabilidadId}
            onClose={() => { setShowTrazabilidad(false); setTrazabilidadId(null); }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={displayData}
          loading={loading}
          meta={meta}
          onPageChange={(page: number) => fetchData(page, debouncedSearch, filters)}
        />
      )}

      {/* Sidebar Filtros */}
      <SidebarFiltros
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        totalActive={countActiveFilters}
      >
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Tipo Documento</p>
          <select
            value={tempFilters.tipodoccomercialIds?.[0] ?? ""}
            onChange={(e) => setTempFilters((p) => ({ ...p, tipodoccomercialIds: e.target.value ? [e.target.value] : [] }))}
            className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos</option>
            {TIPOS_DOC.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

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
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Condición de Pago</p>
          <select
            value={tempFilters.condicionPago ?? ""}
            onChange={(e) => setTempFilters((p) => ({ ...p, condicionPago: e.target.value || undefined }))}
            className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas</option>
            {CONDICIONES_PAGO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
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

      {/* Modal Imprimir — elegir formato */}
      {showPrintChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <IconPrinter size={20} className="text-sky-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Formato de impresión</h2>
                  <p className="text-xs text-slate-500">Selecciona cómo imprimir</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintChooser(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => ejecutarImpresion("estandar")}
                disabled={loadingPrint}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200
                           hover:border-sky-400 hover:bg-sky-50 transition-all disabled:opacity-50 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                  <IconPrinter size={20} className="text-slate-500 group-hover:text-sky-600" />
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-sky-700">Estándar</span>
                <span className="text-[11px] text-slate-400 text-center leading-tight">Para enviar al cliente</span>
              </button>

              <button
                onClick={() => ejecutarImpresion("interno")}
                disabled={loadingPrint}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200
                           hover:border-rose-400 hover:bg-rose-50 transition-all disabled:opacity-50 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
                  <IconClipboardList size={20} className="text-slate-500 group-hover:text-rose-600" />
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-rose-700">Interno</span>
                <span className="text-[11px] text-slate-400 text-center leading-tight">Uso interno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boleteo */}
      {showBoleteoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <IconReceipt size={22} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">Boletear Documento</h2>
                <p className="text-xs text-slate-500">
                  Doc. interno: <span className="font-mono font-semibold">{boleteoDocumentoId}</span>
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Serie para las boletas
              </label>
              <input
                type="text"
                placeholder="Ej: B001"
                value={serieBoleteo}
                onChange={(e) => setSerieBoleteo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono
                           focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100
                           uppercase transition-all"
                maxLength={4}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleConfirmarBoleteo()}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Se generarán boletas automáticamente según el importe máximo configurado.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowBoleteoModal(false)}
                disabled={loadingBoleteo}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600
                           text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarBoleteo}
                disabled={loadingBoleteo || !serieBoleteo.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white
                           text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingBoleteo
                  ? <><IconRefresh size={16} className="animate-spin" /> Procesando...</>
                  : <><IconReceipt size={16} /> Boletear</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}