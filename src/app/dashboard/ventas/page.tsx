// src/app/dashboard/ventas/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import documentoVentaService from "@/services/DocumentoventaService";
import { DocumentoVenta, FiltrosDocumentoVenta } from "@/types/Documentoventa.types";
import { generarHtmlBoleta } from "@/utils/printDocumentoVenta";
import Link from "next/link";
import { toast } from "sonner";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import DocumentoVentaViewModal from "./components/VentasViewModal";

import {
  IconRefresh,
  IconSearch,
  IconFilter,
  IconCalendar,
  IconUser,
  IconPlus,
  IconReceipt,
} from "@tabler/icons-react";

import ActionMenu from "@/components/shared/ActionMenu";

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================
export default function DocumentosVentaPage() {
  const router     = useRouter();
  const EMPRESA_ID = "005";

  const initialFilters: FiltrosDocumentoVenta = {
    tipodoccomercialIds:  [],
    monedaIds:            [],
    condicionPago:        undefined,
    estadoDocumentoSunat: [],
    fechaDesde:           undefined,
    fechaHasta:           undefined,
    estado:               undefined,
  };

  const {
    data,
    loading,
    meta,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    fetchData,
    handleAction,
  } = useCrud<DocumentoVenta>(documentoVentaService, EMPRESA_ID, initialFilters);

  const [tempFilters, setTempFilters] = useState<FiltrosDocumentoVenta>(initialFilters);
  const [showFilters, setShowFilters]  = useState(false);

  // ── Modales ───────────────────────────────────────────
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [viewDocumentoId, setViewDocumentoId] = useState<string | null>(null);

  // ── Boleteo ───────────────────────────────────────────
  const [showBoleteoModal,   setShowBoleteoModal]   = useState(false);
  const [boleteoDocumentoId, setBoleteoDocumentoId] = useState<string | null>(null);
  const [serieBoleteo,       setSerieBoleteo]       = useState("");
  const [loadingBoleteo,     setLoadingBoleteo]     = useState(false);

  // ── Impresión ─────────────────────────────────────────
  const [loadingPrint, setLoadingPrint] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters, fetchData]);

  // ── Filtros ───────────────────────────────────────────
  const handleOpenSidebar  = () => { setTempFilters(filters); setShowFilters(true); };
  const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
  const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

  const countActiveFilters = () => {
    let c = 0;
    if (tempFilters.tipodoccomercialIds?.length)  c += tempFilters.tipodoccomercialIds.length;
    if (tempFilters.monedaIds?.length)            c += tempFilters.monedaIds.length;
    if (tempFilters.condicionPago)                c += 1;
    if (tempFilters.estadoDocumentoSunat?.length) c += tempFilters.estadoDocumentoSunat.length;
    if (tempFilters.fechaDesde)                   c += 1;
    if (tempFilters.fechaHasta)                   c += 1;
    if (tempFilters.estado)                       c += 1;
    return c;
  };

  // ── Acciones ──────────────────────────────────────────
  const handleView = (id: string) => {
    setViewDocumentoId(id);
    setShowViewModal(true);
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/ventas/crear/d_ventas?editId=${id}`);
  };

  const handleAnular = (id: string) => {
    handleAction(id, "anular", EMPRESA_ID);
  };

  const handleValidarSunat = async (id: string) => {
    toast.info(`Validar SUNAT ${id} — próximamente`);
  };

  const handleBoletear = (id: string) => {
    setBoleteoDocumentoId(id);
    setSerieBoleteo("");
    setShowBoleteoModal(true);
  };

  const handleImprimir = async (id: string) => {
    try {
      setLoadingPrint(true);
      const response = await documentoVentaService.getById(id);
      // getById puede devolver { data: {...} } o el objeto directo según tu service
      const doc = (response as any)?.data ?? response;

      // Logo servido desde /public/image/ → copia tu logo a public/image/logo.png
      const logoUrl = `${window.location.origin}/image/logo.png`;
      const html    = generarHtmlBoleta(doc, logoUrl);

      const win = window.open("", "_blank", "width=960,height=720");
      if (!win) {
        toast.error(
          "El navegador bloqueó la ventana emergente. Habilita pop-ups para este sitio."
        );
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch (err: any) {
      console.error("[handleImprimir]", err);
      toast.error(`Error al generar la impresión: ${err.message}`);
    } finally {
      setLoadingPrint(false);
    }
  };

  const handleConfirmarBoleteo = async () => {
    if (!boleteoDocumentoId || !serieBoleteo.trim()) {
      toast.error("La serie es obligatoria");
      return;
    }

    try {
      setLoadingBoleteo(true);
      const resultado = await documentoVentaService.boletear(
        boleteoDocumentoId,
        serieBoleteo.trim()
      );

      const resData = resultado?.data ?? resultado;

      if (resData?.isSuccess) {
        toast.success(resData.message ?? "Boleteo completado exitosamente");
        if (resData.boletasConError > 0) {
          toast.warning(`${resData.boletasConError} boleta(s) tuvieron error en SUNAT`);
        }
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
  };

  // ── Helpers visuales ──────────────────────────────────
  const fmtFecha = (fecha: string) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  const fmtMoneda = (monto: number, moneda = "PEN") =>
    new Intl.NumberFormat("es-PE", {
      style:                 "currency",
      currency:              moneda === "USD" ? "USD" : "PEN",
      minimumFractionDigits: 2,
    }).format(monto);

  // ── Columnas ──────────────────────────────────────────
  const columns = [
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
              {fmtMoneda(row.total, row.monedaId)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500">Saldo:</span>
            <span className={`font-semibold text-xs ${row.saldo > 0 ? "text-orange-600" : "text-green-600"}`}>
              {fmtMoneda(row.saldo, row.monedaId)}
            </span>
          </div>
        </div>
      ),
    },
    {
      header:    "Condición",
      width:     "100px",
      className: "text-center",
      render:    (row: DocumentoVenta) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
          row.condicion_pago === "CONTADO"
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-orange-50 text-orange-700 border-orange-200"
        }`}>
          {row.condicion_pago}
        </span>
      ),
    },
    {
      header:    "Estado SUNAT",
      width:     "140px",
      className: "text-center",
      render:    (row: DocumentoVenta) => {
        const st = row.estado_documento_sunat || "PENDIENTE";
        let cl   = "bg-gray-50 text-gray-600 border-gray-200";
        if (st.includes("101") || st.includes("ACEPTAD"))     cl = "bg-green-50 text-green-700 border-green-200";
        else if (st.includes("108") || st.includes("ANULAD")) cl = "bg-red-50 text-red-600 border-red-200";
        else if (st.includes("PENDIENTE"))                    cl = "bg-yellow-50 text-yellow-700 border-yellow-200";
        else if (st.includes("RECHAZAD"))                     cl = "bg-red-50 text-red-600 border-red-200";
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
        const esAnulado  = row.estado?.toUpperCase() === "ANULADO";
        const st         = (row.estado_documento_sunat ?? "").toUpperCase();
        const esAceptado = st.includes("101") || st.includes("ACEPTAD");

        return (
          <ActionMenu
            onView={() => row.documentoventaId && handleView(row.documentoventaId)}
            onEdit={
              !esAceptado
                ? () => row.documentoventaId && handleEdit(row.documentoventaId)
                : undefined
            }
            onAnular={() => row.documentoventaId && handleAnular(row.documentoventaId)}
            onValidarSunat={
              !esAceptado
                ? () => row.documentoventaId && handleValidarSunat(row.documentoventaId)
                : undefined
            }
            onBoletear={
              row.tipodoccomercialId === "X066" && row.estado_boleteo?.toUpperCase() !== "BOLETEADO"
                ? () => row.documentoventaId && handleBoletear(row.documentoventaId)
                : undefined
            }
            onImprimir={() => row.documentoventaId && handleImprimir(row.documentoventaId)}
            isAnulado={esAnulado}
            label={`${row.serie}-${row.numero} · ${row.estado || "ACTIVO"}`}
          />
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────
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
            countActiveFilters() > 0
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white border-slate-300"
          }`}
        >
          <IconFilter size={20} />
          Filtros {countActiveFilters() > 0 && `(${countActiveFilters()})`}
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
        totalActive={countActiveFilters()}
      >
        <div className="flex flex-col gap-5">
          <div className="text-center py-10 text-slate-400 italic text-sm">
            Filtros próximamente disponibles
          </div>
        </div>
      </SidebarFiltros>

      {/* Modal Ver */}
      <DocumentoVentaViewModal
        documentoventaId={viewDocumentoId}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewDocumentoId(null); }}
      />

      {/* ── Modal Boleteo ─────────────────────────────── */}
      {showBoleteoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <IconReceipt size={22} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">Boletear Documento</h2>
                <p className="text-xs text-slate-500">
                  Doc. interno:{" "}
                  <span className="font-mono font-semibold">{boleteoDocumentoId}</span>
                </p>
              </div>
            </div>

            {/* Input serie */}
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

            {/* Botones */}
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
                           text-sm font-bold transition-colors disabled:opacity-50 flex items-center
                           justify-center gap-2"
              >
                {loadingBoleteo ? (
                  <>
                    <IconRefresh size={16} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <IconReceipt size={16} />
                    Boletear
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}