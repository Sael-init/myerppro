"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import documentoVentaService from "@/services/DocumentoventaService";
import condicionPagoService from "@/services/condicionpagoService";
import formasPagoService from "@/services/formaspagoService";
import trabajadorService from "@/services/trabajadorService";
import tipoOpeGratuitaService from "@/services/tipoopegratuitaService";
import monedaService from "@/services/monedaService";
import listaPreciosService from "@/services/listaprecioService";
import { presentacionService } from "@/services/presentacionService";
import DateInput from "@/components/forms/DateInput";
import type { ListaPrecio, ListaPrecioDetalle } from "@/types/listaprecio.types";
import StockDisponible from "@/components/shared/StockDisponible";
import ClienteFormModal from "@/app/dashboard/clientes/components/ClienteFormModal";

import ImportarDVModal from "@/app/dashboard/notacredito/components/ImportarDVModal";

import type {
  CreateDocumentoVentaDTO,
  CreateDocumentoVentaDetalleDTO,
  DocumentoVenta,
  FormDropdownsDocumentoVenta,
  KeyValueOption,
  BienOption,
} from "@/types/Documentoventa.types";
import type { Producto } from "@/types/producto.types";
import type { CondicionPago } from "@/types/condicionpago.types";
import type { FormasPago } from "@/types/formaspago.types";
import type { TipoOpeGratuita } from "@/types/tipoopegratuita.types";
import type { Trabajador } from "@/types/trabajador.types";

import SearchableSelect from "@/components/forms/SearchableSelect";
import DropDownClient from "@/components/shared/DropDownClient";

import {
  IconSend,
  IconPlus,
  IconTrash,
  IconFileInvoice,
  IconUser,
  IconCalendar,
  IconCurrencyDollar,
  IconReceipt,
  IconLoader,
  IconChevronDown,
  IconSearch,
  IconUserCircle,
  IconX,
  IconRefresh,
  IconUserPlus,
  IconFileImport,
  IconArrowLeft,
} from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────────────────────
const EMPRESA_ID  = "005";
const TENANT_ID   = "1";
const DEFAULT_TIPO = "X037";

const TIPOS_NC_ND: Record<string, string> = {
  X037: "NOTA DE CREDITO",
  X038: "NOTA DE DEBITO",
  X077: "NOTA DE CREDITO ESPECIAL",
  X078: "NOTA DE DEBITO ESPECIAL",
};

// ── Utilidad: número a letras (Perú) ─────────────────────────────────────────
function numeroALetras(total: number, monedaId: string): string {
  const moneda = monedaId === "002" ? "DÓLARES AMERICANOS" : monedaId === "003" ? "EUROS" : "SOLES";
  const partes = total.toFixed(2).split(".");
  const centavos = partes[1];

  const uns = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE",
    "DIECIOCHO", "DIECINUEVE"];

  function dec(n: number): string {
    if (n < 20) return uns[n];
    const d = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const u = n % 10;
    if (n < 30) return u === 0 ? "VEINTE" : "VEINTI" + uns[u];
    return u === 0 ? d[Math.floor(n / 10)] : d[Math.floor(n / 10)] + " Y " + uns[u];
  }

  function cen(n: number): string {
    if (n === 0) return "";
    if (n < 100) return dec(n);
    if (n === 100) return "CIEN";
    const c = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
      "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const r = dec(n % 100);
    return r ? c[Math.floor(n / 100)] + " " + r : c[Math.floor(n / 100)];
  }

  function mil(n: number): string {
    if (n < 1000) return cen(n);
    const m = Math.floor(n / 1000);
    const r = cen(n % 1000);
    const pre = m === 1 ? "MIL" : cen(m) + " MIL";
    return r ? pre + " " + r : pre;
  }

  function mill(n: number): string {
    if (n === 0) return "CERO";
    if (n < 1_000_000) return mil(n);
    const m = Math.floor(n / 1_000_000);
    const r = mil(n % 1_000_000);
    const pre = m === 1 ? "UN MILLON" : cen(m) + " MILLONES";
    return r ? pre + " " + r : pre;
  }

  return `SON: ${mill(parseInt(partes[0], 10))} CON ${centavos}/100 ${moneda}`;
}

interface PrecioLimites { min: number; max: number; }

interface NCFormData {
  tipodoccomercialId:          string;
  serie:                       string;
  numero:                      string;
  fechaEmision:                string;
  fechaDoc:                    string;
  monedaId:                    string;
  tipoCambio:                  number;
  clienteId:                   string;
  condicionPago:               string;
  puntoventaId:                string;
  trabajadorId:                string;
  tipopagoId:                  string;
  observacion:                 string;
  ordencompraNumero:           string;
  detraccion:                  boolean;
  detraccionPorcentaje:        number;
  detraccionMonto:             number;
  cuentausuarioId:             string;
  fechaVencimiento?:           string;
  pedidoventaId:               string | null;
  tipoopegratuitaId:           string;
  documentoventaReferenciaId:  string | null;
  motivoelectronicoId:         string;
}

const FORM_INITIAL: NCFormData = {
  tipodoccomercialId:          DEFAULT_TIPO,
  serie:                       "",
  numero:                      "",
  fechaEmision:                "",
  fechaDoc:                    "",
  monedaId:                    "",
  tipoCambio:                  1,
  clienteId:                   "",
  condicionPago:               "",
  puntoventaId:                "",
  trabajadorId:                "",
  tipopagoId:                  "",
  observacion:                 "",
  ordencompraNumero:           "",
  detraccion:                  false,
  detraccionPorcentaje:        0,
  detraccionMonto:             0,
  cuentausuarioId:             "",
  pedidoventaId:               null,
  tipoopegratuitaId:           "00",
  documentoventaReferenciaId:  null,
  motivoelectronicoId:         "",
};

// ─────────────────────────────────────────────────────────────────────────────
const SectionTitle = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-2">
    <Icon className="text-blue-600" size={20} />
    <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
function TrabajadorDDL({ empresaId, value, onChange }: { empresaId: string; value: string; onChange: (id: string) => void }) {
  const [open,        setOpen]        = useState(false);
  const [query,       setQuery]       = useState("");
  const [items,       setItems]       = useState<Trabajador[]>([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected,    setSelected]    = useState<Trabajador | null>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.trabajadorId === value) return;
    trabajadorService.getById(value).then(setSelected).catch(() => setSelected(null));
  }, [value, selected?.trabajadorId]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const normalizeRes = (res: any) => {
    const data =
      (Array.isArray(res?.data)        && res.data)       ||
      (Array.isArray(res?.data?.data)  && res.data.data)  ||
      (Array.isArray(res?.data?.items) && res.data.items) ||
      (Array.isArray(res?.items)       && res.items)      ||
      (Array.isArray(res)              && res)            || [];
    const meta       = res?.meta || res?.data?.meta || res?.data?.Meta || {};
    const totalPages = meta?.totalPages ?? meta?.total_pages ?? meta?.TotalPages ?? 1;
    const currentPage = meta?.currentPage ?? meta?.current_page ?? meta?.CurrentPage ?? meta?.page ?? undefined;
    return { data, totalPages, currentPage };
  };

  const fetchItems = useCallback(async (q: string, pg: number, replace: boolean) => {
    if (!empresaId) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const res: any = await trabajadorService.getAll(empresaId, pg, 15, q || undefined);
      const parsed = normalizeRes(res);
      const data = Array.isArray(parsed.data) ? (parsed.data as Trabajador[]) : [];
      setItems((prev) => (replace ? data : [...prev, ...data]));
      setTotalPages(parsed.totalPages ?? 1);
      setPage(parsed.currentPage ?? pg);
    } catch {
      if (replace) { setItems([]); setTotalPages(1); setPage(1); }
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(query, 1, true), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, fetchItems]);

  const handleScroll = () => {
    if (!listRef.current || loadingMore || page >= totalPages) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 60) fetchItems(query, page + 1, false);
  };

  const handleSelect = (t: Trabajador) => { setSelected(t); onChange(t.trabajadorId); setOpen(false); setQuery(""); };
  const handleClear  = (e: React.MouseEvent) => { e.stopPropagation(); setSelected(null); onChange(""); };

  const displayName = selected ? `${(selected as any).nombres ?? ""} ${(selected as any).apellidos ?? ""}`.trim() || selected.trabajadorId : "";
  const docLabel    = (selected as any)?.numero_doc ?? (selected as any)?.numeroDoc ?? "";

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Trabajador / Vendedor</label>
      <div
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full border rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all select-none ${open ? "border-blue-400 ring-2 ring-blue-500/20 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        <IconUserCircle size={15} className={`shrink-0 ${selected ? "text-blue-500" : "text-slate-400"}`} />
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-800 truncate block leading-tight uppercase">{displayName}</span>
            {docLabel && <span className="text-[10px] text-slate-400 font-mono uppercase">{docLabel}</span>}
          </div>
        ) : (
          <span className="flex-1 text-slate-400 text-sm">Buscar trabajador...</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <button type="button" onClick={handleClear} className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <IconX size={12} />
            </button>
          )}
          <IconChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
            <IconSearch size={14} className="text-slate-400 shrink-0" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, apellido o documento..."
              className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400 bg-transparent" />
            {loading && <IconLoader size={13} className="animate-spin text-blue-500 shrink-0" />}
          </div>
          <ul ref={listRef} onScroll={handleScroll} className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {loading && items.length === 0 ? (
              <li className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400"><IconLoader size={14} className="animate-spin" /> Cargando...</li>
            ) : items.length === 0 ? (
              <li className="py-5 text-center text-xs text-slate-400 italic">Sin resultados</li>
            ) : items.map((t: any) => {
              const nombre = `${t.nombres ?? ""} ${t.apellidos ?? ""}`.trim();
              const doc    = t.numero_doc ?? t.numeroDoc ?? "";
              const cargo  = t.cargo?.descripcion ?? t.cargoDescripcion ?? "";
              const active = t.trabajadorId === value;
              return (
                <li key={t.trabajadorId} onClick={() => handleSelect(t)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-xs transition-colors ${active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {(nombre[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate leading-tight uppercase">{nombre || t.trabajadorId}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate uppercase">{doc}{cargo ? ` · ${cargo}` : ""}</p>
                  </div>
                  {active && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
                </li>
              );
            })}
            {loadingMore && <li className="flex justify-center py-3"><IconLoader size={14} className="animate-spin text-slate-400" /></li>}
          </ul>
          {!loading && items.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-right">
              {items.length} resultado{items.length !== 1 ? "s" : ""}{page < totalPages && " · Scroll para ver más"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contenido principal
// ─────────────────────────────────────────────────────────────────────────────

function CrearNotaCreditoContent() {
  const router = useRouter();

  const [loading,           setLoading]           = useState(false);
  const [loadingCat,        setLoadingCat]        = useState(true);
  const [catalogs,          setCatalogs]          = useState<FormDropdownsDocumentoVenta | null>(null);
  const [condicionesPago,   setCondicionesPago]   = useState<CondicionPago[]>([]);
  const [formasPago,        setFormasPago]        = useState<FormasPago[]>([]);
  const [tiposOpeGratuita,  setTiposOpeGratuita]  = useState<TipoOpeGratuita[]>([]);
  const [selectedListaId,   setSelectedListaId]   = useState<string>("");
  const [listasPrecios,     setListasPrecios]     = useState<ListaPrecio[]>([]);
  const [listaPrecioDetalles, setListaPrecioDetalles] = useState<ListaPrecioDetalle[]>([]);
  const [showStock,         setShowStock]         = useState(false);
  const [presentacionesNuevo, setPresentacionesNuevo] = useState<{ key: string; value: string; factor: number }[]>([]);
  const [loadingPres,       setLoadingPres]       = useState(false);
  const [precioLimitesNuevo, setPrecioLimitesNuevo] = useState<PrecioLimites | null>(null);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [modalImportar,     setModalImportar]     = useState(false);
  const [dvImportadoId,     setDvImportadoId]     = useState<string | null>(null);
  const [clienteDDLKey,     setClienteDDLKey]     = useState(0);
  const [bienCache,         setBienCache]         = useState<Record<string, Producto>>({});
  const [motivosNcNd,       setMotivosNcNd]       = useState<Array<{ motivoelectronicoId: string; tipodocumento: string; concepto: string }>>([]);
  const [igvPorcentaje,     setIgvPorcentaje]     = useState(0.18);

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [formData, setFormData] = useState<NCFormData>({ ...FORM_INITIAL, fechaEmision: today, fechaDoc: today });
  const [detalles, setDetalles] = useState<CreateDocumentoVentaDetalleDTO[]>([]);

  const updateField = useCallback(<K extends keyof NCFormData>(field: K, value: NCFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleMonedaChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monedaId = e.target.value;
    setFormData((prev) => ({ ...prev, monedaId }));
    const tc = await monedaService.getTipoCambio(monedaId);
    setFormData((prev) => ({ ...prev, tipoCambio: tc }));
  }, []);

  const emptyDetalle: CreateDocumentoVentaDetalleDTO = {
    bienId: "", presentacionId: "", cantidad: 1, precio: 0,
    descuentoProducto: 0, afectoInafecto: true, key: "", detraccionPorcentaje: 0,
  };
  const [nuevoDetalle, setNuevoDetalle] = useState<CreateDocumentoVentaDetalleDTO>({ ...emptyDetalle });

  const handleLimpiar = useCallback(() => {
    setFormData({ ...FORM_INITIAL, fechaEmision: today, fechaDoc: today });
    setDetalles([]);
    setNuevoDetalle({ ...emptyDetalle });
    setDvImportadoId(null);
    toast.success("Formulario limpiado");
  }, [today]);

  const handleImportarDV = useCallback((doc: DocumentoVenta) => {
    setFormData((prev) => ({
      ...prev,
      clienteId:                  doc.clienteId            ?? prev.clienteId,
      monedaId:                   doc.monedaId             ?? prev.monedaId,
      tipoCambio:                 doc.tipo_cambio          ?? prev.tipoCambio,
      condicionPago:              doc.condicion_pago        ?? prev.condicionPago,
      puntoventaId:               doc.puntoventaId          ?? prev.puntoventaId,
      trabajadorId:               doc.trabajadorId          ?? prev.trabajadorId,
      tipopagoId:                 (doc as any).formaspagoId ?? (doc as any).tipopagoId ?? prev.tipopagoId,
      observacion:                doc.observacion           ?? prev.observacion,
      serie:                      "",
      documentoventaReferenciaId: doc.documentoventaId,
    }));

    if (doc.detalles && doc.detalles.length > 0) {
      setDetalles(
        doc.detalles.map((det, idx) => ({
          item:                 det.item               ?? idx + 1,
          bienId:               det.bienId             ?? "",
          presentacionId:       det.presentacionId     ?? "",
          cantidad:             det.cantidad           ?? 1,
          precio:               det.precio             ?? 0,
          descuentoProducto:    det.descuentoProducto  ?? 0,
          afectoInafecto:       det.afectoInafecto     ?? true,
          importe:              det.importe            ?? 0,
          conversionTotal:      det.conversionTotal    ?? det.cantidad ?? 1,
          saldoCantidad:        det.saldoCantidad      ?? det.cantidad ?? 1,
          saldoTemporal:        det.saldoTemporal      ?? det.importe  ?? 0,
          precioSinIgv:         det.precioSinIgv       ?? 0,
          porcentajeIgv:        det.porcentajeIgv      ?? 0,
          observacion:          det.observacion        ?? "",
          key:                  (det as any).key       ?? "000",
          detraccionPorcentaje: (det as any).detraccionPorcentaje ?? 0,
        }))
      );
    }

    setDvImportadoId(doc.documentoventaId);
    setClienteDDLKey((k) => k + 1);
    toast.success(`DV ${doc.serie}-${doc.numero} importado · ${doc.detalles?.length ?? 0} ítem(s)`);
  }, []);

  const handleClienteCreado = useCallback(() => {
    setModalNuevoCliente(false);
    setClienteDDLKey((k) => k + 1);
    toast.success("Cliente registrado — ya puedes buscarlo en el campo Cliente");
  }, []);

  // ── Catálogos ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCat(true);
    Promise.allSettled([
      documentoVentaService.getFormDropdowns(EMPRESA_ID, TENANT_ID),
      documentoVentaService.getMotivosNcNd(),
      documentoVentaService.getIgvVigente(),
    ]).then(([dropRes, motivosRes, igvRes]) => {
      if (dropRes.status === "fulfilled") {
        const data = dropRes.value;
        setCatalogs(data);
        setFormData((prev) => ({
          ...prev,
          fechaEmision: today,
          fechaDoc:     today,
          monedaId:     prev.monedaId || (data.monedas?.[0]?.key?.toString() ?? ""),
          tipoCambio:   prev.tipoCambio || 1,
        }));
      } else {
        toast.error("No se pudieron cargar los catálogos del formulario");
      }
      if (motivosRes.status === "fulfilled") setMotivosNcNd(motivosRes.value);
      if (igvRes.status    === "fulfilled") setIgvPorcentaje(igvRes.value);
    }).finally(() => setLoadingCat(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      const [resCP, resFP, resTOG] = await Promise.allSettled([
        condicionPagoService.getAll(),
        formasPagoService.getAll(1, 100),
        tipoOpeGratuitaService.getAll(),
      ]);
      const cp = resCP.status === "fulfilled" ? resCP.value : [];
      setCondicionesPago(cp);
      setFormasPago(resFP.status === "fulfilled" ? (resFP.value as any).data : []);
      setTiposOpeGratuita(resTOG.status === "fulfilled" ? resTOG.value : []);
      if (cp.length > 0) {
        setFormData((prev) => ({
          ...prev,
          condicionPago: prev.condicionPago || ((cp[0] as any).condicionPagoId ?? (cp[0] as any).condicion_pago ?? ""),
        }));
      }
    };
    load();
  }, []);

  useEffect(() => {
    listaPreciosService
      .getByEmpresa(EMPRESA_ID, 1, 100)
      .then((res) => {
        const disponibles = res.data.filter((lp: any) => {
          const desc = (lp.estado?.descripcion ?? "").toLowerCase().trim();
          const code = (lp.estado_listprec ?? "").toLowerCase().trim();
          return desc !== "anulado" && code !== "anulado";
        });
        setListasPrecios(disponibles);
        if (disponibles.length > 0 && !disponibles.find((lp) => lp.listaprecioId === selectedListaId)) {
          setSelectedListaId(disponibles[0].listaprecioId);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedListaId) return;
    listaPreciosService.getById(selectedListaId).then((lp: any) => setListaPrecioDetalles(lp.detalles ?? [])).catch(() => {});
  }, [selectedListaId]);

  // Cuando cambia el punto de venta, re-seleccionar la primera lista disponible si la actual ya no aplica
  useEffect(() => {
    if (!formData.puntoventaId || listasPrecios.length === 0) return;
    const filtradas = listasPrecios.filter(
      (lp) =>
        !lp.puntoventa ||
        lp.puntoventa.length === 0 ||
        lp.puntoventa.some((pv) => pv.puntoventaId === formData.puntoventaId)
    );
    if (filtradas.length > 0 && !filtradas.find((lp) => lp.listaprecioId === selectedListaId)) {
      setSelectedListaId(filtradas[0].listaprecioId);
      setPrecioLimitesNuevo(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.puntoventaId, listasPrecios]);

  // ── Helpers / memos ───────────────────────────────────────────────────────
  const toOpts = (items: KeyValueOption[] = []) =>
    items.map((x) => ({ key: x.key?.toString() ?? "", value: x.value || `COD: ${x.key}` }));

  const monedaLabel = useMemo(() => {
    const found = catalogs?.monedas?.find((m) => m.key?.toString() === formData.monedaId);
    if (!found) return "S/";
    const v = (found.value ?? "").toUpperCase();
    if (v.includes("DOLAR")) return "US$";
    if (v.includes("EURO"))  return "€";
    return "S/";
  }, [catalogs, formData.monedaId]);

  const seriesFiltradas = useMemo(() => {
    if (!catalogs?.series || !formData.puntoventaId || !formData.tipodoccomercialId) return [];
    return (
      catalogs.series.find(
        (g) =>
          g.tipodoccomercialId === formData.tipodoccomercialId &&
          g.puntoventaId === formData.puntoventaId
      )?.items ?? []
    );
  }, [catalogs, formData.puntoventaId, formData.tipodoccomercialId]);

  const siguienteNumero = useMemo(() => {
    if (!catalogs?.siguientes_numeros || !formData.puntoventaId || !formData.serie) return "";
    return catalogs.siguientes_numeros.find(
      (n) => n.tipodoccomercialId === formData.tipodoccomercialId && n.puntoventaId === formData.puntoventaId && n.serie === formData.serie
    )?.siguienteNumero ?? "";
  }, [catalogs, formData.puntoventaId, formData.tipodoccomercialId, formData.serie]);

  // Mapeo tipodoccomercialId → abreviatura que usa la tabla de motivos
  const abreviaturaTipoDoc = useMemo(() => {
    if (!formData.tipodoccomercialId) return "";
    // Primero intenta obtenerla desde los catálogos cargados
    const fromCatalog = (catalogs?.tipos_documento_comercial ?? []).find(
      (t) => String(t.key) === formData.tipodoccomercialId
    );
    if (fromCatalog) {
      const abrev = (fromCatalog as any).abreviatura ?? (fromCatalog as any).abrev ?? "";
      if (abrev) return abrev.trim().toUpperCase();
    }
    // Fallback estático basado en los IDs conocidos
    const NC_IDS = new Set(["X037", "X077"]);
    const ND_IDS = new Set(["X038", "X078"]);
    if (NC_IDS.has(formData.tipodoccomercialId)) return "NC";
    if (ND_IDS.has(formData.tipodoccomercialId)) return "ND";
    return formData.tipodoccomercialId;
  }, [catalogs, formData.tipodoccomercialId]);

  const motivosFiltrados = useMemo(() => {
    if (!abreviaturaTipoDoc || motivosNcNd.length === 0) return [];
    return motivosNcNd.filter(
      (m) => m.tipodocumento?.trim().toUpperCase() === abreviaturaTipoDoc
    );
  }, [motivosNcNd, abreviaturaTipoDoc]);

  const cargarProducto = useCallback(async (bienId: string): Promise<Producto | null> => {
    if (!bienId) return null;
    if (bienCache[bienId]) return bienCache[bienId];
    const bien = catalogs?.bienes?.find((b) => b.key?.toString() === bienId) as any;
    if (!bien) return null;
    const producto: Producto = {
      bienId,
      descripcion:             bien.value ?? bienId,
      afecto_inafecto:         bien.afecto_inafecto         ?? true,
      detraccionbienserviceId: bien.detraccionbienserviceId ?? "000",
      detraccion_porcentaje:   bien.detraccionPorcentaje    ?? 0,
      precio: 0, costo: 0, tipobienId: 0, subclasebienId: "", unidadmedidaId: "", estado: true,
    } as Producto;
    setBienCache((prev) => ({ ...prev, [bienId]: producto }));
    return producto;
  }, [bienCache, catalogs]);

  const getBienNombre = useCallback((bienId: string) => {
    const cached = bienCache[bienId];
    if (cached?.descripcion) return cached.descripcion;
    return catalogs?.bienes?.find((b) => b.key?.toString() === bienId)?.value ?? bienId;
  }, [catalogs, bienCache]);

  const getPresentacionNombre = useCallback((bienId: string, presentacionId: string) => {
    const g = catalogs?.presentaciones?.find((g) => g.bienId === bienId);
    return g?.items?.find((p) => p.key?.toString() === presentacionId)?.value ?? presentacionId;
  }, [catalogs]);

  const getPresentacionFactor = useCallback((bienId: string, presentacionId: string): number => {
    const dyn = presentacionesNuevo.find((p) => p.key === presentacionId);
    if (dyn) return dyn.factor;
    const g = catalogs?.presentaciones?.find((g) => g.bienId === bienId);
    return g?.items?.find((p) => p.key?.toString() === presentacionId)?.factor ?? 1;
  }, [catalogs, presentacionesNuevo]);

  const getBienDetraccionInfo = useCallback((bienId: string): { key: string; detraccionPorcentaje: number; afectoInafecto: boolean } => {
    const cached = bienCache[bienId];
    if (cached) return { key: cached.detraccionbienserviceId ?? "000", detraccionPorcentaje: cached.detraccion_porcentaje ?? 0, afectoInafecto: cached.afecto_inafecto ?? true };
    const bien = catalogs?.bienes?.find((b) => b.key === bienId) as BienOption | undefined;
    return { key: bien?.detraccionbienserviceId ?? "000", detraccionPorcentaje: bien?.detraccionPorcentaje ?? 0, afectoInafecto: bien?.afecto_inafecto ?? true };
  }, [catalogs, bienCache]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const bienesDisponibles = useMemo(() => {
    if (!catalogs?.bienes) return [];
    return catalogs.bienes.map((b) => ({ key: String(b.key), value: (b as any).value || String(b.key) }));
  }, [catalogs]);

  const presentacionOptsNuevo = useMemo(() => presentacionesNuevo, [presentacionesNuevo]);

  const handlePresentacionNuevoChange = useCallback((presentacionId: string) => {
    const det = listaPrecioDetalles.find((d) => d.presentacionId === presentacionId);
    let precio = 0;
    let limites: PrecioLimites | null = null;
    if (det) {
      precio  = det.precio_minimo_minorista ?? 0;
      limites = { min: det.precio_minimo_minorista ?? 0, max: det.precio_minimo_minorista ?? 0 };
    }
    setPrecioLimitesNuevo(limites);
    setNuevoDetalle((prev) => ({ ...(prev as any), presentacionId, ...(precio > 0 ? { precio } : {}) }));
  }, [listaPrecioDetalles, formData.monedaId]);

  const formasPagoFiltradas = useMemo(() => {
    if (!formData.condicionPago || formasPago.length === 0) return [];
    const selectedCP = condicionesPago.find(
      (cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === formData.condicionPago
    ) as any;
    if (!selectedCP) return formasPago;
    const condDesc = (
      (selectedCP.descripcion ?? selectedCP.condicion_pago ?? formData.condicionPago) as string
    ).toUpperCase();
    return formasPago.filter((fp: any) =>
      (fp.condicionPago ?? "").toUpperCase() === condDesc
    );
  }, [formData.condicionPago, condicionesPago, formasPago]);

  const selectedFormaPago = useMemo(
    () => formasPago.find((f: any) => (f.formaspagoId ?? "") === (formData.tipopagoId ?? "")),
    [formasPago, formData.tipopagoId]
  );

  const isCondicionCredito = useMemo(() => {
    if (!formData.condicionPago) return false;
    const sel = condicionesPago.find((cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === formData.condicionPago) as any;
    return ((sel?.descripcion ?? sel?.condicion_pago ?? formData.condicionPago) as string).toUpperCase().includes("CRED");
  }, [formData.condicionPago, condicionesPago]);

  useEffect(() => {
    if (!isCondicionCredito || !selectedFormaPago) return;
    const fp = selectedFormaPago as any;
    const dias = fp.diasFormPago != null && Number(fp.diasFormPago) > 0
      ? Number(fp.diasFormPago)
      : (() => { const m = (fp.descripcion ?? "").match(/\b(\d+)\b/); return m ? parseInt(m[1], 10) : null; })();
    if (dias && dias > 0) {
      const hoy = new Date();
      const r = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
      const pad = (n: number) => n.toString().padStart(2, "0");
      updateField("fechaVencimiento", `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`);
    }
  }, [selectedFormaPago, isCondicionCredito]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCondicionGratuita = useMemo(() => {
    if (!formData.condicionPago) return false;
    const sel = condicionesPago.find((cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === formData.condicionPago) as any;
    return ((sel?.descripcion ?? sel?.condicion_pago ?? formData.condicionPago) as string).toUpperCase().includes("GRATU");
  }, [formData.condicionPago, condicionesPago]);

  const totales = useMemo(() => {
    let valorventaAfecto = 0, valorventaInafecto = 0, igvTotal = 0, gratuito = 0;
    (detalles as any[]).forEach((det: any) => {
      const subtotal = det.cantidad * det.precio - (det.descuentoProducto || 0);
      if (isCondicionGratuita) {
        gratuito += subtotal;
      } else if (det.afectoInafecto) {
        const base = subtotal / (1 + igvPorcentaje);
        valorventaAfecto += base;
        igvTotal         += subtotal - base;
      } else {
        valorventaInafecto += subtotal;
      }
    });
    const total = valorventaAfecto + igvTotal + valorventaInafecto;
    return {
      valorventaAfecto:   Math.round(valorventaAfecto   * 100) / 100,
      valorventaInafecto: Math.round(valorventaInafecto * 100) / 100,
      igv:                Math.round(igvTotal           * 100) / 100,
      total:              Math.round(total              * 100) / 100,
      gravado:            Math.round(valorventaAfecto   * 100) / 100,
      exonerado:          Math.round(valorventaInafecto * 100) / 100,
      gratuito:           Math.round(gratuito           * 100) / 100,
    };
  }, [detalles, isCondicionGratuita, igvPorcentaje]);

  const detraccionMonto = useMemo(() => {
    if (!formData.detraccion || !formData.detraccionPorcentaje) return 0;
    return Math.round(totales.total * ((formData.detraccionPorcentaje || 0) / 100) * 100) / 100;
  }, [formData.detraccion, formData.detraccionPorcentaje, totales.total]);

  // ── Validación ────────────────────────────────────────────────────────────
  const validarFormulario = (): boolean => {
    if (!formData.tipodoccomercialId)  { toast.error("Seleccione el tipo de documento");    return false; }
    if (!formData.motivoelectronicoId) { toast.error("Seleccione el motivo electrónico");   return false; }
    if (!formData.clienteId)           { toast.error("Seleccione el cliente");              return false; }
    if (!formData.puntoventaId)        { toast.error("Seleccione el punto de venta");       return false; }
    if (!formData.monedaId)            { toast.error("Seleccione la moneda");               return false; }
    if (!formData.condicionPago)       { toast.error("Seleccione la condición de pago");    return false; }
    if (detalles.length === 0)         { toast.error("Agregue al menos un item");           return false; }
    if (isCondicionCredito && !formData.fechaVencimiento) { toast.error("Ingrese la fecha de vencimiento para crédito"); return false; }
    return true;
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validarFormulario()) return;
    if (!formData.serie) { toast.error("Seleccione la serie"); return; }

    setLoading(true);
    try {
      const dto: CreateDocumentoVentaDTO = {
        ...(formData as any),
        tipodoccomercialId:   formData.tipodoccomercialId,
        serie:                formData.serie,
        numero:               siguienteNumero || undefined,
        motivoelectronicoId:  formData.motivoelectronicoId || undefined,
        valorventaAfecto:     totales.valorventaAfecto,
        valorventaInafecto:   totales.valorventaInafecto,
        igv:                  totales.igv,
        total:                totales.total,
        saldo:                totales.total,
        detraccionMonto:      formData.detraccion ? detraccionMonto : 0,
        totalLetras:          numeroALetras(totales.total, formData.monedaId),
        detalles:             detalles as any,
      };

      const res = await documentoVentaService.crearNotaCredito(dto);

      if (!res.documentoVentaId) {
        toast.error(res.message || "Error al guardar el documento");
        return;
      }

      const correlativo = res.serie && res.numero ? ` ${res.serie}-${res.numero}` : "";
      res.isSuccess
        ? toast.success(`Nota de crédito${correlativo} creada y enviada a SUNAT`)
        : toast.warning(`Guardado con advertencias: ${res.message ?? "revisar en la lista"}`);

      router.push("/dashboard/notacredito");
    } catch (error: any) {
      toast.error(error.message || "Error crítico al guardar");
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers detalles ─────────────────────────────────────────────────────
  const handleAgregarDetalle = async () => {
    if (!(nuevoDetalle as any).bienId)         return toast.error("Seleccione el producto");
    if (!(nuevoDetalle as any).presentacionId) return toast.error("Seleccione la presentación");
    if ((nuevoDetalle as any).cantidad <= 0)   return toast.error("La cantidad debe ser mayor a 0");
    if ((nuevoDetalle as any).precio   <= 0)   return toast.error("El precio debe ser mayor a 0");
    if (precioLimitesNuevo && (nuevoDetalle as any).precio < precioLimitesNuevo.min)
      return toast.error(`El precio no puede ser menor al mínimo (${precioLimitesNuevo.min.toFixed(2)})`);

    await cargarProducto((nuevoDetalle as any).bienId);

    const factor          = getPresentacionFactor((nuevoDetalle as any).bienId, (nuevoDetalle as any).presentacionId);
    const conversionTotal = Math.round((nuevoDetalle as any).cantidad * factor * 1_000_000) / 1_000_000;
    const importe         = Math.round(((nuevoDetalle as any).cantidad * (nuevoDetalle as any).precio - ((nuevoDetalle as any).descuentoProducto || 0)) * 100) / 100;
    let precioSinIgv = (nuevoDetalle as any).precio, porcentajeIgv = 0;
    if ((nuevoDetalle as any).afectoInafecto) {
      precioSinIgv  = Math.round(((nuevoDetalle as any).precio / (1 + igvPorcentaje)) * 1_000_000) / 1_000_000;
      porcentajeIgv = Math.round(igvPorcentaje * 100);
    }
    const detraccionInfo = getBienDetraccionInfo((nuevoDetalle as any).bienId);

    setDetalles((prev: any) => [
      ...prev,
      {
        ...(nuevoDetalle as any),
        item: prev.length + 1,
        conversionTotal, importe,
        saldoCantidad:            (nuevoDetalle as any).cantidad,
        saldoTemporal:            importe,
        cantidadPendienteBoleteo: (nuevoDetalle as any).cantidad,
        precioSinIgv, porcentajeIgv,
        key:                  detraccionInfo.key,
        detraccionPorcentaje: detraccionInfo.detraccionPorcentaje,
        afectoInafecto:       detraccionInfo.afectoInafecto,
      },
    ]);
    setNuevoDetalle({ ...emptyDetalle });
    setPrecioLimitesNuevo(null);
  };

  const handleEliminarDetalle = (idx: number) => {
    setDetalles((prev: any) =>
      prev.filter((_: any, i: number) => i !== idx).map((d: any, i: number) => ({ ...d, item: i + 1 }))
    );
  };

  const handleCantidadChange = (idx: number, newCantidad: number) => {
    setDetalles((prev: any) =>
      prev.map((det: any, i: number) => {
        if (i !== idx) return det;
        const cantidad        = Math.max(newCantidad, 0);
        const factor          = getPresentacionFactor(det.bienId, det.presentacionId);
        const conversionTotal = Math.round(cantidad * factor * 1_000_000) / 1_000_000;
        const importe         = Math.round((cantidad * det.precio - (det.descuentoProducto || 0)) * 100) / 100;
        return {
          ...det,
          cantidad,
          conversionTotal,
          importe,
          saldoCantidad:            cantidad,
          saldoTemporal:            importe,
          cantidadPendienteBoleteo: cantidad,
        };
      })
    );
  };

  const handlePrecioChange = (idx: number, newPrecio: number) => {
    setDetalles((prev: any) =>
      prev.map((det: any, i: number) => {
        if (i !== idx) return det;
        const precio  = Math.max(newPrecio, 0);
        const importe = Math.round((det.cantidad * precio - (det.descuentoProducto || 0)) * 100) / 100;
        return { ...det, precio, importe };
      })
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 pb-20 max-w-6xl mx-auto uppercase">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/notacredito")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5 normal-case">
              <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => router.push("/dashboard/notacredito")}>
                Notas de Crédito
              </span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">Nueva Nota de Crédito</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {TIPOS_NC_ND[formData.tipodoccomercialId] ?? "Nota de Crédito / Débito"}
            </h1>
            {dvImportadoId && (
              <p className="text-xs text-emerald-600 font-semibold mt-0.5 normal-case">
                ✓ DV referenciado {formData.documentoventaReferenciaId} — datos pre-cargados
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalImportar(true)}
            disabled={loadingCat || loading}
            className="px-4 py-2.5 rounded-lg border border-blue-300 text-blue-700 font-bold hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <IconFileImport size={17} />
            Importar DV
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <IconRefresh size={17} />
            Limpiar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loadingCat || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <IconLoader size={18} className="animate-spin" /> : <IconSend size={18} />}
            Guardar
          </button>
        </div>
      </div>

      {/* ── Banner carga catálogos ── */}
      {loadingCat && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <IconLoader size={14} className="animate-spin" />
          Cargando catálogos del formulario...
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* ── Datos del Documento ── */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <SectionTitle title="Datos del Documento" icon={IconFileInvoice} />

            {/* Tipo documento */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">
                Tipo Documento Comercial *
              </label>
              <select
                value={formData.tipodoccomercialId}
                onChange={(e) => {
                  updateField("tipodoccomercialId", e.target.value);
                  updateField("serie", "");
                  updateField("motivoelectronicoId", "");
                }}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold uppercase"
              >
                {Object.entries(TIPOS_NC_ND).map(([id, desc]) => (
                  <option key={id} value={id}>{id} — {desc}</option>
                ))}
              </select>
            </div>

            {/* Motivo electrónico */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">
                Motivo Electrónico *
              </label>
              <select
                value={formData.motivoelectronicoId}
                onChange={(e) => updateField("motivoelectronicoId", e.target.value)}
                disabled={motivosFiltrados.length === 0}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {motivosNcNd.length === 0
                    ? "Cargando motivos..."
                    : !formData.tipodoccomercialId
                    ? "Seleccione tipo de documento primero"
                    : motivosFiltrados.length === 0
                    ? "Sin motivos para este tipo de documento"
                    : "Seleccione motivo..."}
                </option>
                {motivosFiltrados.map((m) => {
                  const id = m.motivoelectronicoId.trim();
                  return (
                    <option key={id} value={id}>
                      {id} — {m.concepto}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <SearchableSelect
                label="Punto de Venta *"
                name="puntoventaId"
                options={toOpts(catalogs?.puntos_venta ?? [])}
                value={formData.puntoventaId}
                onChange={(e: any) => { handleChange(e); updateField("serie", ""); }}
                disabled={loadingCat}
              />
              <TrabajadorDDL
                empresaId={EMPRESA_ID}
                value={formData.trabajadorId || ""}
                onChange={(id) => updateField("trabajadorId", id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serie *</label>
                  <select
                    name="serie"
                    value={formData.serie}
                    onChange={(e) => updateField("serie", e.target.value)}
                    disabled={seriesFiltradas.length === 0}
                    className={`w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest text-center transition-all uppercase ${
                      seriesFiltradas.length === 0 ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white text-slate-800"
                    }`}
                  >
                    <option value="">{!formData.puntoventaId ? "-- Serie --" : seriesFiltradas.length === 0 ? "Sin series" : "-- Serie --"}</option>
                    {seriesFiltradas.map((s) => (
                      <option key={s.key} value={s.key.toString()}>{s.value}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Número</label>
                  <div className="w-full border rounded-lg p-2.5 text-sm font-mono text-center uppercase border-slate-200 bg-slate-50 text-slate-700 font-bold">
                    {siguienteNumero
                      ? siguienteNumero
                      : <span className="italic text-slate-400 text-xs">{formData.serie ? "Sin datos" : "(Automático)"}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha de Emisión</label>
                <div className="h-[42px] flex items-center justify-center border border-slate-100 rounded-lg bg-slate-50 font-mono text-sm text-slate-600 font-bold">
                  {(() => { const [y, m, d] = today.split("-"); return `${d}/${m}/${y}`; })()}
                </div>
              </div>
            </div>

            {/* ── Cliente ── */}
            <div className="border-t border-slate-200 mt-6 pt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <IconUser className="text-blue-600" size={20} />
                  <h3 className="font-bold text-sm uppercase tracking-wide">Cliente</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevoCliente(true)}
                  disabled={loadingCat || loading}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40"
                >
                  <IconUserPlus size={14} /> Nuevo Cliente
                </button>
              </div>
              {dvImportadoId && (
                <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg mb-3 font-semibold border border-amber-200">
                  Campo bloqueado — cliente del DV importado
                </div>
              )}
              <DropDownClient
                key={clienteDDLKey}
                tenantId={TENANT_ID}
                name="clienteId"
                label="Cliente (Destinatario) *"
                value={formData.clienteId}
                onChange={handleChange}
                filtroTipoDoc={null}
                disabled={!!dvImportadoId}
              />
            </div>
          </div>

          {/* ── Condiciones de Pago ── */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <SectionTitle title="Condiciones de Pago" icon={IconCalendar} />
            <div className="space-y-4">

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Moneda *</label>
                <select name="monedaId" value={formData.monedaId} onChange={handleMonedaChange}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase">
                  {catalogs?.monedas && catalogs.monedas.length > 0
                    ? catalogs.monedas.map((m) => <option key={m.key} value={m.key.toString()}>{m.key} - {m.value}</option>)
                    : (<><option value="001">001 - SOLES</option><option value="002">002 - DÓLARES</option></>)}
                </select>
              </div>

              {formData.monedaId && formData.monedaId !== "001" && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <IconCurrencyDollar size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700">
                    Tipo de cambio (venta): <strong className="font-mono">{(formData.tipoCambio ?? 1).toFixed(3)}</strong>
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condición de Pago *</label>
                <select value={formData.condicionPago ?? ""}
                  onChange={(e) => { updateField("condicionPago", e.target.value); updateField("tipopagoId", ""); updateField("tipoopegratuitaId", "00"); updateField("fechaVencimiento", undefined); }}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase">
                  <option value="">Seleccione...</option>
                  {condicionesPago.map((cp: any) => {
                    const id = cp.condicionPagoId ?? cp.condicion_pago;
                    return <option key={id} value={id}>{cp.descripcion ?? cp.condicion_pago}</option>;
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Forma de Pago</label>
                <select value={formData.tipopagoId ?? ""} onChange={(e) => updateField("tipopagoId", e.target.value)}
                  disabled={!formData.condicionPago}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
                  <option value="">
                    {!formData.condicionPago ? "Seleccione primero condición de pago" : "Seleccione..."}
                  </option>
                  {formasPagoFiltradas.map((fp: any) => (
                    <option key={fp.formaspagoId ?? fp.descripcion} value={fp.formaspagoId ?? ""}>
                      {fp.descripcion}{fp.diasFormPago != null ? ` (${fp.diasFormPago}d)` : ""}
                    </option>
                  ))}
                </select>
                {(selectedFormaPago as any)?.diasFormPago != null && (
                  <p className="text-[11px] text-emerald-600 font-semibold ml-1">
                    Plazo: {(selectedFormaPago as any).diasFormPago} día{(selectedFormaPago as any).diasFormPago !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {isCondicionGratuita && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo de Operación Gratuita *</label>
                  <select value={formData.tipoopegratuitaId ?? "00"} onChange={(e) => updateField("tipoopegratuitaId", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase">
                    {tiposOpeGratuita.map((tog) => (
                      <option key={tog.tipoopegratuitaId} value={tog.tipoopegratuitaId}>
                        {tog.tipoopegratuitaId} – {tog.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isCondicionCredito && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <DateInput
                    label="Fecha Vencimiento *"
                    name="fechaVencimiento"
                    value={formData.fechaVencimiento || ""}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: Resumen ── */}
        <div className="col-span-12 lg:col-span-4 self-start sticky top-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-5 py-4">
              <h3 className="text-white font-bold text-base uppercase tracking-wide">Resumen</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="border-t border-slate-100 pt-4 space-y-3">
                {[
                  { label: "Total Gravado",   val: totales.gravado   },
                  { label: "Total Exonerado", val: totales.exonerado },
                  { label: "Total Gratuito",  val: totales.gratuito  },
                  { label: `IGV (${Math.round(igvPorcentaje * 100)}%)`, val: totales.igv },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between items-center py-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
                    <span className="text-base font-mono font-bold text-slate-800">{monedaLabel} {formatMoney(val)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-blue-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700 uppercase">Total</span>
                  <span className="text-2xl font-bold font-mono text-blue-700">{monedaLabel} {formatMoney(totales.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detalles del Documento ── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
          <div className="flex items-center gap-2 text-slate-800">
            <IconReceipt className="text-blue-600" size={20} />
            <h3 className="font-bold text-sm uppercase tracking-wide">Detalles del Documento</h3>
          </div>
        </div>

        {/* Barra stock */}
        {(nuevoDetalle as any).bienId && (
          <div className="flex items-center justify-end gap-2 mb-3">
            <button
              type="button"
              onClick={() => setShowStock(true)}
              className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Ver stock disponible
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3 w-10 text-center">Item</th>
                <th className="p-3 w-24">Código</th>
                <th className="p-3">Producto</th>
                <th className="p-3 text-center w-24">Cant.</th>
                <th className="p-3 w-32">Presentación</th>
                <th className="p-3 text-center w-24">Conversión</th>
                <th className="p-3 text-right w-28">Precio</th>
                <th className="p-3 text-right w-28">Importe</th>
                <th className="p-3 text-center w-16">Afecto</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalles.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-3 text-center text-slate-400 italic text-[11px]">
                    Sin ítems aún — usa la fila de abajo para agregar productos.
                  </td>
                </tr>
              )}
              {(detalles as any[]).map((det: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-center text-slate-400 font-mono font-bold">{det.item}</td>
                  <td className="p-3 font-mono text-slate-500 text-[10px] uppercase">{det.bienId}</td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-800 block leading-tight uppercase">{getBienNombre(det.bienId)}</span>
                    {det.key && det.key !== "000" && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded uppercase">Det. {det.key} {det.detraccionPorcentaje}%</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono">
                    <input
                      type="number" min={0.01} step="0.01" value={det.cantidad}
                      onChange={(e) => handleCantidadChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-center text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-3 text-slate-600 text-[10px] uppercase">{getPresentacionNombre(det.bienId, det.presentacionId)}</td>
                  <td className="p-3 text-center font-mono text-slate-600">{(det.conversionTotal ?? det.cantidad).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono">
                    <input
                      type="number" min={0} step="0.0001" value={det.precio}
                      onChange={(e) => handlePrecioChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-24 border border-slate-300 rounded px-2 py-1 text-right text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-800">{monedaLabel} {(det.importe || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    {det.afectoInafecto === false
                      ? <span className="text-[10px] font-semibold text-amber-600">Inafecto</span>
                      : <span className="text-[10px] font-semibold text-green-600">Afecto</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleEliminarDetalle(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Fila agregar */}
              <tr className="bg-blue-50/30 border-t-2 border-dashed border-blue-200">
                <td className="p-2 text-center text-blue-400 font-mono font-bold text-sm select-none">+</td>
                <td className="p-1.5 text-[10px] text-slate-400 font-mono">—</td>
                <td className="p-1.5 min-w-[220px]">
                  <SearchableSelect
                    name="nuevo_bienId"
                    options={bienesDisponibles}
                    value={(nuevoDetalle as any).bienId ?? ""}
                    disabled={loadingCat}
                    placeholder="Buscar producto..."
                    onChange={async (e: any) => {
                      const bienId = e.target.value;
                      setPresentacionesNuevo([]);
                      setPrecioLimitesNuevo(null);
                      setNuevoDetalle((prev) => ({ ...(prev as any), bienId, presentacionId: "", precio: 0 }));
                      setLoadingPres(true);
                      const [producto, presRes] = await Promise.allSettled([
                        cargarProducto(bienId),
                        presentacionService.getByBien(bienId, true),
                      ]);
                      setLoadingPres(false);
                      if (presRes.status === "fulfilled") {
                        const items = (presRes.value?.data ?? []).map((p: any) => ({ key: p.presentacionId, value: p.descripcion, factor: p.cantidad ?? 1 }));
                        setPresentacionesNuevo(items);
                      }
                      const prod = producto.status === "fulfilled" ? producto.value : null;
                      const di = prod
                        ? { key: prod.detraccionbienserviceId ?? "000", detraccionPorcentaje: prod.detraccion_porcentaje ?? 0, afectoInafecto: prod.afecto_inafecto ?? true }
                        : getBienDetraccionInfo(bienId);
                      setNuevoDetalle((prev) => ({ ...(prev as any), key: di.key, detraccionPorcentaje: di.detraccionPorcentaje, afectoInafecto: di.afectoInafecto }));
                    }}
                  />
                </td>
                <td className="p-1.5 w-24">
                  <input
                    type="number" min={0.01} step="0.01" value={(nuevoDetalle as any).cantidad} disabled={loadingCat}
                    onChange={(e: any) => setNuevoDetalle((prev) => ({ ...(prev as any), cantidad: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs text-center font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 transition-all"
                  />
                </td>
                <td className="p-1.5 min-w-[130px]">
                  <SearchableSelect
                    name="nuevo_presentacionId"
                    options={presentacionOptsNuevo}
                    value={(nuevoDetalle as any).presentacionId ?? ""}
                    disabled={loadingCat || loadingPres || !(nuevoDetalle as any).bienId}
                    placeholder={loadingPres ? "Cargando..." : "-- Presentación --"}
                    onChange={(e: any) => handlePresentacionNuevoChange(e.target.value)}
                  />
                </td>
                <td className="p-2 text-center font-mono text-xs text-slate-400">
                  {(nuevoDetalle as any).bienId && (nuevoDetalle as any).presentacionId
                    ? ((nuevoDetalle as any).cantidad * getPresentacionFactor((nuevoDetalle as any).bienId, (nuevoDetalle as any).presentacionId)).toFixed(2)
                    : "—"}
                </td>
                <td className="p-1.5 w-28">
                  <input
                    type="number" min={precioLimitesNuevo?.min ?? 0} step="0.01"
                    value={(nuevoDetalle as any).precio} disabled={loadingCat}
                    onChange={(e: any) => setNuevoDetalle((prev) => ({ ...(prev as any), precio: parseFloat(e.target.value) || 0 }))}
                    className={`w-full border rounded-lg px-2 py-2 text-xs text-right font-mono outline-none focus:ring-2 transition-all disabled:bg-slate-50 ${
                      precioLimitesNuevo && (nuevoDetalle as any).precio < precioLimitesNuevo.min
                        ? "border-red-400 focus:ring-red-400 bg-red-50"
                        : "border-slate-200 focus:ring-blue-500"
                    }`}
                  />
                  {precioLimitesNuevo && precioLimitesNuevo.min > 0 && (
                    <p className="text-[9px] text-slate-400 mt-0.5">Mín: {precioLimitesNuevo.min.toFixed(2)}</p>
                  )}
                </td>
                <td className="p-2 text-right font-mono text-xs text-slate-500">
                  {(nuevoDetalle as any).bienId
                    ? formatMoney(Math.max(0, (nuevoDetalle as any).cantidad * (nuevoDetalle as any).precio - ((nuevoDetalle as any).descuentoProducto || 0)))
                    : "—"}
                </td>
                <td className="p-2 text-center">
                  {(nuevoDetalle as any).bienId
                    ? (nuevoDetalle as any).afectoInafecto === false
                      ? <span className="text-[10px] font-semibold text-amber-600">Inafecto</span>
                      : <span className="text-[10px] font-semibold text-green-600">Afecto</span>
                    : <span className="text-slate-300 text-[10px]">—</span>}
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAgregarDetalle}
                    className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center mx-auto transition-all active:scale-95"
                    title="Agregar ítem"
                  >
                    <IconPlus size={14} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showStock && (nuevoDetalle as any).bienId && (
        <StockDisponible
          empresaId={EMPRESA_ID}
          bienId={(nuevoDetalle as any).bienId}
          bienNombre={getBienNombre((nuevoDetalle as any).bienId)}
          onClose={() => setShowStock(false)}
        />
      )}

      {modalNuevoCliente && (
        <ClienteFormModal
          isOpen={modalNuevoCliente}
          onClose={() => setModalNuevoCliente(false)}
          onSuccess={handleClienteCreado}
          tenantId={TENANT_ID}
        />
      )}

      {modalImportar && (
        <ImportarDVModal
          empresaId={EMPRESA_ID}
          onImportar={handleImportarDV}
          onClose={() => setModalImportar(false)}
        />
      )}
    </div>
  );
}

export default function CrearNotaCreditoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Cargando formulario...</span>
        </div>
      </div>
    }>
      <CrearNotaCreditoContent />
    </Suspense>
  );
}
