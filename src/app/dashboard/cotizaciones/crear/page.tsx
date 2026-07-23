"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import cotizacionService     from "@/services/cotizacionService";
import trabajadorService     from "@/services/trabajadorService";
import condicionPagoService  from "@/services/condicionpagoService";
import formasPagoService     from "@/services/formaspagoService";
import documentoVentaService from "@/services/DocumentoventaService";
import clienteService        from "@/services/clienteService";
import monedaService         from "@/services/monedaService";
import { presentacionService } from "@/services/presentacionService";
import listaPreciosService   from "@/services/listaprecioService";
import cuentaUsuarioService  from "@/services/cuentausuarioService";
import type { ListaPrecio, ListaPrecioDetalle } from "@/types/listaprecio.types";

import type { Cotizacion, CotizacionDetalle } from "@/types/cotizacion.types";
import type { CondicionPago }                 from "@/types/condicionpago.types";
import type { FormasPago }                    from "@/types/formaspago.types";
import type { Trabajador }                    from "@/types/trabajador.types";
import type {
  KeyValueOption,
  FormDropdownsDocumentoVenta,
} from "@/types/Documentoventa.types";

import SearchableSelect from "@/components/forms/SearchableSelect";
import DateInput        from "@/components/forms/DateInput";
import DropDownClient   from "@/components/shared/DropDownClient";

import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader,
  IconPlus,
  IconTrash,
  IconFileDescription,
  IconCoin,
  IconListDetails,
  IconSearch,
  IconChevronDown,
  IconUserCircle,
  IconX,
  IconEraser,
} from "@tabler/icons-react";

const EMPRESA_ID        = "005";
const TENANT_ID         = "1";
const CUENTA_USUARIO_ID = "CU0002";
const LISTA_PRECIO_ID   = "092200000001";

interface PrecioTierInfo { precio: number; min: number; tier: "minorista" | "mayorista" | "distribuidor" | null; }
const calcPrecioTier = (det: ListaPrecioDetalle, cantidad: number): PrecioTierInfo => {
  if (det.cantidad_distribuidor != null && cantidad >= det.cantidad_distribuidor && det.precio_minimo_distribuidor != null)
    return { precio: det.precio_minimo_distribuidor, min: det.precio_minimo_distribuidor, tier: "distribuidor" };
  if (det.cantidad_mayorista != null && cantidad >= det.cantidad_mayorista && det.precio_minimo_mayorista != null)
    return { precio: det.precio_minimo_mayorista, min: det.precio_minimo_mayorista, tier: "mayorista" };
  return { precio: det.precio_minimo_minorista ?? 0, min: det.precio_minimo_minorista ?? 0, tier: "minorista" };
};

// ─────────────────────────────────────────────────────────────────────────────
// TrabajadorDDL
// ─────────────────────────────────────────────────────────────────────────────
function TrabajadorDDL({
  empresaId,
  value,
  onChange,
}: {
  empresaId: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState("");
  const [items, setItems]             = useState<Trabajador[]>([]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected]       = useState<Trabajador | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if ((selected as any)?.trabajadorId === value) return;
    trabajadorService.getById(value).then(setSelected).catch(() => setSelected(null));
  }, [value, (selected as any)?.trabajadorId]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const normalizeResponse = (res: any) => {
    const data =
      (Array.isArray(res?.data) && res.data) ||
      (Array.isArray(res?.data?.data) && res.data.data) ||
      (Array.isArray(res?.items) && res.items) ||
      (Array.isArray(res) && res) ||
      [];
    const meta        = res?.meta || res?.data?.meta || {};
    const totalPages  = meta?.totalPages ?? 1;
    const currentPage = meta?.currentPage ?? undefined;
    return { data, totalPages, currentPage };
  };

  const fetchItems = useCallback(
    async (q: string, pg: number, replace: boolean) => {
      if (!empresaId) return;
      replace ? setLoading(true) : setLoadingMore(true);
      try {
        const res: any = await trabajadorService.getAll(empresaId, pg, 15, q || undefined);
        const parsed   = normalizeResponse(res);
        const data     = Array.isArray(parsed.data) ? (parsed.data as Trabajador[]) : [];
        setItems((prev) => (replace ? data : [...prev, ...data]));
        setTotalPages(parsed.totalPages ?? 1);
        setPage(parsed.currentPage ?? pg);
      } catch {
        if (replace) { setItems([]); setTotalPages(1); setPage(1); }
      } finally {
        replace ? setLoading(false) : setLoadingMore(false);
      }
    },
    [empresaId]
  );

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

  const displayName = selected
    ? `${(selected as any).nombres ?? ""} ${(selected as any).apellidos ?? ""}`.trim() || selected.trabajadorId
    : "";
  const docLabel = (selected as any)?.numero_doc ?? "";

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Trabajador / Vendedor *</label>
      <div
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full border rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all select-none
          ${open ? "border-blue-400 ring-2 ring-blue-500/20 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        <IconUserCircle size={15} className={`shrink-0 ${selected ? "text-blue-500" : "text-slate-400"}`} />
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-800 truncate block leading-tight">{displayName}</span>
            {docLabel && <span className="text-[10px] text-slate-400 font-mono">{docLabel}</span>}
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
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, apellido o documento..."
              className="flex-1 text-xs uppercase outline-none text-slate-700 placeholder-slate-400 bg-transparent"
            />
            {loading && <IconLoader size={13} className="animate-spin text-blue-500 shrink-0" />}
          </div>
          <ul ref={listRef} onScroll={handleScroll} className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {loading && items.length === 0 ? (
              <li className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400">
                <IconLoader size={14} className="animate-spin" /> Cargando...
              </li>
            ) : items.length === 0 ? (
              <li className="py-5 text-center text-xs text-slate-400 italic">Sin resultados</li>
            ) : (
              items.map((t: any) => {
                const nombre = `${t.nombres ?? ""} ${t.apellidos ?? ""}`.trim();
                const doc    = t.numero_doc ?? "";
                const active = t.trabajadorId === value;
                return (
                  <li
                    key={t.trabajadorId}
                    onClick={() => handleSelect(t)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-xs transition-colors
                      ${active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                      {(nombre[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate leading-tight">{nombre || t.trabajadorId}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{doc}</p>
                    </div>
                    {active && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
                  </li>
                );
              })
            )}
            {loadingMore && (
              <li className="flex justify-center py-3"><IconLoader size={14} className="animate-spin text-slate-400" /></li>
            )}
          </ul>
          {!loading && items.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-right">
              {items.length} resultado{items.length !== 1 ? "s" : ""}
              {page < totalPages && " · Scroll para ver más"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
    <div className="w-1 h-5 bg-blue-600 rounded" />
    <span className="text-blue-600">{icon}</span>
    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
  </div>
);

const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// Sin descuentoProducto
const emptyDetalle = (): CotizacionDetalle => ({
  bienId:         "",
  presentacionId: "",
  cantidad:       1,
  precio:         0,
  afectoInafecto: true,
  observacion:    "",
});

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default function CrearCotizacionPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const isEditing    = !!editId;

  const [saving,      setSaving]      = useState(false);
  const [loadingCat,  setLoadingCat]  = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [catalogs,        setCatalogs]        = useState<FormDropdownsDocumentoVenta | null>(null);
  const [condicionesPago, setCondicionesPago] = useState<CondicionPago[]>([]);
  const [formasPago,      setFormasPago]      = useState<FormasPago[]>([]);

  const [presentacionesNuevo, setPresentacionesNuevo] = useState<{ key: string; value: string; factor: number }[]>([]);
  const [loadingPres,         setLoadingPres]         = useState(false);
  const [selectedListaId,     setSelectedListaId]     = useState<string>(LISTA_PRECIO_ID);
  const [listasPrecios,       setListasPrecios]       = useState<ListaPrecio[]>([]);
  const [listaPrecioDetalles, setListaPrecioDetalles] = useState<ListaPrecioDetalle[]>([]);

  const [form, setForm] = useState({
    clienteId:        "",
    trabajadorId:     "",
    monedaId:         "",
    tipoCambio:       "1",
    formaspagoId:     "",
    condicionPago:    "",
    tipoentregaId:    "",
    tiempoValidez:    "",
    fechaVencimiento: "",
    ordcompraNumero:  "",
    observacion:      "",
  });

  const [activeTab, setActiveTab] = useState<"general" | "detalle">("general");

  const [detalles,     setDetalles]     = useState<CotizacionDetalle[]>([]);
  const [nuevoDetalle, setNuevoDetalle] = useState<CotizacionDetalle>(emptyDetalle());
  const [precioTierLabel, setPrecioTierLabel] = useState<"minorista" | "mayorista" | "distribuidor" | null>(null);
  const [precioLimites,   setPrecioLimites]   = useState<{ min: number } | null>(null);

  // ── Carga inicial de catálogos ─────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoadingCat(true);
      const [resCat, resCP, resFP] = await Promise.allSettled([
        documentoVentaService.getFormDropdowns(EMPRESA_ID, TENANT_ID),
        condicionPagoService.getAll(),
        formasPagoService.getAll(1, 100),
      ]);

      if (resCat.status === "fulfilled") {
        const data = resCat.value as FormDropdownsDocumentoVenta;
        setCatalogs(data);
        setForm((prev) => ({ ...prev, monedaId: prev.monedaId || data.monedas?.[0]?.key?.toString() || "" }));
      } else {
        toast.error("No se pudieron cargar los catálogos del formulario");
      }

      if (resCP.status === "fulfilled") {
        const cp = resCP.value as CondicionPago[];
        setCondicionesPago(cp);
        if (cp.length > 0) {
          setForm((prev) => ({
            ...prev,
            condicionPago: prev.condicionPago || ((cp[0] as any).condicionPagoId ?? (cp[0] as any).condicion_pago ?? ""),
          }));
        }
      }

      if (resFP.status === "fulfilled") setFormasPago((resFP.value as any)?.data ?? resFP.value ?? []);

      setLoadingCat(false);
    };
    loadAll();
  }, []);

  // ── Carga listas de precios disponibles ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [resListas, resCuenta] = await Promise.all([
          listaPreciosService.getByEmpresa(EMPRESA_ID, 1, 100),
          cuentaUsuarioService.getById(CUENTA_USUARIO_ID).catch(() => null),
        ]);
        const userPerfilesId: string | null = (resCuenta as any)?.perfilesId ?? null;
        let disponibles = resListas.data.filter(
          (lp) => (lp.estado_listprec ?? (lp as any).estado?.descripcion ?? "").toLowerCase() === "disponible"
        );
        if (userPerfilesId) {
          disponibles = disponibles.filter(
            (lp) => lp.perfiles?.some((p) => p.perfilesId === userPerfilesId) ?? false
          );
        }
        const seen = new Set<string>();
        disponibles = disponibles.filter((lp) => {
          if (seen.has(lp.listaprecioId)) return false;
          seen.add(lp.listaprecioId);
          return true;
        });
        setListasPrecios(disponibles);
        if (disponibles.length > 0 && !disponibles.find((lp) => lp.listaprecioId === LISTA_PRECIO_ID)) {
          setSelectedListaId(disponibles[0].listaprecioId);
        }
      } catch {}
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedListaId) return;
    listaPreciosService
      .getById(selectedListaId)
      .then((res) => setListaPrecioDetalles(res.detalles ?? []))
      .catch(() => setListaPrecioDetalles([]));
  }, [selectedListaId]);

  // ── Carga datos para edición ───────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    const loadEdit = async () => {
      setLoadingEdit(true);
      try {
        const res = await cotizacionService.getById(editId);
        const ct  = (res as any).cotizacion ?? res;
        setForm({
          clienteId:        ct.clienteId         ?? "",
          trabajadorId:     ct.trabajadorId      ?? "",
          monedaId:         ct.monedaId          ?? "",
          tipoCambio:       String(ct.tipoCambio ?? "1"),
          formaspagoId:     ct.formaspagoId      ?? "",
          condicionPago:    ct.condicionPago      ?? "",
          tipoentregaId:    ct.tipoentregaId     ?? "",
          tiempoValidez:    ct.tiempoValidez != null ? String(ct.tiempoValidez) : "",
          fechaVencimiento: ct.fechaVencimiento  ? ct.fechaVencimiento.substring(0, 10) : "",
          ordcompraNumero:  ct.ordcompraNumero   ?? "",
          observacion:      ct.observacion       ?? "",
        });
        const rawDetalles: any[] = ct.detalles ?? [];
        setDetalles(
          rawDetalles.map((d: any, idx: number) => ({
            item:           d.item ?? idx + 1,
            bienId:         d.bienId         ?? "",
            presentacionId: d.presentacionId ?? "",
            cantidad:       Number(d.cantidad ?? 1),
            precio:         Number(d.precio   ?? 0),
            afectoInafecto: d.afectoInafecto  ?? true,
            observacion:    d.observacion     ?? "",
          }))
        );
      } catch (err: any) {
        toast.error(err?.message ?? "No se pudo cargar la cotización para editar");
      } finally {
        setLoadingEdit(false);
      }
    };
    loadEdit();
  }, [editId]);

  // ── Helpers nombres ────────────────────────────────────────────────────────
  const getBienNombre = useCallback(
    (bienId: string) => catalogs?.bienes?.find((b) => b.key?.toString() === bienId)?.value ?? bienId,
    [catalogs]
  );

  const getPresentacionNombre = useCallback(
    (bienId: string, presentacionId: string) => {
      const grupo = catalogs?.presentaciones?.find((g) => g.bienId === bienId);
      return grupo?.items?.find((p) => p.key?.toString() === presentacionId)?.value ?? presentacionId;
    },
    [catalogs]
  );

  const bienesDisponibles = useMemo(() => {
    if (!catalogs?.bienes) return [];
    const base = catalogs.bienes.map((b) => ({ key: String(b.key), value: b.value || String(b.key) }));
    if (listaPrecioDetalles.length === 0) return base;
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return base.filter((b) => {
      const pres = catalogs.presentaciones?.find((g) => g.bienId === b.key)?.items ?? [];
      return (pres as any[]).some((p) => presIds.has(String(p.key)));
    });
  }, [catalogs, listaPrecioDetalles]);

  const presentacionOptsNuevo = useMemo(() => {
    if (presentacionesNuevo.length === 0) return [];
    if (listaPrecioDetalles.length === 0) return presentacionesNuevo;
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return presentacionesNuevo.filter((p) => presIds.has(p.key));
  }, [presentacionesNuevo, listaPrecioDetalles]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: { target: { name: string; value: string } }) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleMonedaChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const monedaId = e.target.value;
      setForm((prev) => ({ ...prev, monedaId }));
      const tc = await monedaService.getTipoCambio(monedaId);
      setForm((prev) => ({ ...prev, tipoCambio: String(tc) }));
    },
    []
  );

  const monedaLabel = useMemo(() => {
    const a  = (catalogs?.monedas?.find((m) => m.key?.toString() === form.monedaId)?.value ?? "").toUpperCase();
    const id = form.monedaId;
    if (id === "002" || a.includes("DOLAR") || a.includes("USD")) return "US$";
    if (id === "003" || a.includes("EURO"))                        return "€";
    return "S/";
  }, [catalogs, form.monedaId]);

  const refreshCondicionesPago = useCallback(async () => {
    try {
      const cp = await condicionPagoService.getAll() as CondicionPago[];
      setCondicionesPago(cp);
    } catch { /* silencioso */ }
  }, []);

  const refreshFormasPago = useCallback(async () => {
    try {
      const fp = await formasPagoService.getAll(1, 100);
      setFormasPago((fp as any)?.data ?? fp ?? []);
    } catch { /* silencioso */ }
  }, []);

  const formasPagoFiltradas = useMemo(() => {
    if (!form.condicionPago || formasPago.length === 0) return [];
    const selectedCP = condicionesPago.find(
      (cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === form.condicionPago
    ) as any;
    if (!selectedCP) return formasPago;
    const condDesc = (
      (selectedCP.descripcion ?? selectedCP.condicion_pago ?? form.condicionPago) as string
    ).toUpperCase();
    return formasPago.filter((fp: any) =>
      (fp.condicionPago ?? "").toUpperCase() === condDesc
    );
  }, [form.condicionPago, condicionesPago, formasPago]);


  // ── Auto-calcular fechaVencimiento a partir de tiempoValidez ──────────────
  useEffect(() => {
    const dias = Number(form.tiempoValidez);
    if (!dias || dias <= 0) {
      setForm((prev) => ({ ...prev, fechaVencimiento: "" }));
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setForm((prev) => ({ ...prev, fechaVencimiento: d.toISOString().split("T")[0] }));
  }, [form.tiempoValidez]);

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const IGV_RATE = 0.18;

  // Precio enviado incluye IGV → importe bruto = cantidad × precio
  const calcImporte = (d: CotizacionDetalle) =>
    Number(d.cantidad ?? 0) * Number(d.precio ?? 0);

  const totalGeneral = useMemo(
    () => detalles.reduce((acc, d) => acc + calcImporte(d), 0),
    [detalles]
  );

  const resumen = useMemo(() => {
    let gravado = 0, exonerado = 0, igvTotal = 0;
    detalles.forEach((d) => {
      const bruto = calcImporte(d);
      if (d.afectoInafecto !== false) {
        const base = bruto / (1 + IGV_RATE);
        gravado  += base;
        igvTotal += bruto - base;
      } else {
        exonerado += bruto;
      }
    });
    return {
      gravado:   Math.round(gravado   * 100) / 100,
      exonerado: Math.round(exonerado * 100) / 100,
      igv:       Math.round(igvTotal  * 100) / 100,
      total:     Math.round((gravado + igvTotal + exonerado) * 100) / 100,
    };
  }, [detalles]);

  // ── Detalle ────────────────────────────────────────────────────────────────
  const handleAgregarDetalle = async () => {
    if (!nuevoDetalle.bienId)               return toast.error("Seleccione el producto");
    if (!nuevoDetalle.presentacionId)       return toast.error("Seleccione la presentación");
    if (Number(nuevoDetalle.cantidad) <= 0) return toast.error("La cantidad debe ser mayor a 0");
    if (Number(nuevoDetalle.precio)   <= 0) return toast.error("El precio debe ser mayor a 0");
    if (precioLimites && Number(nuevoDetalle.precio) < precioLimites.min)
      return toast.error(`El precio no puede ser menor al mínimo (${precioLimites.min.toFixed(2)})`);
    setDetalles((prev) => [...prev, { ...nuevoDetalle, item: prev.length + 1 } as any]);
    setNuevoDetalle(emptyDetalle());
    setPrecioTierLabel(null);
    setPrecioLimites(null);
    setPresentacionesNuevo([]);
  };

  const handleEliminarDetalle = (i: number) => {
    setDetalles((prev) =>
      prev.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, item: idx + 1 }))
    );
  };

  // ── Validación ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.clienteId.trim())    return "El cliente es requerido";
    if (!form.trabajadorId.trim()) return "El vendedor es requerido";
    if (!form.monedaId.trim())     return "La moneda es requerida";
    if (detalles.length === 0)     return "Agregue al menos un ítem a la cotización";
    return null;
  };

  // ── Limpiar formulario ────────────────────────────────────────────────────
  const handleLimpiar = () => {
    setForm({
      clienteId:        "",
      trabajadorId:     "",
      monedaId:         "",
      tipoCambio:       "1",
      formaspagoId:     "",
      condicionPago:    "",
      tipoentregaId:    "",
      tiempoValidez:    "",
      fechaVencimiento: "",
      ordcompraNumero:  "",
      observacion:      "",
    });
    setDetalles([]);
    setNuevoDetalle(emptyDetalle());
    setPrecioTierLabel(null);
    setPrecioLimites(null);
    setPresentacionesNuevo([]);
    setSelectedListaId(LISTA_PRECIO_ID);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    try {
      setSaving(true);

      const payload: Partial<Cotizacion> = {
        clienteId:        form.clienteId.trim(),
        trabajadorId:     form.trabajadorId.trim(),
        monedaId:         form.monedaId.trim(),
        tipoCambio:       Number(form.tipoCambio) || 1,
        formaspagoId:     form.formaspagoId.trim()    || undefined,
        condicionPago:    form.condicionPago.trim()    || undefined,
        tipoentregaId:    form.tipoentregaId.trim()    || undefined,
        tiempoValidez:    form.tiempoValidez ? Number(form.tiempoValidez) : undefined,
        fechaVencimiento: form.fechaVencimiento         || undefined,
        ordcompraNumero:  form.ordcompraNumero.trim()   || undefined,
        observacion:      form.observacion.trim()       || undefined,
        valorventaAfecto:   resumen.gravado,
        valorventaInafecto: resumen.exonerado,
        igv:              resumen.igv,
        total:            resumen.total,
        cuentausuarioId:  CUENTA_USUARIO_ID,
        empresaId:        EMPRESA_ID,
        detalles: detalles.map((d, idx) => ({
          item:           idx + 1,
          bienId:         d.bienId,
          presentacionId: d.presentacionId,
          cantidad:       Number(d.cantidad),
          precio:         Number(d.precio),
          afectoInafecto: d.afectoInafecto ?? true,
          observacion:    d.observacion ?? "",
        })),
      };

      if (isEditing && editId) {
        await cotizacionService.update(editId, payload);
        toast.success("Cotización actualizada correctamente");
      } else {
        await cotizacionService.create(payload);
        toast.success("Cotización creada correctamente");
      }
      router.push("/dashboard/cotizaciones");
    } catch (error: any) {
      toast.error(error?.message || `Error al ${isEditing ? "actualizar" : "crear"} la cotización`);
    } finally {
      setSaving(false);
    }
  };

  const isBusy = loadingCat || loadingEdit;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-fade-in-up max-w-6xl mx-auto uppercase">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/cotizaciones")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <span
                className="hover:text-blue-600 cursor-pointer transition-colors"
                onClick={() => router.push("/dashboard/cotizaciones")}
              >
                Cotizaciones
              </span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">
                {isEditing ? "Editar Cotización" : "Nueva Cotización"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? "Editar Cotización" : "Nueva Cotización"}
            </h1>
            {isEditing && editId && <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {editId}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/dashboard/cotizaciones")}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleLimpiar}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2"
            title="Limpiar todos los campos"
          >
            <IconEraser size={18} /> Limpiar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isBusy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? <><IconLoader className="animate-spin" size={18} /> Guardando...</>
              : <><IconDeviceFloppy size={18} /> {isEditing ? "Actualizar Cotización" : "Registrar Cotización"}</>
            }
          </button>
        </div>
      </div>

      {isBusy && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <IconLoader size={14} className="animate-spin" />
          {loadingEdit ? "Cargando datos de la cotización..." : "Cargando catálogos del formulario..."}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">

        {/* ── Columna izquierda: panel con tabs ── */}
        {/* En la pestaña Detalle el panel usa el ancho completo para que la tabla no quede apretada */}
        <div className={`col-span-12 ${activeTab === "detalle" ? "" : "lg:col-span-8"}`}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === "general"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <IconFileDescription size={15} /> Datos Generales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("detalle")}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === "detalle"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <IconListDetails size={15} /> Detalle
                {detalles.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "detalle" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {detalles.length}
                  </span>
                )}
              </button>
            </div>

            {/* ══ TAB: Datos Generales ══ */}
            {activeTab === "general" && (
              <div className="p-6 space-y-6">

                {/* Datos del Cliente */}
                <div>
                  <SectionHeader icon={<IconFileDescription size={16} />} title="Datos del Cliente" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="[&_*]:uppercase [&_input]:uppercase [&_span]:uppercase [&_li]:uppercase">
                      <DropDownClient
                        tenantId={TENANT_ID}
                        name="clienteId"
                        label="Cliente *"
                        value={form.clienteId}
                        onChange={(e) => setForm((prev) => ({ ...prev, clienteId: e.target.value }))}
                        filtroTipoDoc={null}
                        disabled={isBusy}
                      />
                    </div>
                    <TrabajadorDDL
                      empresaId={EMPRESA_ID}
                      value={form.trabajadorId}
                      onChange={(id) => setForm((prev) => ({ ...prev, trabajadorId: id }))}
                    />
                  </div>
                </div>

                {/* Condiciones Comerciales */}
                <div>
                  <SectionHeader icon={<IconCoin size={16} />} title="Condiciones Comerciales" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Moneda */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Moneda *</label>
                      <select
                        name="monedaId"
                        value={form.monedaId}
                        onChange={handleMonedaChange}
                        disabled={isBusy}
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                      >
                        <option value="">Seleccionar...</option>
                        {catalogs?.monedas?.length
                          ? catalogs.monedas.map((m) => (
                              <option key={m.key} value={m.key.toString()}>{m.key} - {m.value}</option>
                            ))
                          : (
                            <>
                              <option value="001">001 - SOLES</option>
                              <option value="002">002 - DÓLARES</option>
                              <option value="003">003 - EUROS</option>
                            </>
                          )}
                      </select>
                    </div>

                    {/* Condición de Pago */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condición de Pago</label>
                      <select
                        name="condicionPago"
                        value={form.condicionPago}
                        onChange={(e) => setForm((prev) => ({ ...prev, condicionPago: e.target.value, formaspagoId: "", fechaVencimiento: "" }))}
                        onFocus={refreshCondicionesPago}
                        disabled={isBusy}
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                      >
                        <option value="">Seleccionar...</option>
                        {condicionesPago.map((cp: any) => {
                          const id = cp.condicionPagoId ?? cp.condicion_pago;
                          return <option key={id} value={id}>{cp.descripcion ?? cp.condicion_pago}</option>;
                        })}
                      </select>
                    </div>

                    {/* Forma de Pago */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Forma de Pago</label>
                      <select
                        name="formaspagoId"
                        value={form.formaspagoId}
                        onChange={handleChange}
                        onFocus={refreshFormasPago}
                        disabled={isBusy || !form.condicionPago}
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                      >
                        <option value="">
                          {!form.condicionPago ? "Seleccione primero condición de pago" : "Seleccionar..."}
                        </option>
                        {formasPagoFiltradas.map((fp: any) => (
                          <option key={fp.formaspagoId ?? fp.descripcion} value={fp.formaspagoId ?? ""}>
                            {fp.descripcion}{fp.diasFormPago != null ? ` (${fp.diasFormPago}d)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tiempo de Validez */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tiempo de Validez (días)</label>
                      <input
                        type="number"
                        name="tiempoValidez"
                        min={1}
                        value={form.tiempoValidez}
                        onChange={handleChange}
                        disabled={isBusy}
                        placeholder="Ej: 30"
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                      />
                    </div>

                    {/* Fecha Vencimiento — calculada automáticamente */}
                    <div className="flex flex-col gap-1.5">
                      <DateInput
                        label="Fecha Vencimiento (automática)"
                        name="fechaVencimiento"
                        value={form.fechaVencimiento}
                        onChange={handleChange}
                        disabled={true}
                      />
                      {!form.fechaVencimiento && (
                        <p className="text-[10px] text-slate-400 italic ml-1 normal-case">
                          Ingrese el tiempo de validez para calcularla
                        </p>
                      )}
                    </div>

                    {/* Ord. Compra N° */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">N° Orden de Compra</label>
                      <input
                        type="text"
                        name="ordcompraNumero"
                        value={form.ordcompraNumero}
                        onChange={handleChange}
                        disabled={isBusy}
                        placeholder="Número de OC del cliente..."
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                      />
                    </div>

                    {/* Observación */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observación</label>
                      <textarea
                        name="observacion"
                        value={form.observacion}
                        onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
                        rows={2}
                        placeholder="Observaciones adicionales..."
                        disabled={isBusy}
                        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase resize-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ══ TAB: Detalle ══ */}
            {activeTab === "detalle" && (
              <div className="p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded" />
                    <span className="text-blue-600"><IconListDetails size={16} /></span>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Detalle de Ítems</h3>
                  </div>
                  {listasPrecios.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lista de Precios:</span>
                      <select
                        value={selectedListaId}
                        disabled={isBusy}
                        onChange={(e) => {
                          setSelectedListaId(e.target.value);
                          setNuevoDetalle(emptyDetalle());
                          setPrecioTierLabel(null);
                          setPrecioLimites(null);
                          setPresentacionesNuevo([]);
                        }}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                      >
                        {listasPrecios.map((lp) => (
                          <option key={lp.listaprecioId} value={lp.listaprecioId}>
                            {lp.descripcion || lp.codigo_lista}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3">Presentación</th>
                        <th className="p-3 text-center w-20">Cant.</th>
                        <th className="p-3 text-right w-28">Precio</th>
                        <th className="p-3 text-right w-28">Importe</th>
                        <th className="p-3 text-center w-20">IGV</th>
                        <th className="p-3">Obs.</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalles.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-3 text-center text-slate-400 italic text-[11px]">
                            Sin ítems aún — usa la fila de abajo para agregar productos.
                          </td>
                        </tr>
                      )}
                      {detalles.map((d, i) => (
                        <tr
                          key={i}
                          className={`transition-colors border-l-4 ${
                            d.afectoInafecto === false
                              ? "border-l-amber-400 bg-amber-50/40 hover:bg-amber-50/70"
                              : "border-l-green-400 bg-white hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="p-3 text-center text-slate-400 font-mono font-bold">{i + 1}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block leading-tight truncate max-w-[180px]">
                              {getBienNombre(d.bienId ?? "")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{d.bienId}</span>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {getPresentacionNombre(d.bienId ?? "", d.presentacionId ?? "")}
                          </td>
                          <td className="p-3 text-center font-mono">{Number(d.cantidad).toFixed(3)}</td>
                          <td className="p-3 text-right font-mono">{formatMoney(Number(d.precio))}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">{formatMoney(calcImporte(d))}</td>
                          <td className="p-3 text-center">
                            {d.afectoInafecto === false
                              ? <span className="text-[10px] font-semibold text-amber-600">Exonerado</span>
                              : <span className="text-[10px] font-semibold text-green-600">Afecto</span>
                            }
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-[120px] truncate">{d.observacion ?? "—"}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleEliminarDetalle(i)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <IconTrash size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* ── Fila agregar inline ── */}
                      <tr className="bg-blue-50/30 border-t-2 border-dashed border-blue-200">
                        <td className="p-2 text-center text-blue-400 font-mono font-bold text-sm select-none">+</td>
                        <td className="p-1.5 min-w-[200px]">
                          <SearchableSelect
                            name="nuevo_bienId"
                            options={bienesDisponibles}
                            value={nuevoDetalle.bienId ?? ""}
                            disabled={isBusy}
                            placeholder="Buscar producto..."
                            onChange={async (e: any) => {
                              const bienId = e.target.value;
                              const bien   = catalogs?.bienes?.find((b) => b.key?.toString() === bienId) as any;
                              setPresentacionesNuevo([]);
                              setNuevoDetalle((prev) => ({
                                ...prev,
                                bienId,
                                presentacionId: "",
                                precio:         0,
                                afectoInafecto: bien?.afecto_inafecto ?? true,
                              }));
                              if (bienId) {
                                setLoadingPres(true);
                                try {
                                  const res = await presentacionService.getByBien(bienId, true);
                                  setPresentacionesNuevo(
                                    (res?.data ?? []).map((p: any) => ({
                                      key:    p.presentacionId,
                                      value:  p.descripcion,
                                      factor: p.cantidad ?? 1,
                                    }))
                                  );
                                } catch { /* silencioso */ }
                                finally { setLoadingPres(false); }
                              }
                            }}
                          />
                        </td>
                        <td className="p-1.5 min-w-[140px]">
                          <SearchableSelect
                            name="nuevo_presentacionId"
                            options={presentacionOptsNuevo}
                            value={nuevoDetalle.presentacionId ?? ""}
                            disabled={isBusy || loadingPres || !nuevoDetalle.bienId}
                            placeholder={loadingPres ? "Cargando..." : "-- Presentación --"}
                            onChange={(e: any) => {
                              const presentacionId = e.target.value;
                              const det = listaPrecioDetalles.find((d) => d.presentacionId === presentacionId);
                              if (det) {
                                const tierInfo = calcPrecioTier(det, nuevoDetalle.cantidad ?? 1);
                                setPrecioTierLabel(tierInfo.tier);
                                setPrecioLimites({ min: tierInfo.min });
                                setNuevoDetalle((prev) => ({
                                  ...prev,
                                  presentacionId,
                                  ...(tierInfo.precio > 0 ? { precio: tierInfo.precio } : {}),
                                }));
                              } else {
                                setPrecioTierLabel(null);
                                setPrecioLimites(null);
                                setNuevoDetalle((prev) => ({ ...prev, presentacionId }));
                              }
                            }}
                          />
                        </td>
                        <td className="p-1.5 w-24">
                          <input
                            type="number" min="0.001" step="0.001"
                            value={nuevoDetalle.cantidad ?? ""}
                            disabled={isBusy}
                            onChange={(e) => {
                              const cantidad = Number(e.target.value);
                              const det = nuevoDetalle.presentacionId
                                ? listaPrecioDetalles.find((d) => d.presentacionId === nuevoDetalle.presentacionId)
                                : undefined;
                              if (det) {
                                const tierInfo = calcPrecioTier(det, cantidad);
                                setPrecioTierLabel(tierInfo.tier);
                                setPrecioLimites({ min: tierInfo.min });
                                setNuevoDetalle((prev) => ({
                                  ...prev,
                                  cantidad,
                                  ...(tierInfo.precio > 0 ? { precio: tierInfo.precio } : {}),
                                }));
                              } else {
                                setNuevoDetalle((prev) => ({ ...prev, cantidad }));
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs text-center font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 transition-all"
                          />
                        </td>
                        <td className="p-1.5 w-28">
                          <input
                            type="number" min={precioLimites?.min ?? 0} step="0.000001"
                            value={nuevoDetalle.precio ?? ""}
                            disabled={isBusy}
                            onChange={(e) => setNuevoDetalle((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                            className={`w-full border rounded-lg px-2 py-2 text-xs text-right font-mono outline-none focus:ring-2 transition-all disabled:bg-slate-50 ${
                              precioLimites && nuevoDetalle.precio != null && nuevoDetalle.precio < precioLimites.min
                                ? "border-red-400 focus:ring-red-400 bg-red-50"
                                : "border-slate-200 focus:ring-blue-500"
                            }`}
                          />
                          {precioTierLabel && (
                            <p className={`text-[9px] font-bold mt-0.5 text-right ${
                              precioTierLabel === "distribuidor" ? "text-purple-600" :
                              precioTierLabel === "mayorista"    ? "text-blue-600"   : "text-green-600"
                            }`}>
                              {precioTierLabel === "distribuidor" ? "DIST" : precioTierLabel === "mayorista" ? "MAY" : "MIN"}
                              {precioLimites && precioLimites.min > 0 ? ` · Mín: ${precioLimites.min.toFixed(2)}` : ""}
                            </p>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-slate-500">
                          {nuevoDetalle.bienId ? formatMoney(calcImporte(nuevoDetalle)) : "—"}
                        </td>
                        <td className="p-2 text-center">
                          {nuevoDetalle.bienId
                            ? nuevoDetalle.afectoInafecto === false
                              ? <span className="text-[10px] font-semibold text-amber-600">Exonerado</span>
                              : <span className="text-[10px] font-semibold text-green-600">Afecto</span>
                            : <span className="text-slate-300 text-[10px]">—</span>}
                        </td>
                        <td className="p-2 text-slate-300 text-[10px]">—</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={handleAgregarDetalle}
                            disabled={isBusy}
                            className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center mx-auto transition-all active:scale-95 disabled:opacity-50"
                            title="Agregar ítem"
                          >
                            <IconPlus size={14} />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                    {detalles.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={5} className="px-3 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total estimado</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">{formatMoney(totalGeneral)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  * El importe es referencial. El cálculo final de IGV y totales lo realiza el servidor.
                </p>
              </div>
            )}

          </div>
        </div>{/* ── fin columna izquierda ── */}

        {/* ── Columna derecha: Resumen ── */}
        {/* Se oculta en la pestaña Detalle, donde el panel izquierdo usa el ancho completo */}
        {activeTab === "general" && (
        <div className="col-span-12 lg:col-span-4 self-start sticky top-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-5 py-4">
              <h3 className="text-white font-bold text-base uppercase tracking-wide">Resumen</h3>
            </div>
            <div className="p-5 space-y-4">

              {form.monedaId && form.monedaId !== "001" && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <IconCoin size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700">
                    Tipo de cambio:{" "}
                    <strong className="font-mono">{Number(form.tipoCambio ?? 1).toFixed(3)}</strong>
                  </span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Gravado</span>
                  <span className="text-base font-mono font-bold text-slate-800">{monedaLabel} {formatMoney(resumen.gravado)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Exonerado</span>
                  <span className="text-base font-mono font-bold text-slate-800">{monedaLabel} {formatMoney(resumen.exonerado)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">IGV (18%)</span>
                  <span className="text-base font-mono font-bold text-slate-800">{monedaLabel} {formatMoney(resumen.igv)}</span>
                </div>
              </div>

              <div className="border-t-2 border-blue-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700 uppercase">Total</span>
                  <span className="text-2xl font-bold font-mono text-blue-700">{monedaLabel} {formatMoney(resumen.total)}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
        )}

      </div>{/* ── fin grid ── */}

    </div>
  );
}