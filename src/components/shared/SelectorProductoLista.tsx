"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

import listaPreciosService from "@/services/listaprecioService";
import { productoService }  from "@/services/productoService";

import type { ListaPrecio, ListaPrecioDetalle } from "@/types/listaprecio.types";
import type { FormDropdownsDocumentoVenta, KeyValueOption } from "@/types/Documentoventa.types";

import SearchableSelect from "@/components/forms/SearchableSelect";
import StockDisponible  from "@/components/shared/StockDisponible";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toOpts(items: KeyValueOption[]) {
  return items.map((i) => ({ key: String(i.key), value: i.value }));
}

// ─── tipos ────────────────────────────────────────────────────────────────────

export interface PrecioLimites {
  min: number;
  max: number;
}

export interface SelectorProductoListaProps {
  empresaId:   string;
  catalogs:    FormDropdownsDocumentoVenta | null;
  monedaId:    string;

  /** Valores controlados del ítem en curso */
  bienId:         string;
  presentacionId: string;

  disabled?: boolean;

  /** Callbacks */
  onBienChange:         (bienId: string) => void;
  onPresentacionChange: (
    presentacionId: string,
    precio:         number,
    limites:        PrecioLimites | null
  ) => void;
  /** Se dispara al cambiar la lista; el padre usa el id para el submit */
  onListaChange: (listaId: string) => void;
}

// ─── componente ───────────────────────────────────────────────────────────────

export default function SelectorProductoLista({
  empresaId,
  catalogs,
  monedaId,
  bienId,
  presentacionId,
  disabled = false,
  onBienChange,
  onPresentacionChange,
  onListaChange,
}: SelectorProductoListaProps) {

  const [listasPrecios,       setListasPrecios]       = useState<ListaPrecio[]>([]);
  const [selectedListaId,     setSelectedListaId]     = useState<string>("");
  const [listaPrecioDetalles, setListaPrecioDetalles] = useState<ListaPrecioDetalle[]>([]);
  const [productosFallback,   setProductosFallback]   = useState<KeyValueOption[]>([]);
  const [showStock,           setShowStock]           = useState(false);

  // ── 1. Cargar listas disponibles de la empresa ──────────────────────────────
  useEffect(() => {
    listaPreciosService
      .getByEmpresa(empresaId, 1, 100)
      .then((res) => {
        const disponibles = res.data.filter(
          (lp) =>
            (lp.estado_listprec ?? lp.estado?.descripcion ?? "").toLowerCase() ===
            "disponible"
        );
        setListasPrecios(disponibles);
        if (disponibles.length > 0) {
          setSelectedListaId(disponibles[0].listaprecioId);
        }
      })
      .catch(() => {});
  }, [empresaId]);

  // ── 2. Al cambiar lista → recargar detalles y fallback si vacío ────────────
  useEffect(() => {
    if (!selectedListaId) return;

    setProductosFallback([]);
    onListaChange(selectedListaId);

    listaPreciosService
      .getById(selectedListaId)
      .then(async (lp) => {
        const detalles = lp.detalles ?? [];
        setListaPrecioDetalles(detalles);

        if (detalles.length === 0) {
          try {
            const res   = await productoService.getByEmpresa(empresaId, 1, 1000);
            const items = (res.data ?? []) as any[];
            setProductosFallback(
              items.map((p) => ({ key: p.bienId, value: p.descripcion }))
            );
          } catch {
            // fallback silencioso
          }
        }
      })
      .catch(() => toast.error("No se pudieron cargar los productos de la lista"));
  }, [selectedListaId, empresaId]);

  // ── 3. Bienes disponibles ───────────────────────────────────────────────────
  const bienesDisponibles = useMemo<KeyValueOption[]>(() => {
    if (!catalogs?.bienes) return [];
    if (listaPrecioDetalles.length === 0) {
      return productosFallback.length > 0 ? productosFallback : catalogs.bienes;
    }
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return catalogs.bienes.filter((b) => {
      const pres = catalogs.presentaciones?.find((g) => g.bienId === b.key)?.items ?? [];
      return pres.some((p) => presIds.has(String(p.key)));
    });
  }, [catalogs, listaPrecioDetalles, productosFallback]);

  // ── 4. Presentaciones del bien seleccionado ─────────────────────────────────
  const presentacionOpts = useMemo<KeyValueOption[]>(() => {
    if (!catalogs?.presentaciones || !bienId) return [];
    const todas = catalogs.presentaciones.find((g) => g.bienId === bienId)?.items ?? [];
    if (listaPrecioDetalles.length === 0) return toOpts(todas as any);
    const presIds = new Set(listaPrecioDetalles.map((d) => d.presentacionId));
    return toOpts((todas as any).filter((p: any) => presIds.has(String(p.key))));
  }, [catalogs, bienId, listaPrecioDetalles]);

  // ── 5. Nombre del bien para StockDisponible ─────────────────────────────────
  const bienNombre = useMemo(
    () =>
      (bienesDisponibles as any[]).find((b) => String(b.key) === bienId)?.value ??
      bienId,
    [bienesDisponibles, bienId]
  );

  // ── 6. Handler cambio presentación → precio automático ─────────────────────
  const handlePresentacionChange = useCallback(
    (presId: string) => {
      const det = listaPrecioDetalles.find((d) => d.presentacionId === presId);
      let precio = 0;
      let limites: PrecioLimites | null = null;
      if (det) {
        precio  = det.precio_minimo_minorista ?? 0;
        limites = { min: det.precio_minimo_minorista ?? 0, max: det.precio_minimo_minorista ?? 0 };
      }
      onPresentacionChange(presId, precio, limites);
    },
    [listaPrecioDetalles, monedaId, onPresentacionChange]
  );

  // ── 7. Handler cambio de lista ──────────────────────────────────────────────
  const handleListaChange = (id: string) => {
    setSelectedListaId(id);
    // limpiar selección de bien/presentación en el padre
    onBienChange("");
    onPresentacionChange("", 0, null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Cabecera: DDL lista de precios + botón stock */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-blue-600 uppercase">Agregar nuevo ítem</p>
        <div className="flex items-center gap-2">
          {listasPrecios.length > 0 && (
            <select
              value={selectedListaId}
              onChange={(e) => handleListaChange(e.target.value)}
              disabled={disabled}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
            >
              {listasPrecios.map((lp) => (
                <option key={lp.listaprecioId} value={lp.listaprecioId}>
                  {lp.descripcion || lp.codigo_lista}
                </option>
              ))}
            </select>
          )}
          {bienId && (
            <button
              type="button"
              onClick={() => setShowStock(true)}
              className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Ver stock disponible
            </button>
          )}
        </div>
      </div>

      {/* Producto + Presentación */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-6">
          <SearchableSelect
            label="Producto *"
            name="bienId"
            options={toOpts(bienesDisponibles)}
            value={bienId}
            disabled={disabled}
            onChange={(e: any) => {
              onBienChange(e.target.value);
              onPresentacionChange("", 0, null);
            }}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <SearchableSelect
            label="Presentación *"
            name="presentacionId"
            options={presentacionOpts}
            value={presentacionId}
            disabled={disabled || !bienId || presentacionOpts.length === 0}
            onChange={(e: any) => handlePresentacionChange(e.target.value)}
          />
        </div>
      </div>

      {/* Modal stock */}
      {showStock && bienId && (
        <StockDisponible
          empresaId={empresaId}
          bienId={bienId}
          bienNombre={bienNombre}
          onClose={() => setShowStock(false)}
        />
      )}
    </>
  );
}
