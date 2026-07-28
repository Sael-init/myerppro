// src/app/dashboard/ventas/crear/store.tsx
"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from "react";
import type { CreateDocumentoVentaDetalleDTO } from "@/types/Documentoventa.types";

// =====================================================
// TIPOS
// =====================================================
export interface DVentaFormData {
  tipodoccomercialId:   string;
  serie:                string;
  numero:               string;
  fechaEmision:         string;
  fechaDoc:             string;
  monedaId:             string;
  tipoCambio:           number;
  clienteId:            string;
  condicionPago:        string;
  puntoventaId:         string;
  trabajadorId:         string;
  tipopagoId:           string;
  observacion:          string;
  ordencompraNumero:    string;
  detraccion:           boolean;
  detraccionPorcentaje: number;
  detraccionMonto:      number;
  cuentausuarioId:      string;
  fechaVencimiento?:    string;
  pedidoventaId:        string | null;
  tipoopegratuitaId:    string;
  clienteDireccion:     string;
  notaSalida:           boolean;
  esAnticipo:           boolean;
}

export interface GuiaFormData {
  // Datos básicos
  fechaTraslado:     string;
  almacenId:         string;   // id_almacen_inicio
  almacenDestinoId:  string;   // id_almacen_destino  ← NUEVO
  serie:             string;
  numeroManual:      boolean;
  correlativo:       string;
  puntoPartida:      string;   // punto_partida       ← NUEVO
  puntoLlegada:      string;
  motivoTrasladoId:  string;
  otroMotivoTraslado: string;  // otro_motivo_traslado ← NUEVO
  // Movilidad (se envían como IDs al backend)
  transportista:     string;   // transportistaId
  unidadTransporte:  string;   // unidadTransporteId
  conductor:         string;   // conductorId
  movilidadId:       string;   // movilidadId         ← NUEVO
  observacion:       string;
}

// =====================================================
// VALORES INICIALES
// =====================================================
export const DVENTA_INITIAL: DVentaFormData = {
  tipodoccomercialId:   "",
  serie:                "",
  numero:               "",
  fechaEmision:         "",
  fechaDoc:             "",
  monedaId:             "",
  tipoCambio:           1,
  clienteId:            "",
  condicionPago:        "",
  puntoventaId:         "",
  trabajadorId:         "",
  tipopagoId:           "",
  observacion:          "",
  ordencompraNumero:    "",
  detraccion:           false,
  detraccionPorcentaje: 0,
  detraccionMonto:      0,
  cuentausuarioId:      "",
  pedidoventaId:        null,
  tipoopegratuitaId:    "00",
  clienteDireccion:     "",
  notaSalida:           false,
  esAnticipo:           false,
};

export const GUIA_INITIAL: GuiaFormData = {
  fechaTraslado:     "",
  almacenId:         "",
  almacenDestinoId:  "",
  serie:             "",
  numeroManual:      false,
  correlativo:       "",
  puntoPartida:      "",
  puntoLlegada:      "",
  motivoTrasladoId:  "01",
  otroMotivoTraslado: "",
  transportista:     "",
  unidadTransporte:  "",
  conductor:         "",
  movilidadId:       "",
  observacion:       "",
};

// =====================================================
// HELPERS sessionStorage
// =====================================================
const SS_DVENTA      = "crear__dventa";
const SS_DETALLES    = "crear__detalles";
const SS_GUIA        = "crear__guia";
const SS_GUIA_ACTIVA = "crear__guia_activa";

function ssGet<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function ssSet(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

function ssClear(...keys: string[]) {
  keys.forEach((k) => { try { sessionStorage.removeItem(k); } catch { /* noop */ } });
}

// Fecha local yyyy-mm-dd (NO usar toISOString: convierte a UTC y en zonas horarias
// negativas -América- puede adelantar el día, invalidando por error fechas de "hoy").
function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// =====================================================
// CONTEXTO
// =====================================================
interface CrearStore {
  dVentaForm:    DVentaFormData;
  setDVentaForm: React.Dispatch<React.SetStateAction<DVentaFormData>>;
  updateDVenta:  <K extends keyof DVentaFormData>(field: K, value: DVentaFormData[K]) => void;
  detalles:      CreateDocumentoVentaDetalleDTO[];
  setDetalles:   React.Dispatch<React.SetStateAction<CreateDocumentoVentaDetalleDTO[]>>;
  guiaForm:      GuiaFormData;
  setGuiaForm:   React.Dispatch<React.SetStateAction<GuiaFormData>>;
  updateGuia:    <K extends keyof GuiaFormData>(field: K, value: GuiaFormData[K]) => void;
  guiaActiva:    boolean;
  setGuiaActiva: (val: boolean) => void;
  resetAll:      () => void;
}

const CrearContext = createContext<CrearStore | null>(null);

export function CrearProvider({ children }: { children: ReactNode }) {
  const [dVentaForm, setDVentaForm] = useState<DVentaFormData>(DVENTA_INITIAL);
  const [detalles,   setDetalles]   = useState<CreateDocumentoVentaDetalleDTO[]>([]);
  const [guiaForm,   setGuiaForm]   = useState<GuiaFormData>(GUIA_INITIAL);
  const [guiaActiva, _setGuiaActiva] = useState<boolean>(false);

  // ── Restore desde sessionStorage ─────────────────
  useEffect(() => {
    const today = getTodayLocal();

    const savedDVenta = ssGet<DVentaFormData | null>(SS_DVENTA, null);
    if (savedDVenta) {
      setDVentaForm(savedDVenta);
    } else {
      setDVentaForm((prev) => ({ ...prev, fechaEmision: today, fechaDoc: today }));
    }

    const savedDetalles = ssGet<CreateDocumentoVentaDetalleDTO[] | null>(SS_DETALLES, null);
    if (savedDetalles) setDetalles(savedDetalles);

    const savedGuia = ssGet<GuiaFormData | null>(SS_GUIA, null);
    if (savedGuia) {
      // Merge con GUIA_INITIAL para incorporar campos nuevos si vienen de sesiones antiguas.
      // fechaTraslado también se reconstituye si vino vacía de una sesión vieja/incompleta.
      setGuiaForm({ ...GUIA_INITIAL, ...savedGuia, fechaTraslado: savedGuia.fechaTraslado || today });
    } else {
      setGuiaForm((prev) => ({ ...prev, fechaTraslado: today }));
    }

    _setGuiaActiva(ssGet<boolean>(SS_GUIA_ACTIVA, false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sincronizar → sessionStorage ─────────────────
  useEffect(() => { ssSet(SS_DVENTA,      dVentaForm);  }, [dVentaForm]);
  useEffect(() => { ssSet(SS_DETALLES,    detalles);    }, [detalles]);
  useEffect(() => { ssSet(SS_GUIA,        guiaForm);    }, [guiaForm]);
  useEffect(() => { ssSet(SS_GUIA_ACTIVA, guiaActiva);  }, [guiaActiva]);

  // ── Updaters ──────────────────────────────────────
  const updateDVenta = useCallback(
    <K extends keyof DVentaFormData>(field: K, value: DVentaFormData[K]) =>
      setDVentaForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  const updateGuia = useCallback(
    <K extends keyof GuiaFormData>(field: K, value: GuiaFormData[K]) =>
      setGuiaForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  const setGuiaActiva = useCallback((val: boolean) => _setGuiaActiva(val), []);

  const resetAll = useCallback(() => {
    const today = getTodayLocal();
    setDVentaForm({ ...DVENTA_INITIAL, fechaEmision: today, fechaDoc: today });
    setDetalles([]);
    setGuiaForm({ ...GUIA_INITIAL, fechaTraslado: today });
    _setGuiaActiva(false);
    ssClear(SS_DVENTA, SS_DETALLES, SS_GUIA, SS_GUIA_ACTIVA);
  }, []);

  return (
    <CrearContext.Provider value={{
      dVentaForm, setDVentaForm, updateDVenta,
      detalles,   setDetalles,
      guiaForm,   setGuiaForm,  updateGuia,
      guiaActiva, setGuiaActiva,
      resetAll,
    }}>
      {children}
    </CrearContext.Provider>
  );
}

export function useCrearStore() {
  const ctx = useContext(CrearContext);
  if (!ctx) throw new Error("useCrearStore must be used inside <CrearProvider>");
  return ctx;
}