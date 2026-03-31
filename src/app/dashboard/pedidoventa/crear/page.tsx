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

import pedidoventaService    from "@/services/pedidoventaService";
import trabajadorService     from "@/services/trabajadorService";
import condicionPagoService  from "@/services/condicionpagoService";
import formasPagoService     from "@/services/formaspagoService";
import documentoVentaService from "@/services/DocumentoventaService";
import tipoentregaService    from "@/services/tipoentregaService";
import clienteService        from "@/services/clienteService";
import { guiaRemisionService } from "@/services/guiaRemisionService";
import listaPreciosService from "@/services/listaprecioService";
import type { ListaPrecioDetalle } from "@/types/listaprecio.types";

import type { PedidoVenta, PedidoVentaDetalle } from "@/types/pedidoventa.type";
import type { CondicionPago }                   from "@/types/condicionpago.types";
import type { FormasPago }                      from "@/types/formaspago.types";
import type { Trabajador }                      from "@/types/trabajador.types";
import type { TipoEntrega }                     from "@/types/tipoentrega.type";
import type { DireccionExtra }                  from "@/types/cliente.types";
import type {
  KeyValueOption,
  FormDropdownsDocumentoVenta,
} from "@/types/Documentoventa.types";

import SearchableSelect  from "@/components/forms/SearchableSelect";
import DropDownClient    from "@/components/shared/DropDownClient";
import StockDisponible   from "@/components/shared/StockDisponible";

import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader,
  IconPlus,
  IconTrash,
  IconShoppingCart,
  IconTruck,
  IconCoin,
  IconListDetails,
  IconSearch,
  IconChevronDown,
  IconUserCircle,
  IconX,
  IconCalendar,
  IconMapPin,
  IconEdit,
} from "@tabler/icons-react";

const EMPRESA_ID        = "005";
const TENANT_ID         = "1";
const CUENTA_USUARIO_ID = "CU0002";
const LISTA_PRECIO_ID   = "092200000001";

// ─────────────────────────────────────────────────────────────────────────────
// DireccionEntregaDDL
// Muestra un select con: dirección principal + extras del cliente.
// Opción "OTRA DIRECCIÓN" habilita un input libre.
// ─────────────────────────────────────────────────────────────────────────────
const OTRA_KEY = "__OTRA__";

interface DireccionEntregaDDLProps {
  direccionPrincipal: string;
  direccionesExtras: DireccionExtra[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function DireccionEntregaDDL({
  direccionPrincipal,
  direccionesExtras,
  value,
  onChange,
  disabled,
}: DireccionEntregaDDLProps) {
  const [modoLibre, setModoLibre] = useState(false);

  const opciones = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    if (direccionPrincipal) {
      opts.push({ key: direccionPrincipal, label: `📍 ${direccionPrincipal}` });
    }
    direccionesExtras.forEach((d, i) => {
      if (d.direccion) {
        opts.push({
          key:   d.direccion,
          label: `📦 DIR. ADICIONAL ${i + 1}: ${d.direccion}`,
        });
      }
    });
    opts.push({ key: OTRA_KEY, label: "✏️  OTRA DIRECCIÓN..." });
    return opts;
  }, [direccionPrincipal, direccionesExtras]);

  // Si al montar ya hay un valor que no coincide con ninguna opción → modo libre
  useEffect(() => {
    if (!value) { setModoLibre(false); return; }
    const coincide = opciones.some((o) => o.key !== OTRA_KEY && o.key === value);
    if (!coincide) setModoLibre(true);
  }, []);           // solo al montar

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === OTRA_KEY) {
      setModoLibre(true);
      onChange("");   // limpia para que el usuario escriba
    } else {
      onChange(v);
    }
  };

  const handleVolver = () => {
    setModoLibre(false);
    onChange("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
        <IconMapPin size={11} className="text-blue-500" />
        Lugar de Despacho *
      </label>

      {modoLibre ? (
        /* ── Modo texto libre ── */
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVolver}
            disabled={disabled}
            title="Volver al listado"
            className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-40"
          >
            <IconArrowLeft size={15} />
          </button>
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="Escribir dirección personalizada..."
            disabled={disabled}
            className="flex-1 border border-blue-300 bg-blue-50/40 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
          />
        </div>
      ) : (
        /* ── Modo select ── */
        <select
          value={value || ""}
          onChange={handleSelectChange}
          disabled={disabled}
          className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
        >
          <option value="">Seleccionar dirección...</option>
          {opciones.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DDL: Trabajador
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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const normalizeResponse = (res: any) => {
    const data =
      (Array.isArray(res?.data) && res.data) ||
      (Array.isArray(res?.data?.data) && res.data.data) ||
      (Array.isArray(res?.data?.items) && res.data.items) ||
      (Array.isArray(res?.items) && res.items) ||
      (Array.isArray(res) && res) ||
      [];
    const meta        = res?.meta || res?.data?.meta || res?.data?.Meta || {};
    const totalPages  = meta?.totalPages ?? meta?.total_pages ?? meta?.TotalPages ?? meta?.totalPaginas ?? 1;
    const currentPage = meta?.currentPage ?? meta?.current_page ?? meta?.CurrentPage ?? meta?.pagina ?? meta?.page ?? undefined;
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
      } catch (err) {
        console.error("[TrabajadorDDL] getAll error:", err);
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

  const handleSelect = (t: Trabajador) => {
    setSelected(t);
    onChange(t.trabajadorId);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    onChange("");
  };

  const displayName = selected
    ? `${(selected as any).nombres ?? ""} ${(selected as any).apellidos ?? ""}`.trim() || selected.trabajadorId
    : "";
  const docLabel = (selected as any)?.numero_doc ?? (selected as any)?.numeroDoc ?? "";

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        Trabajador / Vendedor *
      </label>
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
                const doc    = t.numero_doc ?? t.numeroDoc ?? "";
                const cargo  = t.cargo?.descripcion ?? t.cargoDescripcion ?? "";
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
                      <p className="text-[10px] text-slate-400 font-mono truncate">{doc}{cargo ? ` · ${cargo}` : ""}</p>
                    </div>
                    {active && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
                  </li>
                );
              })
            )}
            {loadingMore && (
              <li className="flex justify-center py-3">
                <IconLoader size={14} className="animate-spin text-slate-400" />
              </li>
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

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  fullWidth?: boolean;
}
const FormInput = ({ label, fullWidth, className, ...props }: FormInputProps) => (
  <div className={`flex flex-col gap-1.5 ${fullWidth ? "md:col-span-2" : ""}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
    <input
      className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all text-sm uppercase ${className ?? ""}`}
      {...props}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DateInput
// ─────────────────────────────────────────────────────────────────────────────
interface DateInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  required?: boolean;
  disabled?: boolean;
}

const DateInput = ({ label, name, value, onChange, required, disabled }: DateInputProps) => {
  const hiddenRef = useRef<HTMLInputElement>(null);

  const toDisplay = (iso: string): string => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  const handleTextChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length === 0) { onChange({ target: { name, value: "" } }); return; }
    if (digits.length === 8) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yy = digits.slice(4, 8);
      const iso = `${yy}-${mm}-${dd}`;
      if (!isNaN(new Date(iso).getTime())) onChange({ target: { name, value: iso } });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
      <div className={`flex items-center gap-2 border rounded-lg px-2.5 bg-white transition-all
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400
        ${disabled ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed" : "border-slate-200 hover:border-slate-300"}`}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={toDisplay(value)}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          required={required}
          maxLength={10}
          className="flex-1 py-2.5 text-sm font-mono tracking-wide outline-none bg-transparent text-slate-700 placeholder-slate-400 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => hiddenRef.current?.showPicker?.()}
          className="shrink-0 p-1 text-slate-400 hover:text-blue-500 transition-colors disabled:cursor-not-allowed"
        >
          <IconCalendar size={15} />
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={(e) => onChange({ target: { name, value: e.target.value } })}
          disabled={disabled}
          tabIndex={-1}
          className="sr-only"
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers varios
// ─────────────────────────────────────────────────────────────────────────────
const toOpts = (items: KeyValueOption[] = []) =>
  items.map((x) => ({ key: x.key?.toString() ?? "", value: x.value || `COD: ${x.key}` }));

const emptyNuevoDetalle = (): PedidoVentaDetalle => ({
  bienId:             "",
  presentacionId:     "",
  cantidad:           1,
  precio:             0,
  descuento_producto: 0,
  afecto_inafecto:    true,
  observacion:        "",
});

const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default function CrearPedidoVentaPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const isEditing    = !!editId;

  const [saving,      setSaving]      = useState(false);
  const [loadingCat,  setLoadingCat]  = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const [catalogs,        setCatalogs]        = useState<FormDropdownsDocumentoVenta | null>(null);
  const [condicionesPago, setCondicionesPago] = useState<CondicionPago[]>([]);
  const [formasPago,      setFormasPago]      = useState<FormasPago[]>([]);
  const [tiposEntrega,    setTiposEntrega]    = useState<TipoEntrega[]>([]);
  const [almacenOpts,     setAlmacenOpts]     = useState<{ key: string; value: string; aux: string }[]>([]);
  const [listaPrecioDetalles, setListaPrecioDetalles] = useState<ListaPrecioDetalle[]>([]);

  // ── Datos de dirección del cliente ─────────────────────────────────────────
  const [clienteDireccion,        setClienteDireccion]        = useState("");
  const [clienteDireccionesExtras, setClienteDireccionesExtras] = useState<DireccionExtra[]>([]);

  const [form, setForm] = useState({
    clienteId:            "",
    cliente_referencia:   "",
    trabajadorId:         "",
    monedaId:             "",
    tipo_cambio:          "1",
    formaspagoId:         "",
    condicion_pago:       "",
    tipoentregaId:        "",
    almacenId:            "",
    direccion_entrega:    "",
    documento_referencia: "",
    fecha_entrega:        "",
    fecha_vencimiento:    "",
    observacion:          "",
    lugar_despacho:       "",
    operaciongratuita:    "false",
    tipoopegratuitaId:    "00",
  });

  const [detalles,     setDetalles]     = useState<PedidoVentaDetalle[]>([]);
  const [nuevoDetalle, setNuevoDetalle]   = useState<PedidoVentaDetalle>(emptyNuevoDetalle());
  const [showStock, setShowStock]         = useState(false);
  const [precioLimites, setPrecioLimites] = useState<{ min: number; max: number } | null>(null);

  // ── Carga inicial de catálogos ─────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoadingCat(true);
      const [resCat, resCP, resFP, resTipoEntrega, resGuiaCat, resLP] = await Promise.allSettled([
        documentoVentaService.getFormDropdowns(EMPRESA_ID, TENANT_ID),
        condicionPagoService.getAll(),
        formasPagoService.getAll(1, 100),
        tipoentregaService.getActivos(Number(TENANT_ID)),
        guiaRemisionService.getFormDropdowns(EMPRESA_ID, "001"),
        listaPreciosService.getById(LISTA_PRECIO_ID),
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
            condicion_pago: prev.condicion_pago || ((cp[0] as any).condicionPagoId ?? (cp[0] as any).condicion_pago ?? ""),
          }));
        }
      }

      if (resFP.status === "fulfilled") setFormasPago((resFP.value as any)?.data ?? resFP.value ?? []);
      if (resTipoEntrega.status === "fulfilled") setTiposEntrega(resTipoEntrega.value);

      if (resGuiaCat.status === "fulfilled" && (resGuiaCat.value as any)?.isSuccess) {
        setAlmacenOpts((resGuiaCat.value as any).data?.AlmacenInicioJson ?? []);
      }

      if (resLP.status === "fulfilled") {
        setListaPrecioDetalles(resLP.value.detalles ?? []);
      }

      setLoadingCat(false);
    };
    loadAll();
  }, []);

  // ── Obtiene dirección principal + extras al cambiar cliente ────────────────
  useEffect(() => {
    if (!form.clienteId) {
      setClienteDireccion("");
      setClienteDireccionesExtras([]);
      return;
    }
    clienteService.getById(form.clienteId)
      .then((c: any) => {
        const principal = c?.direccion ?? "";
        const extras: DireccionExtra[] = c?.direccionesExtras ?? [];
        setClienteDireccion(principal);
        setClienteDireccionesExtras(extras);

        // Si el tipo de entrega ya era ENVIO, actualizar lugar_despacho con la principal
        setForm((prev) => {
          const desc = tiposEntrega
            .find((te) => String(te.id) === prev.tipoentregaId)
            ?.descripcion?.toUpperCase() ?? "";
          if (desc.includes("ENVIO") && !prev.lugar_despacho) {
            return { ...prev, lugar_despacho: principal };
          }
          return prev;
        });
      })
      .catch(() => {
        setClienteDireccion("");
        setClienteDireccionesExtras([]);
      });
  }, [form.clienteId]);

  // ── Carga datos para edición ───────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    const loadEdit = async () => {
      setLoadingEdit(true);
      try {
        const res = await pedidoventaService.getById(editId);
        const pv  = (res as any).pedidoventa ?? res;
        setForm({
          clienteId:            pv.clienteId             ?? "",
          cliente_referencia:   pv.cliente_referencia    ?? "",
          trabajadorId:         pv.trabajadorId          ?? "",
          monedaId:             pv.monedaId              ?? "",
          tipo_cambio:          String(pv.tipo_cambio    ?? "1"),
          formaspagoId:         pv.formaspagoId          ?? "",
          condicion_pago:       pv.condicion_pago        ?? "",
          tipoentregaId:        pv.tipoentregaId         ? String(pv.tipoentregaId) : "",
          almacenId:            "",
          direccion_entrega:    pv.direccion_entrega     ?? "",
          documento_referencia: pv.documento_referencia  ?? "",
          fecha_entrega:        pv.fecha_entrega         ? pv.fecha_entrega.substring(0, 10) : "",
          fecha_vencimiento:    pv.fecha_vencimiento     ? pv.fecha_vencimiento.substring(0, 10) : "",
          observacion:          pv.observacion           ?? "",
          lugar_despacho:       pv.lugar_despacho        ?? "",
          operaciongratuita:    pv.operaciongratuita     ? "true" : "false",
          tipoopegratuitaId:    pv.tipoopegratuitaId     ?? "00",
        });
        const rawDetalles: any[] = (res as any).detalle ?? pv.detalles ?? [];
        setDetalles(
          rawDetalles.map((d: any, idx: number) => ({
            item:               d.item ?? idx + 1,
            bienId:             d.bienId             ?? "",
            presentacionId:     d.presentacionId     ?? "",
            cantidad:           Number(d.cantidad    ?? 1),
            precio:             Number(d.precio      ?? 0),
            descuento_producto: Number(d.descuento_producto ?? 0),
            afecto_inafecto:    d.afecto_inafecto     ?? true,
            observacion:        d.observacion         ?? "",
          }))
        );
      } catch (err: any) {
        toast.error(err?.message ?? "No se pudo cargar el pedido para editar");
      } finally {
        setLoadingEdit(false);
      }
    };
    loadEdit();
  }, [editId]);

  // ── Presentaciones / nombres ───────────────────────────────────────────────
  // Bienes filtrados: solo los que tienen al menos una presentación en la lista de precios
  const bienesDisponibles = useMemo(() => {
    if (!catalogs?.bienes) return [];
    if (listaPrecioDetalles.length === 0) return catalogs.bienes;
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return catalogs.bienes.filter((b) => {
      const pres = catalogs.presentaciones?.find((g) => g.bienId === b.key)?.items ?? [];
      return pres.some((p) => presIds.has(String(p.key)));
    });
  }, [catalogs, listaPrecioDetalles]);

  const getPresentacionOpts = useCallback(
    (bienId: string) => {
      if (!catalogs?.presentaciones || !bienId) return [];
      const todas = catalogs.presentaciones.find((g) => g.bienId === bienId)?.items ?? [];
      if (listaPrecioDetalles.length === 0) return toOpts(todas);
      const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
      return toOpts(todas.filter((p) => presIds.has(String(p.key))));
    },
    [catalogs, listaPrecioDetalles]
  );

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

  // ── Handlers generales ─────────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: { target: { name: string; value: string } }) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

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

  // ── Helpers tipo entrega ───────────────────────────────────────────────────
  const tipoEntregaDesc = tiposEntrega
    .find((te) => String(te.id) === form.tipoentregaId)
    ?.descripcion?.toUpperCase() ?? "";

  const isRecojo = tipoEntregaDesc.includes("RECOJO");
  const isEnvio  = tipoEntregaDesc.includes("ENVIO");

  const handleTipoEntregaChange = (e: { target: { name: string; value: string } }) => {
    const newId  = e.target.value;
    const desc   = tiposEntrega.find((t) => String(t.id) === newId)?.descripcion?.toUpperCase() ?? "";
    const esEnvio  = desc.includes("ENVIO");
    const esRecojo = desc.includes("RECOJO");
    setForm((prev) => ({
      ...prev,
      tipoentregaId:     newId,
      almacenId:         "",
      // Al cambiar a ENVIO: pre-llenar con dirección principal del cliente
      lugar_despacho:    esEnvio ? clienteDireccion : "",
      direccion_entrega: esRecojo ? "" : prev.direccion_entrega,
    }));
  };

  const handleAlmacenChange = (almId: string) => {
    const alm = almacenOpts.find((a) => a.key === almId);
    setForm((prev) => ({ ...prev, almacenId: almId, lugar_despacho: alm?.aux ?? "" }));
  };

  // ── Detalle ────────────────────────────────────────────────────────────────
  const calcImporte = (d: PedidoVentaDetalle) =>
    Number(d.cantidad ?? 0) * Number(d.precio ?? 0) * (1 - Number(d.descuento_producto ?? 0) / 100);

  const totalGeneral = useMemo(
    () => detalles.reduce((acc, d) => acc + calcImporte(d), 0),
    [detalles]
  );

  const handleAgregarDetalle = () => {
    if (!nuevoDetalle.bienId)               return toast.error("Seleccione el producto");
    if (!nuevoDetalle.presentacionId)       return toast.error("Seleccione la presentación");
    if (Number(nuevoDetalle.cantidad) <= 0) return toast.error("La cantidad debe ser mayor a 0");
    if (Number(nuevoDetalle.precio)   <= 0) return toast.error("El precio debe ser mayor a 0");
    if (precioLimites) {
      if (Number(nuevoDetalle.precio) < precioLimites.min)
        return toast.error(`El precio no puede ser menor al mínimo (${precioLimites.min.toFixed(6)})`);
      if (precioLimites.max > 0 && Number(nuevoDetalle.precio) > precioLimites.max)
        return toast.error(`El precio no puede superar el máximo (${precioLimites.max.toFixed(6)})`);
    }
    setDetalles((prev) => [...prev, { ...nuevoDetalle, item: prev.length + 1 } as any]);
    setNuevoDetalle(emptyNuevoDetalle());
    setPrecioLimites(null);
  };

  const handleEliminarDetalle = (i: number) => {
    setDetalles((prev) =>
      prev.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, item: idx + 1 }))
    );
  };

  // ── Validación ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.clienteId.trim())      return "El cliente es requerido";
    if (!form.trabajadorId.trim())   return "El vendedor es requerido";
    if (!form.monedaId.trim())       return "La moneda es requerida";
    if (!form.condicion_pago.trim()) return "La condición de pago es requerida";
    if (detalles.length === 0)       return "Agregue al menos un ítem al pedido";
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    try {
      setSaving(true);
      const esGratuita          = form.operaciongratuita === "true";
      const valorventa_afecto   = detalles.filter((d) => d.afecto_inafecto !== false && !esGratuita).reduce((acc, d) => acc + calcImporte(d), 0);
      const valorventa_inafecto = detalles.filter((d) => d.afecto_inafecto === false && !esGratuita).reduce((acc, d) => acc + calcImporte(d), 0);
      const valorventa_gratuito = esGratuita ? detalles.reduce((acc, d) => acc + calcImporte(d), 0) : 0;

      const payload: Partial<PedidoVenta> = {
        clienteId:            form.clienteId.trim(),
        cliente_referencia:   form.cliente_referencia.trim()   || undefined,
        trabajadorId:         form.trabajadorId.trim(),
        monedaId:             form.monedaId.trim(),
        tipo_cambio:          Number(form.tipo_cambio) || 1,
        formaspagoId:         form.formaspagoId.trim()         || undefined,
        condicion_pago:       form.condicion_pago.trim()       || undefined,
        tipoentregaId:        form.tipoentregaId ? Number(form.tipoentregaId) : undefined,
        direccion_entrega:    form.direccion_entrega.trim()     || undefined,
        documento_referencia: form.documento_referencia.trim() || undefined,
        fecha_entrega:        form.fecha_entrega                || undefined,
        fecha_vencimiento:    form.fecha_vencimiento            || undefined,
        observacion:          form.observacion.trim()           || undefined,
        lugar_despacho:       form.lugar_despacho.trim()        || undefined,
        listaprecioId:        LISTA_PRECIO_ID,
        operaciongratuita:    esGratuita,
        tipoopegratuitaId:    form.tipoopegratuitaId.trim()     || undefined,
        valorventa_afecto,
        valorventa_inafecto,
        valorventa_gratuito,
        cuentausuarioId:      CUENTA_USUARIO_ID,
        empresaId:            EMPRESA_ID,
        detalles: detalles.map((d, idx) => ({
          item:               idx + 1,
          bienId:             d.bienId,
          presentacionId:     d.presentacionId,
          cantidad:           Number(d.cantidad),
          precio:             Number(d.precio),
          descuento_producto: Number(d.descuento_producto ?? 0),
          afecto_inafecto:    d.afecto_inafecto ?? true,
          observacion:        d.observacion ?? "",
        })),
      };

      if (isEditing && editId) {
        await pedidoventaService.update(editId, CUENTA_USUARIO_ID, payload);
        toast.success("Pedido de venta actualizado correctamente");
      } else {
        await pedidoventaService.create(payload);
        toast.success("Pedido de venta creado correctamente");
      }
      router.push("/dashboard/pedidoventa");
    } catch (error: any) {
      toast.error(error?.message || `Error al ${isEditing ? "actualizar" : "crear"} el pedido de venta`);
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
            onClick={() => router.push("/dashboard/pedidoventa")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => router.push("/dashboard/pedidoventa")}>
                Pedidos de Venta
              </span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">{isEditing ? "Editar Pedido" : "Nuevo Pedido"}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? "Editar Pedido de Venta" : "Nuevo Pedido de Venta"}
            </h1>
            {isEditing && editId && <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {editId}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/dashboard/pedidoventa")}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isBusy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? <><IconLoader className="animate-spin" size={18} /> Guardando...</>
              : <><IconDeviceFloppy size={18} /> {isEditing ? "Actualizar Pedido" : "Registrar Pedido"}</>
            }
          </button>
        </div>
      </div>

      {isBusy && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <IconLoader size={14} className="animate-spin" />
          {loadingEdit ? "Cargando datos del pedido..." : "Cargando catálogos del formulario..."}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">

        {/* ── Columna izquierda ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

        {/* ══ Datos del Cliente ══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <SectionHeader icon={<IconShoppingCart size={16} />} title="Datos del Cliente" />
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
            <FormInput
              label="Referencia Cliente"
              name="cliente_referencia"
              value={form.cliente_referencia}
              onChange={handleChange}
              placeholder="Nombre de contacto, referencia..."
              disabled={isBusy}
            />
            <TrabajadorDDL
              empresaId={EMPRESA_ID}
              value={form.trabajadorId}
              onChange={(id) => setForm((prev) => ({ ...prev, trabajadorId: id }))}
            />
            <FormInput
              label="Doc. Referencia"
              name="documento_referencia"
              value={form.documento_referencia}
              onChange={handleChange}
              placeholder="Orden de compra, cotización..."
              disabled={isBusy}
            />
          </div>
        </div>

        {/* ══ Entrega ══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <SectionHeader icon={<IconTruck size={16} />} title="Entrega" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Tipo de Entrega */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo de Entrega</label>
              <select
                name="tipoentregaId"
                value={form.tipoentregaId}
                onChange={handleTipoEntregaChange}
                disabled={isBusy}
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
              >
                <option value="">Seleccionar...</option>
                {tiposEntrega.map((te) => (
                  <option key={te.id} value={String(te.id)}>{te.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Col derecha según tipo */}
            {isRecojo ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Almacén *</label>
                <select
                  value={form.almacenId}
                  onChange={(e) => handleAlmacenChange(e.target.value)}
                  disabled={isBusy || almacenOpts.length === 0}
                  className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                >
                  <option value="">Seleccionar almacén...</option>
                  {almacenOpts.map((a) => (
                    <option key={a.key} value={a.key}>{a.value}</option>
                  ))}
                </select>
                {form.lugar_despacho && (
                  <p className="text-[11px] text-slate-500 ml-1 flex items-center gap-1 mt-0.5">
                    <span className="text-blue-500">📍</span>
                    <span className="font-mono">{form.lugar_despacho}</span>
                  </p>
                )}
              </div>
            ) : isEnvio ? (
              // ── ENVIO: DDL con direcciones del cliente + opción libre ──────
              <DireccionEntregaDDL
                direccionPrincipal={clienteDireccion}
                direccionesExtras={clienteDireccionesExtras}
                value={form.lugar_despacho}
                onChange={(val) => setForm((prev) => ({ ...prev, lugar_despacho: val }))}
                disabled={isBusy}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dirección de Entrega</label>
                <input
                  disabled
                  placeholder="Seleccione un tipo de entrega..."
                  className="w-full border border-slate-100 p-2.5 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed uppercase"
                />
              </div>
            )}

            <DateInput
              label="Fecha de Entrega"
              name="fecha_entrega"
              value={form.fecha_entrega}
              onChange={handleChange}
              disabled={isBusy}
            />
            <DateInput
              label="Fecha Vencimiento"
              name="fecha_vencimiento"
              value={form.fecha_vencimiento}
              onChange={handleChange}
              disabled={isBusy}
            />
          </div>
        </div>

        </div>{/* ── fin columna izquierda ── */}

        {/* ── Columna derecha ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 self-start sticky top-6">

          {/* ══ Condiciones Comerciales ══ */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader icon={<IconCoin size={16} />} title="Condiciones Comerciales" />
            <div className="space-y-4">

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Moneda *</label>
                <select
                  name="monedaId"
                  value={form.monedaId}
                  onChange={handleChange}
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

              <FormInput
                label="Tipo de Cambio"
                name="tipo_cambio"
                type="number"
                value={form.tipo_cambio}
                onChange={handleChange}
                placeholder="1.00"
                min="0"
                step="0.001"
                disabled={isBusy}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condición de Pago *</label>
                <select
                  name="condicion_pago"
                  value={form.condicion_pago}
                  onChange={handleChange}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Forma de Pago</label>
                <select
                  name="formaspagoId"
                  value={form.formaspagoId}
                  onChange={handleChange}
                  onFocus={refreshFormasPago}
                  disabled={isBusy}
                  className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                >
                  <option value="">Seleccionar...</option>
                  {formasPago.map((fp: any) => (
                    <option key={fp.formaspagoId ?? fp.descripcion} value={fp.formaspagoId ?? ""}>
                      {fp.descripcion}{fp.diasFormPago != null ? ` (${fp.diasFormPago}d)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Operación Gratuita</label>
                <select
                  name="operaciongratuita"
                  value={form.operaciongratuita}
                  onChange={handleChange}
                  disabled={isBusy}
                  className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase transition-all disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observación</label>
                <textarea
                  name="observacion"
                  value={form.observacion}
                  onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  disabled={isBusy}
                  className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase resize-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

            </div>
          </div>

        </div>{/* ── fin columna derecha ── */}

      </div>{/* ── fin grid ── */}

      {/* ══ Detalle de Ítems ══ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={<IconListDetails size={16} />} title="Detalle de Ítems" />
          {nuevoDetalle.bienId && (
            <button
              type="button"
              onClick={() => setShowStock(true)}
              className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Ver stock disponible
            </button>
          )}
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-[10px] font-bold text-blue-600 uppercase mb-3">Agregar nuevo ítem</p>
          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-12 md:col-span-6">
              <SearchableSelect
                label="Producto *"
                name="bienId"
                options={toOpts(bienesDisponibles)}
                value={nuevoDetalle.bienId ?? ""}
                disabled={isBusy}
                onChange={(e: any) => { setPrecioLimites(null); setNuevoDetalle((prev) => ({ ...prev, bienId: e.target.value, presentacionId: "", precio: 0 })); }}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <SearchableSelect
                label="Presentación *"
                name="presentacionId"
                options={getPresentacionOpts(nuevoDetalle.bienId ?? "")}
                value={nuevoDetalle.presentacionId ?? ""}
                onChange={(e: any) => {
                  const presentacionId = e.target.value;
                  const monedaId = form.monedaId ?? "001";
                  const det = listaPrecioDetalles.find((d) => d.presentacionId === presentacionId);
                  let precio = 0;
                  let limites: { min: number; max: number } | null = null;
                  if (det) {
                    if (monedaId === "002") {
                      precio  = det.precio_nuevo_minimo_dol ?? 0;
                      limites = { min: det.precio_nuevo_minimo_dol ?? 0, max: det.precio_nuevo_dol ?? 0 };
                    } else if (monedaId === "003") {
                      precio  = det.precio_nuevo_minimo_eur ?? 0;
                      limites = { min: det.precio_nuevo_minimo_eur ?? 0, max: det.precio_nuevo_eur ?? 0 };
                    } else {
                      precio  = det.precio_nuevo_minimo ?? 0;
                      limites = { min: det.precio_nuevo_minimo ?? 0, max: det.precio_nuevo ?? 0 };
                    }
                  }
                  setPrecioLimites(limites);
                  setNuevoDetalle((prev) => ({ ...prev, presentacionId, ...(precio > 0 ? { precio } : {}) }));
                }}
                disabled={isBusy || !nuevoDetalle.bienId || getPresentacionOpts(nuevoDetalle.bienId ?? "").length === 0}
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">Cantidad *</label>
              <input
                type="number" min="0.001" step="0.001"
                value={nuevoDetalle.cantidad ?? ""}
                disabled={isBusy}
                onChange={(e) => setNuevoDetalle((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div className="col-span-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">
                Precio *
                {precioLimites && (
                  <span className="ml-2 font-normal text-slate-400 normal-case">
                    min {precioLimites.min.toFixed(6)} — máx {precioLimites.max.toFixed(6)}
                  </span>
                )}
              </label>
              <input
                type="number"
                min={precioLimites?.min ?? 0}
                max={precioLimites?.max ?? undefined}
                step="0.000001"
                value={nuevoDetalle.precio ?? ""}
                disabled={isBusy}
                onChange={(e) => setNuevoDetalle((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                className={`w-full border rounded-lg px-2.5 py-2 text-sm text-right font-mono outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-400 ${
                  precioLimites && nuevoDetalle.precio
                    ? nuevoDetalle.precio < precioLimites.min || nuevoDetalle.precio > precioLimites.max
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-slate-200 focus:ring-blue-500"
                    : "border-slate-200 focus:ring-blue-500"
                }`}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-12 gap-3">
            <div className="col-span-10">
              <input
                placeholder="Observación del ítem (opcional)..."
                value={nuevoDetalle.observacion ?? ""}
                disabled={isBusy}
                onChange={(e) => setNuevoDetalle((prev) => ({ ...prev, observacion: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div className="col-span-2">
              <button
                type="button"
                onClick={handleAgregarDetalle}
                disabled={isBusy}
                className="w-full h-[42px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50"
              >
                <IconPlus size={16} /> Agregar
              </button>
            </div>
          </div>
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
                <th className="p-3 text-right w-20">Desc. %</th>
                <th className="p-3 text-right w-28">Importe</th>
                <th className="p-3 text-center w-16">Afecto</th>
                <th className="p-3">Obs.</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200">
                    No hay ítems. Seleccione un producto y agréguelo con el panel de arriba.
                  </td>
                </tr>
              ) : (
                detalles.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono font-bold">{i + 1}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 block leading-tight truncate max-w-[180px]">
                        {getBienNombre(d.bienId ?? "")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{d.bienId}</span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">{getPresentacionNombre(d.bienId ?? "", d.presentacionId ?? "")}</td>
                    <td className="p-3 text-center font-mono">{Number(d.cantidad).toFixed(3)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(Number(d.precio))}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{Number(d.descuento_producto ?? 0).toFixed(2)}%</td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800">{formatMoney(calcImporte(d))}</td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={d.afecto_inafecto ?? true} readOnly className="w-3.5 h-3.5 accent-blue-600 cursor-default" />
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
                ))
              )}
            </tbody>
            {detalles.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total estimado</td>
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

      {showStock && nuevoDetalle.bienId && (
        <StockDisponible
          empresaId={EMPRESA_ID}
          bienId={nuevoDetalle.bienId}
          bienNombre={catalogs?.bienes?.find((b) => b.key?.toString() === nuevoDetalle.bienId)?.value ?? nuevoDetalle.bienId}
          onClose={() => setShowStock(false)}
        />
      )}

    </div>
  );
}