"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCrearStore } from "../store";
import ImportarPedidoModal, {
  type PedidoVentaRow,
} from "../../components/ImportarPedidoModal";

import documentoVentaService from "@/services/DocumentoventaService";
import condicionPagoService from "@/services/condicionpagoService";
import formasPagoService from "@/services/formaspagoService";
import trabajadorService from "@/services/trabajadorService";
import tipoOpeGratuitaService from "@/services/tipoopegratuitaService";
import listaPreciosService from "@/services/listaprecioService";
import type { ListaPrecioDetalle } from "@/types/listaprecio.types";
import ClienteFormModal from "@/app/dashboard/clientes/components/ClienteFormModal";

import type {
  CreateDocumentoVentaDTO,
  CreateDocumentoVentaDetalleDTO,
  CreateDocumentoVentaResponse,
  FormDropdownsDocumentoVenta,
  KeyValueOption,
  BienOption,
} from "@/types/Documentoventa.types";
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
  IconEdit,
  IconTruck,
  IconChevronDown,
  IconSearch,
  IconUserCircle,
  IconX,
  IconFileImport,
  IconDeviceFloppy,
  IconRefresh,
  IconUserPlus,
} from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const IGV_PORCENTAJE = 0.18;
const EMPRESA_ID     = "005";
const TENANT_ID      = "1";

const TIPO_SOLO_RUC = ["X028"];
const TIPO_SOLO_DNI = ["X007", "X077"];

// ─────────────────────────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────────────────────────

const SectionTitle = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) => (
  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-2">
    <Icon className="text-blue-600" size={20} />
    <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

const FormInput = ({ label, className, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
      {label}
    </label>
    <input
      className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all text-sm ${className || ""}`}
      {...props}
    />
  </div>
);

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.trabajadorId === value) return;
    trabajadorService.getById(value).then(setSelected).catch(() => setSelected(null));
  }, [value, selected?.trabajadorId]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const normalizeGetAllResponse = (res: any) => {
    const data =
      (Array.isArray(res?.data)        && res.data)       ||
      (Array.isArray(res?.data?.data)  && res.data.data)  ||
      (Array.isArray(res?.data?.items) && res.data.items) ||
      (Array.isArray(res?.items)       && res.items)      ||
      (Array.isArray(res)              && res)            || [];
    const meta        = res?.meta || res?.data?.meta || res?.data?.Meta || {};
    const totalPages  = meta?.totalPages  ?? meta?.total_pages  ?? meta?.TotalPages  ?? meta?.totalPaginas ?? 1;
    const currentPage = meta?.currentPage ?? meta?.current_page ?? meta?.CurrentPage ?? meta?.pagina       ?? meta?.page ?? undefined;
    return { data, meta, totalPages, currentPage };
  };

  const fetchItems = useCallback(
    async (q: string, pg: number, replace: boolean) => {
      if (!empresaId) return;
      replace ? setLoading(true) : setLoadingMore(true);
      try {
        const res: any = await trabajadorService.getAll(empresaId, pg, 15, q || undefined);
        const parsed   = normalizeGetAllResponse(res);
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
    setSelected(t); onChange(t.trabajadorId); setOpen(false); setQuery("");
  };
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); setSelected(null); onChange("");
  };

  const displayName = selected
    ? `${(selected as any).nombres ?? ""} ${(selected as any).apellidos ?? ""}`.trim() || selected.trabajadorId
    : "";
  const docLabel = (selected as any)?.numero_doc ?? (selected as any)?.numeroDoc ?? "";

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        Trabajador / Vendedor
      </label>
      <div
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full border rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all select-none ${
          open ? "border-blue-400 ring-2 ring-blue-500/20 bg-white" : "border-slate-200 bg-white hover:border-slate-300"
        }`}
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
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, apellido o documento..."
              className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400 bg-transparent"
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
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-xs transition-colors ${
                      active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
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
// Contenido principal
// ─────────────────────────────────────────────────────────────────────────────

function CrearDocumentoVentaContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("editId");
  const isEditMode   = !!editId;

  const [loading,           setLoading]           = useState(false);
  const [loadingCat,        setLoadingCat]        = useState(true);
  const [loadingEdit,       setLoadingEdit]       = useState(false);
  const [catalogs,          setCatalogs]          = useState<FormDropdownsDocumentoVenta | null>(null);
  const [condicionesPago,   setCondicionesPago]   = useState<CondicionPago[]>([]);
  const [formasPago,        setFormasPago]        = useState<FormasPago[]>([]);
  const [tiposOpeGratuita,  setTiposOpeGratuita]  = useState<TipoOpeGratuita[]>([]);
  const [listaPrecioDetalles, setListaPrecioDetalles] = useState<ListaPrecioDetalle[]>([]);
  const [modalImportar,     setModalImportar]     = useState(false);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [pedidoImportadoId,       setPedidoImportadoId]       = useState<string | null>(null);
  const [pedidoOriginalItemCount, setPedidoOriginalItemCount] = useState<number>(0);
  const [clienteDocIdentId,       setClienteDocIdentId]       = useState<string | null>(null);

  // Key para forzar re-mount del DropDownClient tras crear un cliente nuevo
  const [clienteDDLKey, setClienteDDLKey] = useState(0);

  const {
    dVentaForm: formData,
    setDVentaForm: setFormData,
    updateDVenta: updateField,
    detalles,
    setDetalles,
    guiaActiva,
    setGuiaActiva,
    resetAll,
  } = useCrearStore();

  const handleChange = useCallback(
    (e: any) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [setFormData]
  );

  const emptyDetalle: CreateDocumentoVentaDetalleDTO = {
    bienId: "", presentacionId: "", cantidad: 1, precio: 0,
    descuentoProducto: 0, afectoInafecto: true, key: "", detraccionPorcentaje: 0,
  };
  const [nuevoDetalle, setNuevoDetalle] = useState<CreateDocumentoVentaDetalleDTO>({ ...emptyDetalle });
  const today = new Date().toISOString().split("T")[0];

  // ── Limpiar todo ─────────────────────────────────────────────────────────────
  const handleLimpiar = useCallback(() => {
    resetAll();
    setNuevoDetalle({ ...emptyDetalle });
    setPedidoImportadoId(null);
    setClienteDocIdentId(null);
    updateField("pedidoventaId", null);
    toast.success("Formulario limpiado");
  }, [resetAll]);

  // ── Callback: cliente creado exitosamente ────────────────────────────────────
  const handleClienteCreado = useCallback(() => {
    setModalNuevoCliente(false);
    setClienteDDLKey((k) => k + 1); // fuerza re-fetch del dropdown
    toast.success("Cliente registrado — ya puedes buscarlo en el campo Cliente");
  }, []);

  // ── Carga de catálogos ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCat(true);
    documentoVentaService
      .getFormDropdowns(EMPRESA_ID, TENANT_ID)
      .then((data) => {
        setCatalogs(data);
        if (!isEditMode) {
          setFormData((prev) => ({
            ...prev,
            fechaEmision: (prev as any).fechaEmision || today,
            fechaDoc:     (prev as any).fechaDoc     || today,
            monedaId:     (prev as any).monedaId     || (data.monedas?.[0]?.key?.toString() ?? ""),
            tipoCambio:   (prev as any).tipoCambio   || 1,
          }));
        }
      })
      .catch(() => toast.error("No se pudieron cargar los catálogos del formulario"))
      .finally(() => setLoadingCat(false));
  }, [isEditMode, setFormData, today]);

  // ── Carga condiciones y formas de pago ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [resCP, resFP, resTOG, resLP] = await Promise.allSettled([
        condicionPagoService.getAll(),
        formasPagoService.getAll(1, 100),
        tipoOpeGratuitaService.getAll(),
        listaPreciosService.getById("092200000001"),
      ]);
      const cp = resCP.status === "fulfilled" ? resCP.value : [];
      setCondicionesPago(cp);
      setFormasPago(resFP.status === "fulfilled" ? (resFP.value as any).data : []);
      setTiposOpeGratuita(resTOG.status === "fulfilled" ? resTOG.value : []);
      if (resLP.status === "fulfilled") {
        setListaPrecioDetalles(resLP.value.detalles ?? []);
      }
      if (!isEditMode && cp.length > 0) {
        setFormData((prev) => ({
          ...prev,
          condicionPago: (prev as any).condicionPago ||
            ((cp[0] as any).condicionPagoId ?? (cp[0] as any).condicion_pago ?? ""),
        }));
      }
    };
    load();
  }, [isEditMode, setFormData]);

  // ── Carga datos en modo edición ──────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    resetAll();
    setLoadingEdit(true);
    documentoVentaService
      .getById(editId)
      .then((doc) => {
        setFormData({
          tipodoccomercialId:   doc.tipodoccomercialId       ?? "",
          serie:                doc.serie                    ?? "",
          numero:               doc.numero                   ?? "",
          fechaEmision:         doc.fecha_emision?.split("T")[0] ?? today,
          fechaDoc:             doc.fecha_doc?.split("T")[0]     ?? today,
          monedaId:             doc.monedaId                 ?? "",
          tipoCambio:           doc.tipo_cambio              ?? 1,
          clienteId:            doc.clienteId                ?? "",
          condicionPago:        doc.condicion_pago           ?? "",
          puntoventaId:         doc.puntoventaId             ?? "",
          trabajadorId:         doc.trabajadorId             ?? "",
          tipopagoId:           doc.tipopagoId               ?? "",
          tipoopegratuitaId:       doc.tipoopegratuitaId         ?? "00",
          observacion:          doc.observacion              ?? "",
          ordencompraNumero:    doc.ordencompra_numero       ?? "",
          detraccion:           doc.detraccion               ?? false,
          detraccionPorcentaje: doc.detraccion_porcentaje    ?? 0,
          detraccionMonto:      doc.detraccion_monto         ?? 0,
          fechaVencimiento:     doc.fecha_vencimiento?.split("T")[0] ?? undefined,
          cuentausuarioId:      doc.cuentausuarioId          ?? "",
        } as any);

        if (doc.detalles && doc.detalles.length > 0) {
          setDetalles(
            doc.detalles.map((det: any, idx: number) => ({
              item:                 det.item                 ?? idx + 1,
              bienId:               det.bienId               ?? "",
              presentacionId:       det.presentacionId       ?? "",
              cantidad:             det.cantidad             ?? 1,
              precio:               det.precio               ?? 0,
              descuentoProducto:    det.descuento_producto   ?? det.descuentoProducto ?? 0,
              afectoInafecto:       det.afectoInafecto       ?? true,
              importe:              det.importe              ?? 0,
              precioSinIgv:         det.precioSinIgv         ?? undefined,
              porcentajeIgv:        det.porcentajeIgv        ?? undefined,
              observacion:          det.observacion          ?? "",
              key:                  det.key                  ?? "000",
              detraccionPorcentaje: det.detraccionPorcentaje ?? 0,
            }))
          );
        }
        toast.success(`Datos cargados: ${doc.serie}-${doc.numero}`);
      })
      .catch((err) => {
        console.error(err);
        toast.error("No se pudo cargar el documento para edición");
        router.push("/dashboard/ventas");
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, router, setDetalles, setFormData, resetAll, today]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derivados / memos
  // ─────────────────────────────────────────────────────────────────────────────

  const toOpts = (items: KeyValueOption[] = []) =>
    items.map((x) => ({ key: x.key?.toString() ?? "", value: x.value || `COD: ${x.key}` }));

  const monedaLabel = useMemo(() => {
    const found = catalogs?.monedas?.find((m) => m.key?.toString() === (formData as any).monedaId);
    if (!found) return "S/";
    const v = (found.value ?? "").toUpperCase();
    if (v.includes("DOLAR")) return "US$";
    if (v.includes("EURO"))  return "€";
    return "S/";
  }, [catalogs, (formData as any).monedaId]);

  const filtroTipoDoc = useMemo<"RUC" | "DNI" | null>(() => {
    const tipo = (formData as any).tipodoccomercialId;
    if (!tipo) return null;
    if (TIPO_SOLO_RUC.includes(tipo)) return "RUC";
    if (TIPO_SOLO_DNI.includes(tipo)) return "DNI";
    return null;
  }, [(formData as any).tipodoccomercialId]);

  const tiposDocFiltrados = useMemo(() => {
    const todos = catalogs?.tipos_documento_comercial ?? [];
    if (!clienteDocIdentId) return todos;
    const esRUC = clienteDocIdentId === "6" || clienteDocIdentId?.toUpperCase().includes("RUC");
    const esDNI = clienteDocIdentId === "1" || clienteDocIdentId?.toUpperCase().includes("DNI");
    if (esDNI) return todos.filter((t) => !TIPO_SOLO_RUC.includes(t.key?.toString() ?? ""));
    if (esRUC) return todos.filter((t) => !TIPO_SOLO_DNI.includes(t.key?.toString() ?? ""));
    return todos;
  }, [catalogs, clienteDocIdentId]);

  const presentacionesActuales = useMemo(() => {
    if (!catalogs?.presentaciones || !(nuevoDetalle as any).bienId) return [];
    const todas = catalogs.presentaciones.find((g) => g.bienId === (nuevoDetalle as any).bienId)?.items ?? [];
    if (listaPrecioDetalles.length === 0) return todas;
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return todas.filter((p) => presIds.has(String(p.key)));
  }, [catalogs, (nuevoDetalle as any).bienId, listaPrecioDetalles]);

  const seriesFiltradas = useMemo(() => {
    if (!catalogs?.series || !(formData as any).tipodoccomercialId || !(formData as any).puntoventaId) return [];
    return (
      catalogs.series.find(
        (g) =>
          g.tipodoccomercialId === (formData as any).tipodoccomercialId &&
          g.puntoventaId       === (formData as any).puntoventaId
      )?.items ?? []
    );
  }, [catalogs, (formData as any).tipodoccomercialId, (formData as any).puntoventaId]);

  const siguienteNumero = useMemo(() => {
    const { tipodoccomercialId, puntoventaId, serie } = formData as any;
    if (!catalogs?.siguientes_numeros || !tipodoccomercialId || !puntoventaId || !serie) return "";
    return (
      catalogs.siguientes_numeros.find(
        (n) =>
          n.tipodoccomercialId === tipodoccomercialId &&
          n.puntoventaId       === puntoventaId &&
          n.serie              === serie
      )?.siguienteNumero ?? ""
    );
  }, [catalogs, (formData as any).tipodoccomercialId, (formData as any).puntoventaId, (formData as any).serie]);

  const getBienNombre = useCallback(
    (bienId: string) => catalogs?.bienes?.find((b) => b.key?.toString() === bienId)?.value ?? bienId,
    [catalogs]
  );
  const getPresentacionNombre = useCallback(
    (bienId: string, presentacionId: string) => {
      const g = catalogs?.presentaciones?.find((g) => g.bienId === bienId);
      return g?.items?.find((p) => p.key?.toString() === presentacionId)?.value ?? presentacionId;
    },
    [catalogs]
  );
  const getPresentacionFactor = useCallback(
    (bienId: string, presentacionId: string): number => {
      const g = catalogs?.presentaciones?.find((g) => g.bienId === bienId);
      return g?.items?.find((p) => p.key?.toString() === presentacionId)?.factor ?? 1;
    },
    [catalogs]
  );
  const formatMoney = (val: number) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // Bienes filtrados por los que tienen al menos una presentación en la lista de precios
  const bienesDisponibles = useMemo(() => {
    if (!catalogs?.bienes) return [];
    if (listaPrecioDetalles.length === 0) return catalogs.bienes;
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return catalogs.bienes.filter((b) => {
      const pres = catalogs.presentaciones?.find((g) => g.bienId === b.key)?.items ?? [];
      return pres.some((p) => presIds.has(String(p.key)));
    });
  }, [catalogs, listaPrecioDetalles]);

  // Precio mínimo de la lista según bien + presentación + moneda
  const getPrecioFromLista = useCallback(
    (bienId: string, presentacionId: string, monedaId: string): number => {
      const det = listaPrecioDetalles.find(
        (d) => d.bienId === bienId && d.presentacionId === presentacionId
      );
      if (!det) return 0;
      if (monedaId === "002") return det.precio_nuevo_minimo_dol ?? 0;
      if (monedaId === "003") return det.precio_nuevo_minimo_eur ?? 0;
      return det.precio_nuevo_minimo ?? 0;
    },
    [listaPrecioDetalles]
  );

  const getBienDetraccionInfo = useCallback(
    (bienId: string): { key: string; detraccionPorcentaje: number; afectoInafecto: boolean } => {
      const bien = catalogs?.bienes?.find((b) => b.key === bienId) as BienOption | undefined;
      return {
        key: bien?.detraccionbienserviceId ?? "000",
        detraccionPorcentaje: bien?.detraccionPorcentaje ?? 0,
        afectoInafecto: bien?.afecto_inafecto ?? true,
      };
    },
    [catalogs]
  );

  const selectedFormaPago = useMemo(
    () => formasPago.find((f: any) => (f.formaspagoId ?? "") === ((formData as any).tipopagoId ?? "")),
    [formasPago, (formData as any).tipopagoId]
  );

  const isCondicionCredito = useMemo(() => {
    if (!(formData as any).condicionPago) return false;
    const selected = condicionesPago.find(
      (cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === (formData as any).condicionPago
    ) as any;
    return (
      (selected?.descripcion ?? selected?.condicion_pago ?? (formData as any).condicionPago) as string
    )
      .toUpperCase()
      .includes("CRED");
  }, [(formData as any).condicionPago, condicionesPago]);

  const isCondicionGratuita = useMemo(() => {
    if (!(formData as any).condicionPago) return false;
    const selected = condicionesPago.find(
      (cp: any) => (cp.condicionPagoId ?? cp.condicion_pago) === (formData as any).condicionPago
    ) as any;
    return (
      (selected?.descripcion ?? selected?.condicion_pago ?? (formData as any).condicionPago) as string
    )
      .toUpperCase()
      .includes("GRATU");
  }, [(formData as any).condicionPago, condicionesPago]);

  const totales = useMemo(() => {
    let valorventaAfecto = 0, valorventaInafecto = 0, igvTotal = 0;
    (detalles as any[]).forEach((det: any) => {
      const subtotal = det.cantidad * det.precio - (det.descuentoProducto || 0);
      if (det.afectoInafecto) {
        const base = subtotal / (1 + IGV_PORCENTAJE);
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
    };
  }, [detalles]);

  const detraccionMonto = useMemo(() => {
    if (!(formData as any).detraccion || !(formData as any).detraccionPorcentaje) return 0;
    return (
      Math.round(totales.total * (((formData as any).detraccionPorcentaje || 0) / 100) * 100) / 100
    );
  }, [(formData as any).detraccion, (formData as any).detraccionPorcentaje, totales.total]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Validaciones
  // ─────────────────────────────────────────────────────────────────────────────

  const validarFormulario = (): boolean => {
    const tipo = (formData as any).tipodoccomercialId as string;
    if (!tipo)                               { toast.error("Seleccione el tipo de documento"); return false; }
    if (!(formData as any).clienteId)        { toast.error("Seleccione el cliente");           return false; }
    if (!(formData as any).puntoventaId)     { toast.error("Seleccione el punto de venta");    return false; }
    if (!(formData as any).monedaId)         { toast.error("Seleccione la moneda");            return false; }
    if (!(formData as any).condicionPago)    { toast.error("Seleccione la condición de pago"); return false; }
    if ((detalles as any[]).length === 0)    { toast.error("Agregue al menos un item al documento"); return false; }
    if (isCondicionCredito && !(formData as any).fechaVencimiento) {
      toast.error("Ingrese la fecha de vencimiento para crédito");
      return false;
    }
    return true;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Handler: ACTUALIZAR
  // ─────────────────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!validarFormulario()) return;
    setLoading(true);
    try {
      const dto = {
        ...(formData as any),
        valorventaAfecto:   totales.valorventaAfecto,
        valorventaInafecto: totales.valorventaInafecto,
        igv:                totales.igv,
        total:              totales.total,
        saldo:              totales.total,
        detraccionMonto:    (formData as any).detraccion ? detraccionMonto : 0,
        detalles:           detalles as any,
      };
      const response = await documentoVentaService.update(editId!, dto);
      const isOk = response?.isSuccess ?? response?.data?.isSuccess ?? false;
      if (!isOk) {
        toast.error(response?.message ?? response?.data?.message ?? "Error al actualizar el documento");
        return;
      }
      toast.success("Documento actualizado correctamente");
      resetAll();
      router.push("/dashboard/ventas");
    } catch (error: any) {
      toast.error(error.message ?? "Error crítico al actualizar el documento");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Handler: CREAR
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (enviarSunat: boolean) => {
    if (!validarFormulario()) return;
    if (!(formData as any).serie) { toast.error("Seleccione la serie"); return; }

    setLoading(true);
    try {
      const dto: CreateDocumentoVentaDTO = {
        ...(formData as any),
        valorventaAfecto:   totales.valorventaAfecto,
        valorventaInafecto: totales.valorventaInafecto,
        igv:                totales.igv,
        total:              totales.total,
        saldo:              totales.total,
        detraccionMonto:    (formData as any).detraccion ? detraccionMonto : 0,
        detalles:           detalles as any,
      };

      const response: CreateDocumentoVentaResponse = await documentoVentaService.create(dto, enviarSunat);
      const res = response as any;

      if (enviarSunat) {
        const insertadoEnBD =
          (Array.isArray(res.documentosVentaIds) && res.documentosVentaIds.length > 0) ||
          !!res.documentoVentaId ||
          (res.documentosGenerados ?? 0) > 0;

        if (!insertadoEnBD) {
          toast.error(res.message || "Error al guardar el documento en base de datos");
          return;
        }
        const cantidad = res.documentosGenerados ?? res.documentosVentaIds?.length ?? 1;
        if (!res.isSuccess) {
          toast.warning(`${cantidad} documento(s) guardado(s) en BD · Error SUNAT: ${res.message ?? "revisar en la lista"}`);
        } else {
          toast.success(`${cantidad} documento(s) creados y aceptados por SUNAT`);
        }
      } else {
        if (!res.isSuccess) { toast.error(res.message || "Error al guardar el documento"); return; }
        const cantidad = res.documentosGenerados ?? 1;
        toast.success(cantidad > 1
          ? `${cantidad} documentos generados correctamente (familias de detracción)`
          : "Documento guardado correctamente"
        );
      }

      if (pedidoImportadoId) {
        // Determina si el pedido fue facturado parcialmente:
        // - se quitó algún item, O
        // - algún item tiene cantidad menor al saldo original
        const esUsoCompleto =
          (detalles as any[]).length === pedidoOriginalItemCount &&
          (detalles as any[]).every(
            (d: any) => Number(d.cantidad) >= Number(d.saldoCantidad ?? d.cantidad)
          );

        if (!esUsoCompleto) {
          try {
            const resPedido = await documentoVentaService.comprometerPedidoVenta(pedidoImportadoId);
            resPedido.isSuccess
              ? toast.success(`Pedido ${pedidoImportadoId} comprometido exitosamente`)
              : toast.warning(`Documento guardado pero no se pudo comprometer el pedido: ${resPedido.message}`);
          } catch (errC: any) {
            toast.warning(`Documento guardado pero no se pudo comprometer el pedido: ${errC.message}`);
          }
        }
        setPedidoImportadoId(null);
        setPedidoOriginalItemCount(0);
      }

      resetAll();
      router.push("/dashboard/ventas");

    } catch (error: any) {
      toast.error(error.message || "Error crítico al guardar el documento");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers de detalles
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAgregarDetalle = () => {
    if (!(nuevoDetalle as any).bienId)         return toast.error("Seleccione el producto");
    if (!(nuevoDetalle as any).presentacionId) return toast.error("Seleccione la presentación");
    if ((nuevoDetalle as any).cantidad <= 0)   return toast.error("La cantidad debe ser mayor a 0");
    if ((nuevoDetalle as any).precio   <= 0)   return toast.error("El precio debe ser mayor a 0");

    const factor          = getPresentacionFactor((nuevoDetalle as any).bienId, (nuevoDetalle as any).presentacionId);
    const conversionTotal = Math.round((nuevoDetalle as any).cantidad * factor * 1_000_000) / 1_000_000;
    const importe         = Math.round(((nuevoDetalle as any).cantidad * (nuevoDetalle as any).precio - ((nuevoDetalle as any).descuentoProducto || 0)) * 100) / 100;
    let precioSinIgv = (nuevoDetalle as any).precio, porcentajeIgv = 0;
    if ((nuevoDetalle as any).afectoInafecto) {
      precioSinIgv  = Math.round(((nuevoDetalle as any).precio / (1 + IGV_PORCENTAJE)) * 1_000_000) / 1_000_000;
      porcentajeIgv = 18;
    }
    const detraccionInfo = getBienDetraccionInfo((nuevoDetalle as any).bienId);

    setDetalles((prev: any) => [
      ...prev,
      {
        ...(nuevoDetalle as any),
        item: prev.length + 1,
        conversionTotal, importe,
        saldoCantidad: (nuevoDetalle as any).cantidad,
        saldoTemporal: importe,
        cantidadPendienteBoleteo: (nuevoDetalle as any).cantidad,
        precioSinIgv, porcentajeIgv,
        key: detraccionInfo.key,
        detraccionPorcentaje: detraccionInfo.detraccionPorcentaje,
      },
    ]);
    setNuevoDetalle({ ...emptyDetalle });
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
        const maxCantidad  = det.saldoCantidad ?? newCantidad;
        const cantidad     = Math.min(Math.max(newCantidad, 0), maxCantidad);
        if (newCantidad > maxCantidad) toast.warning(`Cantidad máxima disponible: ${maxCantidad}`);
        const factor         = getPresentacionFactor(det.bienId, det.presentacionId);
        const conversionTotal = Math.round(cantidad * factor * 1_000_000) / 1_000_000;
        const importe         = Math.round((cantidad * det.precio - (det.descuentoProducto || 0)) * 100) / 100;
        return { ...det, cantidad, conversionTotal, importe };
      })
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Handler: importar pedido
  // ─────────────────────────────────────────────────────────────────────────────

  const handleImportarPedido = useCallback(
    (pedido: PedidoVentaRow) => {
      setFormData((prev) => ({
        ...prev,
        clienteId:     pedido.clienteId      ?? prev.clienteId,
        trabajadorId:  pedido.trabajadorId   ?? prev.trabajadorId,
        puntoventaId:  pedido.puntoventaId   ?? prev.puntoventaId,
        monedaId:      pedido.monedaId       ?? prev.monedaId,
        tipoCambio:    pedido.tipo_cambio    ?? prev.tipoCambio,
        condicionPago: pedido.condicion_pago ?? prev.condicionPago,
        tipopagoId:    pedido.formaspagoId   ?? prev.tipopagoId,
        observacion:   pedido.observacion    ?? prev.observacion,
        pedidoventaId: pedido.pedidoventaId,
        serie: "", numero: "",
      }));

      const rawDetalles = pedido.detalle ?? [];
      const detallesFiltrados = rawDetalles
        .map((det: any, idx: number) => {
          const bienId         = det.bienId         ?? "";
          const presentacionId = det.presentacionId ?? "";
          const saldoCantidad  = det.saldo_cantidad ?? det.saldoCantidad ?? det.cantidad ?? 1;
          const cantidad       = Math.min(det.cantidad ?? 1, saldoCantidad);
          const precio         = det.precio          ?? 0;
          const descuento      = det.descuento_producto ?? det.descuentoProducto ?? 0;
          const afecto         = det.afecto_inafecto    ?? det.afectoInafecto    ?? true;
          const factor          = getPresentacionFactor(bienId, presentacionId);
          const conversionTotal = Math.round(cantidad * factor * 1_000_000) / 1_000_000;
          const importe         = Math.round((cantidad * precio - descuento) * 100) / 100;
          const precioSinIgv    = afecto ? Math.round((precio / (1 + IGV_PORCENTAJE)) * 1_000_000) / 1_000_000 : precio;
          const porcentajeIgv   = afecto ? 18 : 0;
          const detraccionInfo  = getBienDetraccionInfo(bienId);
          return {
            item: idx + 1, bienId, presentacionId, cantidad, precio,
            descuentoProducto: descuento, afectoInafecto: afecto,
            conversionTotal, importe,
            saldoCantidad, saldoTemporal: importe, cantidadPendienteBoleteo: cantidad,
            precioSinIgv, porcentajeIgv,
            key: detraccionInfo.key, detraccionPorcentaje: detraccionInfo.detraccionPorcentaje,
            observacion: det.observacion ?? "",
          };
        })
        .filter((det: any) => (det.saldoCantidad ?? 0) > 0);
      if (detallesFiltrados.length > 0) {
        setDetalles(detallesFiltrados.map((d: any, i: number) => ({ ...d, item: i + 1 })));
      }

      setPedidoImportadoId(pedido.pedidoventaId);
      setPedidoOriginalItemCount(detallesFiltrados.length);
      setClienteDocIdentId(pedido.cliente_docidentId ?? null);
      const ref = pedido.numero_correlativo ?? pedido.pedidoventaId;
      toast.success(`Pedido ${ref} importado · ${rawDetalles.length} ítem(s) cargados`);
    },
    [setFormData, setDetalles, getPresentacionFactor, getBienDetraccionInfo]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  const isBusy         = loadingCat || loadingEdit;
  const isPedidoLocked = !!pedidoImportadoId;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 pb-20">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {isEditMode ? (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">Editar Documento de Venta</h1>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <IconEdit size={12} /> Modo Edición
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos precargados desde el documento original · ID:{" "}
                <span className="font-mono text-blue-600">{editId}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-800">Nuevo Documento de Venta</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {pedidoImportadoId ? (
                  <span className="text-emerald-600 font-semibold">
                    ✓ Pedido {pedidoImportadoId} importado — se comprometará al guardar
                    <span className="ml-2 text-amber-600">· Cliente bloqueado · Puedes editar cantidades y quitar items</span>
                  </span>
                ) : (
                  "Complete los datos de cabecera y agregue los detalles del documento"
                )}
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!isEditMode && (
            <button
              type="button"
              onClick={() => setModalImportar(true)}
              disabled={isBusy || loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <IconFileImport size={18} className="text-indigo-500" />
              Importar
            </button>
          )}

          {!isEditMode && (
            <button
              type="button"
              onClick={handleLimpiar}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              title="Limpiar todos los campos del formulario"
            >
              <IconRefresh size={18} />
              Limpiar
            </button>
          )}

          {isEditMode ? (
            <button
              onClick={handleUpdate}
              disabled={isBusy || loading}
              className="px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg bg-amber-500 hover:bg-amber-600 shadow-amber-200"
            >
              {loading ? <IconLoader size={20} className="animate-spin" /> : <IconDeviceFloppy size={20} />}
              Actualizar Documento
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(true)}
              disabled={isBusy || loading}
              className="px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            >
              {loading ? <IconLoader size={20} className="animate-spin" /> : <IconSend size={20} />}
              Guardar
            </button>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {loadingEdit && (
        <div className="flex items-center gap-2 text-xs text-amber-700 mb-4 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
          <IconLoader size={14} className="animate-spin" />
          Cargando datos del documento para edición...
        </div>
      )}
      {loadingCat && !loadingEdit && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <IconLoader size={14} className="animate-spin" />
          Cargando catálogos del formulario...
        </div>
      )}

      {isPedidoLocked && (
        <div className="flex items-center gap-3 text-xs text-amber-800 mb-4 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
          <IconFileImport size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Pedido importado:</strong> el campo cliente está bloqueado. Puedes editar cantidades (respetando el saldo disponible) y eliminar items del detalle.
            <button
              type="button"
              onClick={() => { setPedidoImportadoId(null); setClienteDocIdentId(null); updateField("pedidoventaId", null); toast.info("Bloqueo liberado"); }}
              className="ml-2 underline hover:no-underline text-amber-700 font-semibold"
            >
              Desbloquear
            </button>
          </span>
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── Columna izquierda ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Datos del documento */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <SectionTitle title="Datos del Documento" icon={IconFileInvoice} />

            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">
                Tipo Documento Comercial *
              </label>
              <select
                name="tipodoccomercialId"
                value={(formData as any).tipodoccomercialId}
                onChange={(e) => {
                  updateField("tipodoccomercialId", e.target.value);
                  updateField("serie", "");
                }}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 uppercase"
              >
                <option value="">-- Seleccione tipo de documento --</option>
                {catalogs && catalogs.tipos_documento_comercial.length > 0 ? (
                  tiposDocFiltrados.map((tipo) => (
                    <option key={tipo.key} value={tipo.key.toString()}>
                      {tipo.key} - {tipo.value}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="X028">X028 - Factura Electrónica</option>
                    <option value="X007">X007 - Boleta de Venta</option>
                    <option value="X066">X066 - Documento Interno</option>
                    <option value="X077">X077 - Boleta Especial</option>
                  </>
                )}
              </select>
              {(formData as any).tipodoccomercialId && (
                <p className="text-[10px] mt-1 ml-1 font-semibold">
                  {TIPO_SOLO_RUC.includes((formData as any).tipodoccomercialId) && (
                    <span className="text-blue-600">📋 Solo clientes con RUC</span>
                  )}
                  {TIPO_SOLO_DNI.includes((formData as any).tipodoccomercialId) && (
                    <span className="text-emerald-600">🪪 Solo clientes con DNI</span>
                  )}
                  {!TIPO_SOLO_RUC.includes((formData as any).tipodoccomercialId) &&
                   !TIPO_SOLO_DNI.includes((formData as any).tipodoccomercialId) && (
                    <span className="text-slate-400">Acepta cualquier tipo de documento de identidad</span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <SearchableSelect
                label="Punto de Venta *"
                name="puntoventaId"
                options={toOpts(catalogs?.puntos_venta ?? [])}
                value={(formData as any).puntoventaId}
                onChange={(e: any) => { handleChange(e); updateField("serie", ""); }}
                disabled={loadingCat}
              />
              <TrabajadorDDL
                empresaId={EMPRESA_ID}
                value={(formData as any).trabajadorId || ""}
                onChange={(id) => updateField("trabajadorId", id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serie *</label>
                  <select
                    name="serie"
                    value={(formData as any).serie}
                    onChange={(e) => updateField("serie", e.target.value)}
                    disabled={isEditMode || seriesFiltradas.length === 0}
                    className={`w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest text-center transition-all uppercase ${
                      isEditMode || seriesFiltradas.length === 0 ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white text-slate-800"
                    }`}
                  >
                    <option value="">
                      {isEditMode ? (formData as any).serie || "—"
                        : !(formData as any).tipodoccomercialId || !(formData as any).puntoventaId ? "-- Serie --"
                        : seriesFiltradas.length === 0 ? "Sin series" : "-- Serie --"}
                    </option>
                    {!isEditMode && seriesFiltradas.map((s) => (
                      <option key={s.key} value={s.key.toString()}>{s.value}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Número</label>
                  <div className="w-full border rounded-lg p-2.5 text-sm font-mono text-center uppercase border-slate-200 bg-slate-50 text-slate-700 font-bold">
                    {isEditMode ? (formData as any).numero || "—"
                      : siguienteNumero ? siguienteNumero
                      : <span className="italic text-slate-400 text-xs">{(formData as any).serie ? "Sin datos" : "(Automático)"}</span>
                    }
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha de Emisión</label>
                <div className="h-[42px] flex items-center justify-center border border-slate-100 rounded-lg bg-slate-50 font-mono text-sm text-slate-600 font-bold">
                  {isEditMode ? (formData as any).fechaEmision || today : today}
                </div>
              </div>
            </div>
          </div>

          {/* ── Cliente ── */}
          <div className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${isPedidoLocked ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>

            {/* Header sección cliente con botón Nuevo Cliente */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 mt-2">
              <div className="flex items-center gap-2 text-slate-800">
                <IconUser className="text-blue-600" size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Cliente</h3>
              </div>
              {!isPedidoLocked && !isEditMode && (
                <button
                  type="button"
                  onClick={() => setModalNuevoCliente(true)}
                  disabled={isBusy || loading}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40"
                  title="Registrar un nuevo cliente"
                >
                  <IconUserPlus size={14} /> Nuevo Cliente
                </button>
              )}
            </div>

            {isPedidoLocked && (
              <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg mb-3 font-semibold">
                🔒 Campo bloqueado por pedido importado
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* key fuerza re-mount del DDL tras crear cliente nuevo */}
              <DropDownClient
                key={clienteDDLKey}
                tenantId={TENANT_ID}
                name="clienteId"
                label="Cliente (Destinatario) *"
                value={(formData as any).clienteId}
                onChange={handleChange}
                filtroTipoDoc={filtroTipoDoc}
                disabled={loadingEdit || isPedidoLocked}
              />
              <FormInput
                label="Orden de Compra"
                name="ordencompraNumero"
                value={(formData as any).ordencompraNumero || ""}
                onChange={handleChange}
                placeholder="Número O/C (opcional)"
                className="uppercase"
                disabled={isPedidoLocked}
              />
              <div className="md:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observaciones</label>
                  <textarea
                    name="observacion"
                    value={(formData as any).observacion || ""}
                    onChange={(e) => updateField("observacion", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none uppercase disabled:bg-slate-50 disabled:text-slate-400"
                    rows={2}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Detalles ── */}
          <div className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${isPedidoLocked ? "border-amber-200" : "border-slate-200"}`}>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
              <div className="flex items-center gap-2 text-slate-800">
                <IconReceipt className="text-blue-600" size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Detalles del Documento</h3>
              </div>
              {isPedidoLocked && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-100">
                  Importado desde pedido · cantidades editables
                </span>
              )}
            </div>

            {!isPedidoLocked && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-3">Agregar nuevo item</p>
                <div className="grid grid-cols-12 gap-3 mb-3">
                  <div className="col-span-12 md:col-span-6">
                    <SearchableSelect
                      label="Producto *"
                      name="bienId"
                      options={toOpts(catalogs?.bienes ?? [])}
                      value={(nuevoDetalle as any).bienId}
                      onChange={(e: any) => {
                        const bienId = e.target.value;
                        const di     = getBienDetraccionInfo(bienId);
                        setNuevoDetalle((prev) => ({ ...(prev as any), bienId, presentacionId: "", key: di.key, detraccionPorcentaje: di.detraccionPorcentaje, afectoInafecto: di.afectoInafecto }));
                      }}
                      disabled={loadingCat}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <SearchableSelect
                      label="Presentación *"
                      name="presentacionId"
                      options={toOpts(presentacionesActuales)}
                      value={(nuevoDetalle as any).presentacionId}
                      onChange={(e: any) => {
                        const presentacionId = e.target.value;
                        const monedaId = (formData as any).monedaId ?? "001";
                        const det = listaPrecioDetalles.find(
                          (d) => d.presentacionId === presentacionId
                        );
                        let precio = 0;
                        if (det) {
                          if (monedaId === "002") precio = det.precio_nuevo_minimo_dol ?? 0;
                          else if (monedaId === "003") precio = det.precio_nuevo_minimo_eur ?? 0;
                          else precio = det.precio_nuevo_minimo ?? 0;
                        }
                        setNuevoDetalle((prev) => ({ ...(prev as any), presentacionId, ...(precio > 0 ? { precio } : {}) }));
                      }}
                      disabled={loadingCat || !(nuevoDetalle as any).bienId || presentacionesActuales.length === 0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <FormInput
                      label="Cantidad *" type="number" min={0.01} step="0.01"
                      value={(nuevoDetalle as any).cantidad}
                      onChange={(e: any) => setNuevoDetalle((prev) => ({ ...(prev as any), cantidad: parseFloat(e.target.value) || 0 }))}
                      className="text-center font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">Conversión</label>
                    <div className="h-[42px] flex items-center justify-center border border-slate-100 rounded-lg bg-slate-50 font-mono text-sm text-slate-600">
                      {(nuevoDetalle as any).bienId && (nuevoDetalle as any).presentacionId
                        ? ((nuevoDetalle as any).cantidad * getPresentacionFactor((nuevoDetalle as any).bienId, (nuevoDetalle as any).presentacionId)).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <FormInput
                      label={`Precio (${monedaLabel}) *`} type="number" min={0} step="0.01"
                      value={(nuevoDetalle as any).precio}
                      onChange={(e: any) => setNuevoDetalle((prev) => ({ ...(prev as any), precio: parseFloat(e.target.value) || 0 }))}
                      className="text-right font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <FormInput
                      label="Descuento" type="number" min={0} step="0.01"
                      value={(nuevoDetalle as any).descuentoProducto || 0}
                      onChange={(e: any) => setNuevoDetalle((prev) => ({ ...(prev as any), descuentoProducto: parseFloat(e.target.value) || 0 }))}
                      className="text-right font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">Importe est.</label>
                    <div className="h-[42px] flex items-center justify-end px-3 border border-slate-100 rounded-lg bg-slate-50 font-mono text-sm font-bold text-slate-700">
                      {formatMoney(Math.max(0, (nuevoDetalle as any).cantidad * (nuevoDetalle as any).precio - ((nuevoDetalle as any).descuentoProducto || 0)))}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleAgregarDetalle}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                  >
                    <IconPlus size={16} /> Agregar item
                  </button>
                </div>
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
                  {(detalles as any[]).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200">
                        No hay items. Seleccione un producto y agréguelo con el formulario de arriba.
                      </td>
                    </tr>
                  ) : (
                    (detalles as any[]).map((det: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono font-bold">{det.item}</td>
                        <td className="p-3 font-mono text-slate-500 text-[10px] uppercase">{det.bienId}</td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block leading-tight uppercase">{getBienNombre(det.bienId)}</span>
                          {det.key && det.key !== "000" && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded uppercase">
                              Det. {det.key} {det.detraccionPorcentaje}%
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {isPedidoLocked ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min={1}
                                max={det.saldoCantidad ?? det.cantidad}
                                step="1"
                                value={det.cantidad}
                                onChange={(e) => handleCantidadChange(idx, parseInt(e.target.value) || 0)}
                                className="w-20 border border-slate-300 rounded px-2 py-1 text-center text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {det.saldoCantidad != null && (
                                <span className="text-[9px] text-slate-400">máx: {det.saldoCantidad}</span>
                              )}
                            </div>
                          ) : (
                            det.cantidad.toFixed(2)
                          )}
                        </td>
                        <td className="p-3 text-slate-600 text-[10px] uppercase">{getPresentacionNombre(det.bienId, det.presentacionId)}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{(det.conversionTotal ?? det.cantidad).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{monedaLabel} {det.precio.toFixed(4)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-800">{monedaLabel} {(det.importe || 0).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <input type="checkbox" checked={det.afectoInafecto ?? true} readOnly className="w-3.5 h-3.5 accent-blue-600 cursor-default" />
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleEliminarDetalle(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <IconTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 self-start sticky top-6">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <SectionTitle title="Condiciones de Pago" icon={IconCalendar} />
            <div className="space-y-4">

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Moneda *</label>
                <select name="monedaId" value={(formData as any).monedaId} onChange={handleChange}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase">
                  {catalogs?.monedas && catalogs.monedas.length > 0
                    ? catalogs.monedas.map((m) => <option key={m.key} value={m.key.toString()}>{m.key} - {m.value}</option>)
                    : (<><option value="001">001 - SOLES</option><option value="002">002 - DÓLARES</option><option value="003">003 - EUROS</option></>)
                  }
                </select>
              </div>

              <FormInput label="Tipo de Cambio" type="number" step="0.001" min={0} name="tipoCambio"
                value={(formData as any).tipoCambio ?? 1} onChange={handleChange} className="font-mono" />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condición de Pago *</label>
                <select value={(formData as any).condicionPago ?? ""} onChange={(e) => { updateField("condicionPago", e.target.value); updateField("tipopagoId", ""); updateField("tipoopegratuitaId", "00"); }}
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
                <select value={(formData as any).tipopagoId ?? ""} onChange={(e) => updateField("tipopagoId", e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase">
                  <option value="">Seleccione...</option>
                  {formasPago.map((fp: any) => (
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
                  <select
                    value={(formData as any).tipoopegratuitaId ?? "00"}
                    onChange={(e) => updateField("tipoopegratuitaId", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                  >
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
                  <FormInput label="Fecha Vencimiento *" type="date" name="fechaVencimiento"
                    value={(formData as any).fechaVencimiento || ""} onChange={handleChange} />
                </div>
              )}

              {!isEditMode && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="chk-guia" className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">
                      <IconTruck size={14} className={guiaActiva ? "text-indigo-600" : "text-slate-400"} />
                      Guía de Remisión
                    </label>
                    <input id="chk-guia" type="checkbox" checked={guiaActiva} className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      onChange={(e) => { const c = e.target.checked; setGuiaActiva(c); if (c) router.push("/dashboard/ventas/crear/d_guia_remision"); }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-6 py-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <IconCurrencyDollar size={18} /> Resumen
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Gravado (Base)</span>
                <span className="font-mono font-bold text-slate-700">{monedaLabel} {formatMoney(totales.valorventaAfecto)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Inafecto</span>
                <span className="font-mono font-bold text-slate-700">{monedaLabel} {formatMoney(totales.valorventaInafecto)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">IGV (18%)</span>
                <span className="font-mono font-bold text-slate-700">{monedaLabel} {formatMoney(totales.igv)}</span>
              </div>
              <div className="border-t border-slate-200 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-slate-800 font-bold text-base">TOTAL</span>
                <span className="font-mono font-bold text-xl text-blue-700">{monedaLabel} {formatMoney(totales.total)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mt-4 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Items en el documento</span>
                <span className="text-2xl font-bold text-slate-700">{(detalles as any[]).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">
            <p className="font-bold mb-1">Nota:</p>
            <p>Los precios incluyen IGV. El sistema calculará automáticamente el valor de venta (base) y el IGV al 18% para items afectos.</p>
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {modalImportar && (
        <ImportarPedidoModal
          empresaId={EMPRESA_ID}
          onImportar={handleImportarPedido}
          onClose={() => setModalImportar(false)}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export con Suspense
// ─────────────────────────────────────────────────────────────────────────────

export default function CrearDocumentoVentaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Cargando formulario...</span>
          </div>
        </div>
      }
    >
      <CrearDocumentoVentaContent />
    </Suspense>
  );
}