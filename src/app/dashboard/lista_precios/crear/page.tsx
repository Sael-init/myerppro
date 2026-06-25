"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { utils as xlsxUtils, writeFile as xlsxWriteFile, read as xlsxRead } from "xlsx";

import listaPreciosService from "@/services/listaprecioService";
import { presentacionService } from "@/services/presentacionService";
import { productoService } from "@/services/productoService";
import monedaService from "@/services/monedaService";
import type { Moneda } from "@/types/moneda.types";

import type { TipoListaPrecio, ListaPrecioDetalleDTO } from "@/types/listaprecio.types";
import type { Producto } from "@/types/producto.types";

import DateInput from "@/components/forms/DateInput";

import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader,
  IconPlus,
  IconTrash,
  IconTag,
  IconListDetails,
  IconSearch,
  IconX,
  IconChevronDown,
  IconPencil,
  IconEraser,
  IconDownload,
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";

const EMPRESA_ID = "005";

// ── Helpers de UI ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
    <div className="w-1 h-5 bg-blue-600 rounded" />
    <span className="text-blue-600">{icon}</span>
    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
  </div>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex gap-1">
    {children}
    {required && <span className="text-red-500">*</span>}
  </label>
);

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white";

// ── Fila de detalle en tabla ──────────────────────────────────────────────────
interface DetalleRow extends ListaPrecioDetalleDTO {
  _bienId?:    string;
  _bienLabel?: string;
  _presLabel?: string;
}

const emptyNuevo = () => ({
  bienId:                    "",
  _bienLabel:                "",
  presentacionId:            "",
  costoValorizado:           "",
  utilidad:                  "",
  cantidad_minorista:        "",
  precio_minimo_minorista:   "",
  cantidad_mayorista:        "",
  precio_minimo_mayorista:   "",
  cantidad_distribuidor:     "",
  precio_minimo_distribuidor:"",
});

type NuevoRow = ReturnType<typeof emptyNuevo>;

const toNum = (v: string) => (v !== "" ? Number(v) : undefined);

// ── Búsqueda de producto (dropdown con portal) ────────────────────────────────
function BienDDL({
  value,
  onChange,
}: {
  value: string;
  onChange: (bienId: string, label: string) => void;
}) {
  const [open,          setOpen]          = useState(false);
  const [query,         setQuery]         = useState("");
  const [items,         setItems]         = useState<Producto[]>([]);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [selected,      setSelected]      = useState<Producto | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ visibility: "hidden" });
  const [mounted,       setMounted]       = useState(false);

  const debounceRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef   = React.useRef<HTMLDivElement>(null);
  const dropdownRef  = React.useRef<HTMLDivElement>(null);
  const inputRef     = React.useRef<HTMLInputElement>(null);
  const listRef      = React.useRef<HTMLUListElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(t) &&
        dropdownRef.current  && !dropdownRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.bienId === value) return;
    productoService
      .getByEmpresa(EMPRESA_ID, 1, 1, value)
      .then((res) => {
        const found = (res.data ?? [])[0] as Producto | undefined;
        if (found) setSelected(found);
      })
      .catch(() => {});
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position:   "fixed",
      top:        rect.bottom + 4,
      left:       rect.left,
      width:      Math.max(rect.width, 360),
      zIndex:     9999,
      visibility: "visible",
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateDropdownPosition();
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [open, updateDropdownPosition]);

  const fetchItems = useCallback(async (q: string, pg: number, replace: boolean) => {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const res  = await productoService.getByEmpresa(EMPRESA_ID, pg, 15, q || undefined);
      const data = (res.data ?? []) as Producto[];
      const meta = (res as any).meta ?? {};
      setItems((prev) => (replace ? data : [...prev, ...data]));
      setTotalPages(meta.totalPages ?? 1);
      setPage(meta.currentPage ?? pg);
    } catch {
      if (replace) { setItems([]); setTotalPages(1); setPage(1); }
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, []);

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

  const handleSelect = (p: Producto) => {
    setSelected(p);
    onChange(p.bienId, p.descripcion);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    onChange("", "");
  };

  const dropdownContent = (
    <div ref={dropdownRef} style={dropdownStyle}
      className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
        <IconSearch size={14} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="flex-1 text-xs uppercase outline-none text-slate-700 placeholder-slate-400 bg-transparent"
        />
        {loading && <IconLoader size={13} className="animate-spin text-blue-500 shrink-0" />}
      </div>
      <ul ref={listRef} onScroll={handleScroll} className="max-h-52 overflow-y-auto divide-y divide-slate-50">
        {loading && items.length === 0 ? (
          <li className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400">
            <IconLoader size={14} className="animate-spin" /> Cargando...
          </li>
        ) : items.length === 0 ? (
          <li className="py-5 text-center text-xs text-slate-400 italic">Sin resultados</li>
        ) : (
          items.map((p) => {
            const active = p.bienId === value;
            return (
              <li
                key={p.bienId}
                onClick={() => handleSelect(p)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-xs transition-colors
                  ${active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  {(p.descripcion[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate leading-tight uppercase">{p.descripcion}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{p.bienId}</p>
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
  );

  return (
    <div ref={containerRef}>
      <div
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full border rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all select-none
          ${open ? "border-blue-400 ring-2 ring-blue-500/20 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-800 truncate block leading-tight text-xs uppercase">
              {selected.descripcion}
            </span>
          </div>
        ) : (
          <span className="flex-1 text-slate-400 text-sm">Buscar producto...</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <button type="button" onClick={handleClear} className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <IconX size={12} />
            </button>
          )}
          <IconChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {mounted && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CrearListaPrecioPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const isEditing    = !!editId;

  const [saving,     setSaving]     = useState(false);
  const [loadingCat, setLoadingCat] = useState(true);

  const [tipos,       setTipos]       = useState<TipoListaPrecio[]>([]);
  const [monedas,     setMonedas]     = useState<Moneda[]>([]);
  const [showAddTipo, setShowAddTipo] = useState(false);
  const [newTipoDesc, setNewTipoDesc] = useState("");
  const [savingTipo,  setSavingTipo]  = useState(false);

  const [presDisponibles, setPresDisponibles] = useState<{ key: string; value: string; factor: number }[]>([]);
  const [loadingPres,     setLoadingPres]     = useState(false);
  const [cargarTodas,     setCargarTodas]     = useState(false);
  const [totalProductos,  setTotalProductos]  = useState<number | null>(null);

  // ── Importación Excel ───────────────────────────────────────────────────────
  const [metodoCarga,  setMetodoCarga]  = useState<"individual" | "excel">("individual");
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [importando,   setImportando]   = useState(false);
  type ImportLogEntry = { row: number; prodNombre: string; status: "ok" | "warn" | "error"; prodMatch?: string; presMatch?: string; msg?: string };
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

  const [form, setForm] = useState({
    codigo_lista:      "",
    tipolistaprecioId: "",
    descripcion:       "",
    fecha_inicio:      "",
    fecha_vencimiento: "",
    listadefault:      false,
    monedaId:          "",
  });

  const [detalles,     setDetalles]     = useState<DetalleRow[]>([]);
  const [nuevoDetalle, setNuevoDetalle] = useState<NuevoRow>(emptyNuevo());
  const [editIndex,    setEditIndex]    = useState<number | null>(null);

  // ── Carga catálogos ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingCat(true);
      try {
        const [resTipos, resMonedas, resProds, editRes] = await Promise.all([
          listaPreciosService.getTiposByEmpresa(EMPRESA_ID),
          monedaService.getAll(1, 100),
          productoService.getByEmpresa(EMPRESA_ID, 1, 1),
          editId ? listaPreciosService.getById(editId) : Promise.resolve(null),
        ]);
        setTipos(resTipos);
        setMonedas(resMonedas.data);
        setTotalProductos(resProds?.meta?.totalRecords ?? null);

        if (editId && editRes) {
          const res = editRes as any;
          setForm({
            codigo_lista:      res.codigo_lista     ?? "",
            tipolistaprecioId: res.tipolistaprecioId != null ? String(res.tipolistaprecioId) : "",
            descripcion:       res.descripcion      ?? "",
            fecha_inicio:      res.fecha_inicio      ? res.fecha_inicio.substring(0, 10)      : "",
            fecha_vencimiento: res.fecha_vencimiento ? res.fecha_vencimiento.substring(0, 10) : "",
            listadefault:      res.listadefault      ?? false,
            monedaId:          res.monedaId          ?? "",
          });
          setDetalles(
            (res.detalles ?? []).map((d: any) => ({
              presentacionId:             d.presentacionId             ?? "",
              costoValorizado:            d.costoValorizado,
              utilidad:                   d.utilidad,
              cantidad_minorista:         d.cantidad_minorista,
              precio_minimo_minorista:    d.precio_minimo_minorista,
              cantidad_mayorista:         d.cantidad_mayorista,
              precio_minimo_mayorista:    d.precio_minimo_mayorista,
              cantidad_distribuidor:      d.cantidad_distribuidor,
              precio_minimo_distribuidor: d.precio_minimo_distribuidor,
              _bienId:    d.bien?.bienId ?? d.bienId ?? "",
              _bienLabel: d.bien?.descripcion ?? "",
              _presLabel: d.presentacion?.descripcion ?? d.presentacionId ?? "",
            }))
          );
        }
      } catch (err: any) {
        toast.error(err?.message ?? "No se pudieron cargar los datos");
      } finally {
        setLoadingCat(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Presentaciones al cambiar producto ────────────────────────────────────
  useEffect(() => {
    const bienId = nuevoDetalle.bienId;
    if (!bienId) { setPresDisponibles([]); return; }
    setLoadingPres(true);
    presentacionService
      .getByBien(bienId, true)
      .then((res: any) => {
        const items: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setPresDisponibles(items.map((p: any) => ({
          key:    p.presentacionId ?? p.key,
          value:  p.descripcion    ?? p.value ?? p.presentacionId,
          factor: p.cantidad       ?? 1,
        })));
      })
      .catch(() => setPresDisponibles([]))
      .finally(() => setLoadingPres(false));
  }, [nuevoDetalle.bienId]);

  // ── Referencia de precios al seleccionar presentación ─────────────────────
  useEffect(() => {
    const { presentacionId, bienId } = nuevoDetalle;
    if (!presentacionId || !bienId) return;

    listaPreciosService
      .getAll(EMPRESA_ID, 1, 200)
      .then((res) => {
        for (const lista of res.data) {
          if (!Array.isArray(lista.detalles)) continue;
          const match = lista.detalles.find(
            (d: any) =>
              d.presentacionId === presentacionId &&
              d.bienId         === bienId         &&
              d.costoValorizado != null
          );
          if (match) {
            setNuevoDetalle((p) => ({
              ...p,
              costoValorizado: String(match.costoValorizado ?? ""),
              utilidad:        String(match.utilidad        ?? ""),
            }));
            break;
          }
        }
      })
      .catch(() => {});
  }, [nuevoDetalle.presentacionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listas derivadas ────────────────────────────────────────────────────────
  const getPresLabel = useCallback(
    (presId: string) => presDisponibles.find((p) => p.key === presId)?.value ?? presId,
    [presDisponibles]
  );

  // ── Helpers del formulario ──────────────────────────────────────────────────
  const buildRow = (): DetalleRow => ({
    presentacionId:             nuevoDetalle.presentacionId,
    costoValorizado:            toNum(nuevoDetalle.costoValorizado),
    utilidad:                   toNum(nuevoDetalle.utilidad),
    cantidad_minorista:         toNum(nuevoDetalle.cantidad_minorista),
    precio_minimo_minorista:    toNum(nuevoDetalle.precio_minimo_minorista),
    cantidad_mayorista:         toNum(nuevoDetalle.cantidad_mayorista),
    precio_minimo_mayorista:    toNum(nuevoDetalle.precio_minimo_mayorista),
    cantidad_distribuidor:      toNum(nuevoDetalle.cantidad_distribuidor),
    precio_minimo_distribuidor: toNum(nuevoDetalle.precio_minimo_distribuidor),
    _bienId:    nuevoDetalle.bienId,
    _bienLabel: nuevoDetalle._bienLabel ?? nuevoDetalle.bienId,
    _presLabel: getPresLabel(nuevoDetalle.presentacionId),
  });

  const resetForm = () => {
    setNuevoDetalle(emptyNuevo());
    setPresDisponibles([]);
    setEditIndex(null);
  };

  // ── Agregar detalle ────────────────────────────────────────────────────────
  const handleAgregarDetalle = () => {
    if (!nuevoDetalle.presentacionId) return toast.error("Seleccione la presentación");

    // ── Modo "Cargar Todas": inserta todas las presentaciones del producto ──
    if (cargarTodas) {
      const pMin = Number(nuevoDetalle.precio_minimo_minorista);
      if (!nuevoDetalle.precio_minimo_minorista || isNaN(pMin) || pMin <= 0)
        return toast.error("Ingrese el precio mínimo minorista de referencia");
      if (!nuevoDetalle.cantidad_minorista || Number(nuevoDetalle.cantidad_minorista) <= 0)
        return toast.error("Cantidad minorista debe ser mayor a 0");
      if (presDisponibles.length === 0)
        return toast.error("No hay presentaciones disponibles para este producto");

      const factorRef = presDisponibles.find((p) => p.key === nuevoDetalle.presentacionId)?.factor ?? 1;
      const pMayRef   = Number(nuevoDetalle.precio_minimo_mayorista)    || 0;
      const pDisRef   = Number(nuevoDetalle.precio_minimo_distribuidor) || 0;
      const cantMin   = Number(nuevoDetalle.cantidad_minorista)         || 1;
      const cantMay   = Number(nuevoDetalle.cantidad_mayorista)         || 0;
      const cantDis   = Number(nuevoDetalle.cantidad_distribuidor)      || 0;

      const nuevasFilas: DetalleRow[] = presDisponibles.map((pres) => {
        const f       = pres.factor ?? 1;
        // precio: escala hacia abajo cuando la presentación es más pequeña (f < factorRef)
        const escalaP = factorRef > 0 ? f / factorRef : 1;
        // cantidad: escala hacia arriba (inverso del precio) para mantener equivalencia
        const escalaQ = f > 0 ? factorRef / f : 1;
        const scaleP  = (ref: number) => ref > 0 ? Math.round(ref * escalaP * 100) / 100 : undefined;
        const scaleQ  = (ref: number) => ref > 0 ? Math.max(1, Math.round(ref * escalaQ * 100) / 100) : undefined;

        const esSeleccionada = pres.key === nuevoDetalle.presentacionId;

        if (esSeleccionada) {
          return {
            presentacionId:             pres.key,
            costoValorizado:            toNum(nuevoDetalle.costoValorizado),
            utilidad:                   toNum(nuevoDetalle.utilidad),
            cantidad_minorista:         toNum(nuevoDetalle.cantidad_minorista),
            precio_minimo_minorista:    toNum(nuevoDetalle.precio_minimo_minorista),
            cantidad_mayorista:         toNum(nuevoDetalle.cantidad_mayorista),
            precio_minimo_mayorista:    toNum(nuevoDetalle.precio_minimo_mayorista),
            cantidad_distribuidor:      toNum(nuevoDetalle.cantidad_distribuidor),
            precio_minimo_distribuidor: toNum(nuevoDetalle.precio_minimo_distribuidor),
            _bienId:    nuevoDetalle.bienId,
            _bienLabel: nuevoDetalle._bienLabel ?? nuevoDetalle.bienId,
            _presLabel: pres.value,
          };
        }

        return {
          presentacionId:             pres.key,
          costoValorizado:            toNum(nuevoDetalle.costoValorizado),
          utilidad:                   toNum(nuevoDetalle.utilidad),
          cantidad_minorista:         1,
          precio_minimo_minorista:    scaleP(pMin),
          cantidad_mayorista:         cantMay > 0 ? scaleQ(cantMay) : undefined,
          precio_minimo_mayorista:    scaleP(pMayRef),
          cantidad_distribuidor:      cantDis > 0 ? scaleQ(cantDis) : undefined,
          precio_minimo_distribuidor: scaleP(pDisRef),
          _bienId:    nuevoDetalle.bienId,
          _bienLabel: nuevoDetalle._bienLabel ?? nuevoDetalle.bienId,
          _presLabel: pres.value,
        };
      });

      setDetalles((prev) => {
        const existingIds = new Set(
          prev.filter((d) => d._bienId === nuevoDetalle.bienId).map((d) => d.presentacionId)
        );
        const updated = prev.map((d) =>
          d._bienId === nuevoDetalle.bienId
            ? nuevasFilas.find((r) => r.presentacionId === d.presentacionId) ?? d
            : d
        );
        const toAdd = nuevasFilas.filter((r) => !existingIds.has(r.presentacionId));
        return [...updated, ...toAdd];
      });

      resetForm();
      toast.success(`${nuevasFilas.length} presentacion${nuevasFilas.length !== 1 ? "es" : ""} agregada${nuevasFilas.length !== 1 ? "s" : ""}`);
      return;
    }

    // ── Modo individual ────────────────────────────────────────────────────────
    const cantMin  = Number(nuevoDetalle.cantidad_minorista);
    const cantMay  = Number(nuevoDetalle.cantidad_mayorista);
    const cantDis  = Number(nuevoDetalle.cantidad_distribuidor);
    const pMin     = Number(nuevoDetalle.precio_minimo_minorista);
    const pMay     = Number(nuevoDetalle.precio_minimo_mayorista);
    const pDis     = Number(nuevoDetalle.precio_minimo_distribuidor);

    if (!nuevoDetalle.cantidad_minorista || isNaN(cantMin) || cantMin <= 0)
      return toast.error("Cantidad minorista debe ser mayor a 0");
    if (!nuevoDetalle.precio_minimo_minorista || isNaN(pMin) || pMin <= 0)
      return toast.error("Precio mínimo minorista debe ser mayor a 0");

    const hasMay = cantMay > 0;
    if (hasMay) {
      if (cantMay <= cantMin)
        return toast.error(`Cantidad mayorista debe ser mayor que cantidad minorista (${cantMin})`);
      if (!nuevoDetalle.precio_minimo_mayorista || isNaN(pMay) || pMay <= 0)
        return toast.error("Precio mínimo mayorista debe ser mayor a 0");
    }
    const hasDis = cantDis > 0;
    if (hasDis) {
      const baseRef = hasMay ? cantMay : cantMin;
      if (cantDis <= baseRef)
        return toast.error(`Cantidad distribuidor debe ser mayor que cantidad ${hasMay ? "mayorista" : "minorista"} (${baseRef})`);
      if (!nuevoDetalle.precio_minimo_distribuidor || isNaN(pDis) || pDis <= 0)
        return toast.error("Precio mínimo distribuidor debe ser mayor a 0");
    }

    const row = buildRow();
    if (editIndex !== null) {
      setDetalles((prev) => prev.map((d, idx) => (idx === editIndex ? row : d)));
    } else {
      setDetalles((prev) => [...prev, row]);
    }
    resetForm();
  };

  const handleEditarDetalle = (i: number) => {
    const d = detalles[i];
    setNuevoDetalle({
      bienId:                     d._bienId    ?? "",
      _bienLabel:                 d._bienLabel ?? "",
      presentacionId:             d.presentacionId,
      costoValorizado:            d.costoValorizado            != null ? String(d.costoValorizado)            : "",
      utilidad:                   d.utilidad                   != null ? String(d.utilidad)                   : "",
      cantidad_minorista:         d.cantidad_minorista         != null ? String(d.cantidad_minorista)         : "",
      precio_minimo_minorista:    d.precio_minimo_minorista    != null ? String(d.precio_minimo_minorista)    : "",
      cantidad_mayorista:         d.cantidad_mayorista         != null ? String(d.cantidad_mayorista)         : "",
      precio_minimo_mayorista:    d.precio_minimo_mayorista    != null ? String(d.precio_minimo_mayorista)    : "",
      cantidad_distribuidor:      d.cantidad_distribuidor      != null ? String(d.cantidad_distribuidor)      : "",
      precio_minimo_distribuidor: d.precio_minimo_distribuidor != null ? String(d.precio_minimo_distribuidor) : "",
    });
    setEditIndex(i);
    setMetodoCarga("individual");
  };

  const handleGuardarEdicion = () => {
    if (editIndex === null) return;
    setDetalles((prev) =>
      prev.map((d, idx) =>
        idx === editIndex
          ? {
              ...d,
              cantidad_minorista:         toNum(nuevoDetalle.cantidad_minorista),
              precio_minimo_minorista:    toNum(nuevoDetalle.precio_minimo_minorista),
              cantidad_mayorista:         toNum(nuevoDetalle.cantidad_mayorista),
              precio_minimo_mayorista:    toNum(nuevoDetalle.precio_minimo_mayorista),
              cantidad_distribuidor:      toNum(nuevoDetalle.cantidad_distribuidor),
              precio_minimo_distribuidor: toNum(nuevoDetalle.precio_minimo_distribuidor),
            }
          : d
      )
    );
    resetForm();
  };

  const handleEliminarDetalle = (i: number) => {
    setDetalles((prev) => prev.filter((_, idx) => idx !== i));
    if (editIndex === i) resetForm();
  };

  // ── Helpers fuzzy-match para importación Excel ─────────────────────────────
  const normalizeStr = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  const scoreMatch = (haystack: string, needle: string): number => {
    const h = normalizeStr(haystack);
    const n = normalizeStr(needle);
    if (!n) return 0;
    if (h === n) return 100;
    if (h.startsWith(n) || n.startsWith(h)) return 75;
    if (h.includes(n) || n.includes(h)) return 50;
    const words = n.split(/\s+/).filter(Boolean);
    const matched = words.filter((w) => h.includes(w)).length;
    return words.length > 0 ? Math.round((matched / words.length) * 35) : 0;
  };

  // ── Descargar plantilla Excel ───────────────────────────────────────────────
  const descargarPlantilla = () => {
    const headers = [
      "PRODUCTO", "PRESENTACION",
      "CANT_MINORISTA", "PRECIO_MIN_MINORISTA",
      "CANT_MAYORISTA",  "PRECIO_MIN_MAYORISTA",
      "CANT_DISTRIBUIDOR","PRECIO_MIN_DISTRIBUIDOR",
    ];
    const ejemplo = ["POPCORN DULCE DIONYS", "BOLSA 20.5", 3, 8.00, 10, 7.00, 20, 6.00];
    const ws = xlsxUtils.aoa_to_sheet([headers, ejemplo]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, "Lista Precios");
    xlsxWriteFile(wb, "plantilla_lista_precios.xlsx");
  };

  // ── Procesar Excel importado ────────────────────────────────────────────────
  const procesarExcel = async (file: File) => {
    setImportando(true);
    setImportLog([]);
    try {
      const buffer = await file.arrayBuffer();
      const wb     = xlsxRead(buffer, { type: "array" });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const allRows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1 });
      const dataRows = allRows.slice(1).filter((r) => r[0] || r[1]);

      if (dataRows.length === 0) {
        toast.error("El archivo no contiene datos");
        setImportando(false);
        return;
      }

      const log: ImportLogEntry[] = [];
      const nuevos: DetalleRow[]  = [];

      for (let i = 0; i < dataRows.length; i++) {
        const [prodNombre, presNombre, cantMin, pMin, cantMay, pMay, cantDis, pDis] = dataRows[i];
        const rowNum = i + 2;
        if (!prodNombre) continue;

        let bestProd: Producto | null = null;
        try {
          const res   = await productoService.getByEmpresa(EMPRESA_ID, 1, 10, String(prodNombre));
          const lista = res.data ?? [];
          if (lista.length > 0) {
            const scored = lista
              .map((p) => ({ p, s: scoreMatch(p.descripcion, String(prodNombre)) }))
              .sort((a, b) => b.s - a.s);
            if (scored[0].s > 0) bestProd = scored[0].p;
          }
        } catch { /* silencioso */ }

        if (!bestProd) {
          log.push({ row: rowNum, prodNombre: String(prodNombre), status: "error", msg: "Producto no encontrado" });
          continue;
        }

        let bestPres: import("@/services/presentacionService").Presentacion | null = null;
        try {
          const res   = await presentacionService.getByBien(bestProd.bienId, true);
          const lista = res.data ?? [];
          if (lista.length > 0) {
            if (presNombre) {
              const scored = lista
                .map((p) => ({ p, s: scoreMatch(p.descripcion, String(presNombre)) }))
                .sort((a, b) => b.s - a.s);
              bestPres = scored[0].p;
            } else {
              bestPres = lista[0];
            }
          }
        } catch { /* silencioso */ }

        if (!bestPres) {
          log.push({ row: rowNum, prodNombre: String(prodNombre), status: "warn", prodMatch: bestProd.descripcion, msg: "Sin presentaciones activas" });
          continue;
        }

        nuevos.push({
          presentacionId:             bestPres.presentacionId!,
          cantidad_minorista:         cantMin != null && cantMin !== "" ? Number(cantMin) : undefined,
          precio_minimo_minorista:    pMin    != null && pMin    !== "" ? Number(pMin)    : undefined,
          cantidad_mayorista:         cantMay != null && cantMay !== "" ? Number(cantMay) : undefined,
          precio_minimo_mayorista:    pMay    != null && pMay    !== "" ? Number(pMay)    : undefined,
          cantidad_distribuidor:      cantDis != null && cantDis !== "" ? Number(cantDis) : undefined,
          precio_minimo_distribuidor: pDis    != null && pDis    !== "" ? Number(pDis)    : undefined,
          _bienId:    bestProd.bienId,
          _bienLabel: bestProd.descripcion,
          _presLabel: bestPres.descripcion,
        });

        log.push({ row: rowNum, prodNombre: String(prodNombre), status: "ok", prodMatch: bestProd.descripcion, presMatch: bestPres.descripcion });
      }

      setImportLog(log);
      if (nuevos.length > 0) {
        setDetalles((prev) => [...prev, ...nuevos]);
        toast.success(`${nuevos.length} fila${nuevos.length !== 1 ? "s" : ""} importada${nuevos.length !== 1 ? "s" : ""} correctamente`);
      } else {
        toast.error("No se pudo importar ningún registro");
      }
      setArchivoExcel(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al procesar el archivo");
    } finally {
      setImportando(false);
    }
  };

  // ── Crear tipo de lista ─────────────────────────────────────────────────────
  const handleCrearTipo = async () => {
    if (!newTipoDesc.trim()) return toast.error("Ingrese una descripción");
    setSavingTipo(true);
    try {
      const res = await listaPreciosService.createTipo({ descripcion: newTipoDesc.trim(), empresaId: EMPRESA_ID });
      const nuevoTipo: TipoListaPrecio = { tipolistaprecioId: res.tipolistaprecioId, descripcion: newTipoDesc.trim(), empresaId: EMPRESA_ID };
      setTipos((prev) => [...prev, nuevoTipo]);
      setForm((prev) => ({ ...prev, tipolistaprecioId: String(res.tipolistaprecioId) }));
      setNewTipoDesc("");
      setShowAddTipo(false);
      toast.success("Tipo de lista creado");
    } catch (err: any) {
      toast.error(err?.message ?? "Error al crear tipo de lista");
    } finally {
      setSavingTipo(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_lista.trim()) return toast.error("El código de lista es requerido");
    if (!form.tipolistaprecioId)    return toast.error("Seleccione el tipo de lista");
    if (detalles.length === 0)      return toast.error("Agregue al menos un producto a la lista");

    if (form.fecha_vencimiento && form.fecha_inicio) {
      if (new Date(form.fecha_vencimiento) <= new Date(form.fecha_inicio))
        return toast.error("La fecha de vencimiento debe ser mayor que la fecha de inicio");
    }

    setSaving(true);
    try {
      const detallesPayload: ListaPrecioDetalleDTO[] = detalles.map(
        ({ _bienId, _bienLabel, _presLabel, ...d }) => d
      );

      if (isEditing) {
        await listaPreciosService.update(editId!, {
          codigo_lista:      form.codigo_lista.trim(),
          tipolistaprecioId: Number(form.tipolistaprecioId),
          descripcion:       form.descripcion.trim() || undefined,
          fecha_inicio:      form.fecha_inicio      || undefined,
          fecha_vencimiento: form.fecha_vencimiento || undefined,
          listadefault:      form.listadefault,
          monedaId:          form.monedaId          || null,
          detalles:          detallesPayload,
        });
        toast.success("Lista de precios actualizada correctamente");
      } else {
        const res = await listaPreciosService.create({
          empresaId:         EMPRESA_ID,
          codigo_lista:      form.codigo_lista.trim(),
          tipolistaprecioId: Number(form.tipolistaprecioId),
          descripcion:       form.descripcion.trim() || undefined,
          fecha_inicio:      form.fecha_inicio      || undefined,
          fecha_vencimiento: form.fecha_vencimiento || undefined,
          listadefault:      form.listadefault,
          monedaId:          form.monedaId          || null,
          detalles:          detallesPayload,
        });
        toast.success(`Lista de precios creada: ${res.listaprecioId}`);
      }

      router.push("/dashboard/lista_precios");
    } catch (err: any) {
      toast.error(err?.message ?? "Error al guardar la lista de precios");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading inicial ─────────────────────────────────────────────────────────
  if (loadingCat) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-blue-600 p-12">
        <IconLoader size={28} className="animate-spin" />
        <span className="font-semibold">Cargando...</span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="p-6 animate-fade-in-up w-full">

      {/* ── Top bar ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <IconArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? "Editar Lista de Precios" : "Nueva Lista de Precios"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? `Modificando: ${editId}` : "Complete los datos y agregue productos"}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          {saving
            ? <><IconLoader size={18} className="animate-spin" /> Guardando...</>
            : <><IconDeviceFloppy size={18} /> {isEditing ? "Actualizar" : "Guardar"}</>}
        </button>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Cabecera de la lista ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader icon={<IconTag size={16} />} title="Información de la Lista" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Código de Lista</FieldLabel>
              <input
                className={inputCls}
                placeholder="Ej: LISTA-001"
                value={form.codigo_lista}
                onChange={(e) => setForm({ ...form, codigo_lista: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Tipo de Lista</FieldLabel>
              <div className="flex gap-2 items-center">
                <select
                  className={inputCls + " flex-1"}
                  value={form.tipolistaprecioId}
                  onChange={(e) => setForm({ ...form, tipolistaprecioId: e.target.value })}
                  required
                >
                  <option value="">— Seleccionar tipo —</option>
                  {tipos.map((t) => (
                    <option key={t.tipolistaprecioId} value={t.tipolistaprecioId}>
                      {t.descripcion}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowAddTipo((v) => !v); setNewTipoDesc(""); }}
                  className="shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-500 hover:text-blue-600 transition-colors"
                  title="Agregar tipo de lista"
                >
                  <IconPlus size={16} />
                </button>
              </div>

              {showAddTipo && (
                <div className="mt-1 p-3 border border-blue-200 rounded-xl bg-blue-50/60 flex flex-col gap-2">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Nuevo tipo de lista</p>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Descripción del tipo..."
                    value={newTipoDesc}
                    onChange={(e) => setNewTipoDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCrearTipo(); } if (e.key === "Escape") setShowAddTipo(false); }}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddTipo(false)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleCrearTipo}
                      disabled={savingTipo || !newTipoDesc.trim()}
                      className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
                      {savingTipo && <IconLoader size={12} className="animate-spin" />}
                      {savingTipo ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Descripción</FieldLabel>
              <input
                className={inputCls}
                placeholder="Descripción opcional"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <DateInput
              label="Fecha Inicio"
              name="fecha_inicio"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            />

            <DateInput
              label="Fecha Vencimiento"
              name="fecha_vencimiento"
              value={form.fecha_vencimiento}
              onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
            />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Moneda</FieldLabel>
              <select
                className={inputCls}
                value={form.monedaId}
                onChange={(e) => setForm({ ...form, monedaId: e.target.value })}
              >
                <option value="">— Seleccionar moneda —</option>
                {monedas.map((m) => (
                  <option key={m.monedaId} value={m.monedaId}>
                    {m.simbolomoneda} — {m.descripcion} ({m.abreviatura})
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ── Detalles ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-500 rounded" />
              <span className="text-emerald-700 text-sm font-bold uppercase tracking-wide flex items-center gap-1.5">
                <IconListDetails size={15} />
                Productos Cargados a la Lista
                {detalles.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    {detalles.length}
                  </span>
                )}
              </span>
              {totalProductos !== null && (() => {
                const cargados   = new Set(detalles.map((d) => d._bienId).filter(Boolean)).size;
                const restantes  = totalProductos - cargados;
                const porcentaje = totalProductos > 0 ? Math.round((cargados / totalProductos) * 100) : 0;
                return (
                  <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
                    <span className="text-blue-600">{cargados}</span>
                    <span>/</span>
                    <span>{totalProductos}</span>
                    <span className="text-slate-400 font-normal">productos</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      restantes === 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {restantes === 0 ? "Completo" : `${restantes} restantes`}
                    </span>
                    {porcentaje > 0 && (
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => {
                setMetodoCarga((v) => v === "excel" ? "individual" : "excel");
                setImportLog([]);
                setArchivoExcel(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                metodoCarga === "excel"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              <IconFileSpreadsheet size={14} />
              Importar Excel
            </button>
          </div>

          {/* ── Barra de inserción individual ── */}
          {metodoCarga === "individual" && (
            <div className="border-b border-slate-200">
              <div className="flex items-end gap-2 px-4 py-2 bg-white w-full">

                {/* Bien — flex-[10] */}
                <div className="flex-[10] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Producto</span>
                  <BienDDL
                    value={nuevoDetalle.bienId}
                    onChange={(bienId, label) =>
                      setNuevoDetalle((p) => ({ ...p, bienId, _bienLabel: label, presentacionId: "" }))
                    }
                  />
                </div>

                {/* Presentación — flex-[7] = 70% de producto */}
                <div className="flex-[7] min-w-0 flex flex-col gap-0.5 relative">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Presentación</span>
                  <select
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.presentacionId}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, presentacionId: e.target.value }))}
                    disabled={!nuevoDetalle.bienId || loadingPres}
                  >
                    <option value="">
                      {loadingPres ? "Cargando..." : presDisponibles.length === 0 ? "— Producto —" : "— Seleccionar —"}
                    </option>
                    {presDisponibles.map((pr) => (
                      <option key={pr.key} value={pr.key}>{pr.value}</option>
                    ))}
                  </select>
                  {loadingPres && (
                    <IconLoader size={12} className="animate-spin text-blue-400 absolute right-6 bottom-2 pointer-events-none" />
                  )}
                </div>

                {/* Separador */}
                <div className="w-px h-8 bg-slate-200 shrink-0 self-center" />

                {/* Cos — flex-[3] = 30% de producto */}
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Cos.</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    disabled
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={nuevoDetalle.costoValorizado}
                    readOnly />
                </div>

                {/* Utl — flex-[3] */}
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Utl.</span>
                  <input type="number" min="0" step="0.01" placeholder="0"
                    disabled
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={nuevoDetalle.utilidad}
                    readOnly />
                </div>

                {/* Separador */}
                <div className="w-px h-8 bg-slate-200 shrink-0 self-center" />

                {/* MIN */}
                <span className="text-[9px] font-bold text-green-600 shrink-0 pb-1.5">MIN</span>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Cant.</span>
                  <input type="number" min="0" step="1" placeholder="0"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.cantidad_minorista}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_minorista: e.target.value }))} />
                </div>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Precio</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.precio_minimo_minorista}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_minorista: e.target.value }))} />
                </div>

                {/* MAY */}
                <span className="text-[9px] font-bold text-blue-600 shrink-0 pb-1.5">MAY</span>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Cant.</span>
                  <input type="number" min="0" step="1" placeholder="0"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.cantidad_mayorista}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_mayorista: e.target.value }))} />
                </div>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Precio</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.precio_minimo_mayorista}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_mayorista: e.target.value }))} />
                </div>

                {/* DIS */}
                <span className="text-[9px] font-bold text-purple-600 shrink-0 pb-1.5">DIS</span>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Cant.</span>
                  <input type="number" min="0" step="1" placeholder="0"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.cantidad_distribuidor}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_distribuidor: e.target.value }))} />
                </div>
                <div className="flex-[3] min-w-0 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Precio</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 bg-white"
                    value={nuevoDetalle.precio_minimo_distribuidor}
                    onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_distribuidor: e.target.value }))} />
                </div>

                {/* Separador */}
                <div className="w-px h-8 bg-slate-200 shrink-0 self-center" />

                {/* Toggle Cargar Todas */}
                <button type="button" onClick={() => setCargarTodas((v) => !v)}
                  title="Insertar todas las presentaciones del producto"
                  className="shrink-0 flex flex-col items-center gap-0.5 self-end pb-0.5">
                  <span className={`text-[8px] font-bold uppercase whitespace-nowrap ${cargarTodas ? "text-emerald-600" : "text-slate-400"}`}>
                    Cargar Todas
                  </span>
                  <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${cargarTodas ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${cargarTodas ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>

                {/* Separador */}
                <div className="w-px h-8 bg-slate-200 shrink-0 self-center" />

                {/* Acciones */}
                <div className="shrink-0 self-end flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleAgregarDetalle}
                    disabled={!nuevoDetalle.presentacionId}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all whitespace-nowrap"
                  >
                    {editIndex !== null ? <><IconCheck size={13} /> Ok</> : <><IconPlus size={13} /> Agregar</>}
                  </button>
                  <button type="button" onClick={resetForm} title="Limpiar"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <IconEraser size={14} />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ── Panel Excel ── */}
          {metodoCarga === "excel" && (
            <div className="p-5 border-b border-slate-200 space-y-4">

              <div className="flex items-start justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                    <IconFileSpreadsheet size={14} /> Importar productos desde Excel
                  </p>
                  <p className="text-[11px] text-blue-600 leading-relaxed">
                    Descarga la plantilla, completa los datos y súbela. Los nombres de producto y presentación
                    se buscarán automáticamente en el catálogo usando coincidencia aproximada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <IconDownload size={14} /> Descargar Plantilla
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className={`flex-1 flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                  archivoExcel ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30"
                }`}>
                  <IconUpload size={18} className={archivoExcel ? "text-emerald-500" : "text-slate-400"} />
                  <span className={`text-xs font-semibold ${archivoExcel ? "text-emerald-700" : "text-slate-500"}`}>
                    {archivoExcel ? archivoExcel.name : "Seleccionar archivo .xlsx / .xls"}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setArchivoExcel(f);
                      setImportLog([]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!archivoExcel || importando}
                  onClick={() => archivoExcel && procesarExcel(archivoExcel)}
                  className="shrink-0 flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all"
                >
                  {importando
                    ? <><IconLoader size={14} className="animate-spin" /> Procesando...</>
                    : <><IconUpload size={14} /> Importar</>}
                </button>
              </div>

              {importLog.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Resultado de importación</span>
                    <div className="flex items-center gap-3 text-[10px] font-semibold">
                      <span className="text-emerald-600">{importLog.filter((l) => l.status === "ok").length} ok</span>
                      <span className="text-amber-500">{importLog.filter((l) => l.status === "warn").length} advertencias</span>
                      <span className="text-red-500">{importLog.filter((l) => l.status === "error").length} errores</span>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {importLog.map((entry, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-[11px] ${
                        entry.status === "ok"    ? "bg-white"    :
                        entry.status === "warn"  ? "bg-amber-50" : "bg-red-50"
                      }`}>
                        {entry.status === "ok"
                          ? <IconCheck size={13} className="text-emerald-500 shrink-0" />
                          : entry.status === "warn"
                          ? <IconAlertTriangle size={13} className="text-amber-500 shrink-0" />
                          : <IconX size={13} className="text-red-500 shrink-0" />}
                        <span className="text-slate-400 font-mono w-8 shrink-0">F{entry.row}</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">{entry.prodNombre}</span>
                        {entry.status === "ok" && (
                          <span className="text-slate-400 truncate">
                            → <span className="text-emerald-700">{entry.prodMatch}</span>
                            {entry.presMatch && <> · <span className="text-blue-600">{entry.presMatch}</span></>}
                          </span>
                        )}
                        {entry.msg && <span className={`ml-auto shrink-0 ${entry.status === "error" ? "text-red-500" : "text-amber-600"}`}>{entry.msg}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla de ítems agregados */}
          {detalles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-left" rowSpan={2}>#</th>
                    <th className="px-3 py-2.5 text-left" rowSpan={2}>Producto / Presentación</th>
                    <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Minorista (Cant/Pco)</th>
                    <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Mayorista (Cant/Pco)</th>
                    <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Distribuidor (Cant/Pco)</th>
                    <th className="px-3 py-2.5 text-center" rowSpan={2}></th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-right border-l border-slate-200">Cant.</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right border-l border-slate-200">Cant.</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right border-l border-slate-200">Cant.</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((d, i) => {
                    const fmt     = (n?: number) => n != null ? n.toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—";
                    const editing = editIndex === i;
                    const inCls   = "w-full border border-blue-300 rounded-md px-1.5 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-400 bg-white text-right";
                    return (
                      <tr key={i} className={editing ? "bg-blue-50/40 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50"}>
                        <td className="px-3 py-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800 text-xs">{d._presLabel ?? d.presentacionId}</p>
                          {d._bienLabel && <p className="text-[10px] text-slate-400">{d._bienLabel}</p>}
                        </td>

                        {/* MINORISTA */}
                        <td className="px-2 py-2 border-l border-slate-100">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.cantidad_minorista}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_minorista: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.cantidad_minorista)}</span>}
                        </td>
                        <td className="px-2 py-2">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.precio_minimo_minorista}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_minorista: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.precio_minimo_minorista)}</span>}
                        </td>

                        {/* MAYORISTA */}
                        <td className="px-2 py-2 border-l border-slate-100">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.cantidad_mayorista}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_mayorista: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.cantidad_mayorista)}</span>}
                        </td>
                        <td className="px-2 py-2">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.precio_minimo_mayorista}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_mayorista: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.precio_minimo_mayorista)}</span>}
                        </td>

                        {/* DISTRIBUIDOR */}
                        <td className="px-2 py-2 border-l border-slate-100">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.cantidad_distribuidor}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, cantidad_distribuidor: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.cantidad_distribuidor)}</span>}
                        </td>
                        <td className="px-2 py-2">
                          {editing
                            ? <input type="number" min="0" step="0.01" className={inCls}
                                value={nuevoDetalle.precio_minimo_distribuidor}
                                onChange={(e) => setNuevoDetalle((p) => ({ ...p, precio_minimo_distribuidor: e.target.value }))} />
                            : <span className="block text-right font-mono text-xs">{fmt(d.precio_minimo_distribuidor)}</span>}
                        </td>

                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={handleGuardarEdicion}
                                className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" title="Guardar">
                                <IconCheck size={15} />
                              </button>
                              <button type="button" onClick={resetForm}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Cancelar">
                                <IconX size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => handleEditarDetalle(i)}
                                className="p-1 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                                <IconPencil size={14} />
                              </button>
                              <button type="button" onClick={() => handleEliminarDetalle(i)}
                                className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                                <IconTrash size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </form>
  );
}
