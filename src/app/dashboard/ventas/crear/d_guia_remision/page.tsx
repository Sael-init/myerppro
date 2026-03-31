"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { transportistaService } from "@/services/transportistaService";
import type { Transportista } from "@/types/transportista.types";
import { unidadTransporteService } from "@/services/unidadTransporteService";
import { conductorService } from "@/services/conductorService";
import type { UnidadTransporte } from "@/types/unidadTransporte.types";
import type { Conductor } from "@/types/conductor.types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, isBefore, parseISO } from "date-fns";
import {
  IconArrowLeft,
  IconBarcode,
  IconDeviceFloppy,
  IconFileDescription,
  IconInfoCircle,
  IconLoader,
  IconMapPin,
  IconPackage,
  IconSend,
  IconTruck,
  IconAlertCircle,
} from "@tabler/icons-react";

import { useCrearStore } from "../store";
import { guiaRemisionService } from "@/services/guiaRemisionService";
import documentoVentaService from "@/services/DocumentoventaService";
import type { GuiaRemisionPayload, GuiaRemisionDetalle } from "@/types/guiaRemision.types";
import type { FormDropdownsDocumentoVenta } from "@/types/Documentoventa.types";

// ─── Constantes ───────────────────────────────────────────────────────────────
const EMPRESA_ID         = "005";
const ALMACEN_ID         = "001";
const TIPO_DOC_GUIA      = "X029";
const TIPO_MOVIMIENTO_GR = "S";
const TENANT_ID          = "1";

// ─── Componentes UI locales ───────────────────────────────────────────────────
const SectionTitle = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-2">
    <Icon className="text-indigo-600" size={20} />
    <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

const FormInput = ({ label, disabled, value, className, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
    <input
      disabled={disabled}
      value={value !== undefined && value !== null ? value : ""}
      className={`w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs
        ${disabled
          ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium"
          : "border-slate-200 bg-white"}
        ${className ?? ""}`}
      {...props}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function GuiaRemisionPage() {
  const router = useRouter();

  const [loading, setLoading]               = useState(false);
  const [catalogs, setCatalogs]             = useState<any>({});
  const [dvCatalogs, setDvCatalogs]         = useState<FormDropdownsDocumentoVenta | null>(null);
  const [docTypeOptions, setDocTypeOptions] = useState<any[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<any[]>([]);
  const [isManualCorrelativo, setIsManualCorrelativo] = useState(false);

  // Transporte
  const [unidades, setUnidades]             = useState<UnidadTransporte[]>([]);
  const [conductores, setConductores]       = useState<Conductor[]>([]);
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);

  // ── Store ────────────────────────────────────────────────────────────────────
  const {
    guiaForm: form,
    updateGuia: update,
    dVentaForm,
    detalles,
    resetAll,
  } = useCrearStore();

  const todayStr        = format(new Date(), "yyyy-MM-dd");
  const sinClienteVenta = !dVentaForm.clienteId;
  const sinDetalles     = detalles.length === 0;

  // ── Helper extractor ─────────────────────────────────────────────────────────
  const extractArray = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object") {
      const obj = data as { items?: T[]; data?: T[] };
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.data))  return obj.data;
    }
    return [];
  };

  // ── Catálogos de transporte ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [resU, resC, resT] = await Promise.allSettled([
          unidadTransporteService.getByEmpresa(EMPRESA_ID, 1, 100),
          conductorService.getByEmpresa(EMPRESA_ID, 1, 100),
          transportistaService.getByEmpresa(EMPRESA_ID, 1, 100),
        ]);
        setUnidades(
          resU.status === "fulfilled" && resU.value?.isSuccess
            ? extractArray<UnidadTransporte>(resU.value.data) : []
        );
        setConductores(
          resC.status === "fulfilled" && resC.value?.isSuccess
            ? extractArray<Conductor>(resC.value.data) : []
        );
        setTransportistas(
          resT.status === "fulfilled" && resT.value?.isSuccess
            ? extractArray<Transportista>(resT.value.data) : []
        );
      } catch {
        toast.error("No se pudieron cargar transportistas, unidades o conductores");
      }
    };
    load();
  }, []);

  // ── Catálogos de DV ──────────────────────────────────────────────────────────
  useEffect(() => {
    documentoVentaService
      .getFormDropdowns(EMPRESA_ID, TENANT_ID)
      .then(setDvCatalogs)
      .catch(() => console.warn("No se pudieron cargar catálogos de productos"));
  }, []);

  // ── Catálogos de guía ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await guiaRemisionService.getFormDropdowns(EMPRESA_ID, ALMACEN_ID);
        if (res.isSuccess) {
          const data = res.data;
          setCatalogs(data);
          const tipoDocJson   = data.tipoDocumentoJson ?? data.tipoDocumentoJSON ?? [];
          const guiaRemitente = tipoDocJson.find((x: any) => x.key === TIPO_DOC_GUIA);
          setDocTypeOptions(guiaRemitente ? [guiaRemitente] : tipoDocJson);
          if (!form.almacenId) update("almacenId", ALMACEN_ID);
        }
      } catch {
        toast.error("Error cargando catálogos de guía");
      }
    };
    load();
  }, []);

  // ── Series filtradas ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!catalogs.serieGuiaJson) return;
    const filtradas = catalogs.serieGuiaJson.filter((s: any) => s.groupkey === TIPO_DOC_GUIA);
    setFilteredSeries(filtradas);
    if (!form.serie && filtradas.length > 0) update("serie", filtradas[0].key);
  }, [catalogs.serieGuiaJson, form.serie, update]);

  // ── Correlativo automático ────────────────────────────────────────────────────
  useEffect(() => {
    if (isManualCorrelativo || !form.serie || !catalogs.correlativoJson) return;
    const searchKey = `${TIPO_DOC_GUIA} ${form.serie}`;
    const obj = catalogs.correlativoJson.find((c: any) => c.key?.trim() === searchKey.trim());
    if (obj) {
      const lastStr = String(obj.value || "");
      const lastNum = parseInt(lastStr, 10);
      if (!isNaN(lastNum)) {
        const next = (lastNum + 1).toString().padStart(lastStr.length, "0");
        if (form.correlativo !== next) update("correlativo", next);
      } else if (lastStr && form.correlativo !== lastStr) {
        update("correlativo", lastStr);
      }
    } else if (form.correlativo !== "0000001") {
      update("correlativo", "0000001");
    }
  }, [form.serie, catalogs.correlativoJson, isManualCorrelativo, form.correlativo, update]);

  // ── Reglas por motivo ─────────────────────────────────────────────────────────
  const getMotivoRules = (motivoId: string) => {
    switch (motivoId) {
      case "01": case "14": return { showDestAlmacen: false, start: "ALM_ORIG", end: "CLI",      allowManual: false };
      case "02": case "08": return { showDestAlmacen: false, start: "CLI",      end: "ALM_ORIG", allowManual: false };
      case "04":            return { showDestAlmacen: true,  start: "ALM_ORIG", end: "ALM_DEST", allowManual: false };
      case "13":            return { showDestAlmacen: false, start: "ALM_ORIG", end: "",         allowManual: true  };
      case "09": case "18": return { showDestAlmacen: false, start: "ALM_ORIG", end: "",         allowManual: false };
      default:              return { showDestAlmacen: false, start: "",         end: "",         allowManual: false };
    }
  };

  const currentRules = useMemo(
    () => getMotivoRules(form.motivoTrasladoId || ""),
    [form.motivoTrasladoId]
  );

  const shouldSendToSunat = useMemo(() => {
    const s = filteredSeries.find((s: any) => s.key === form.serie);
    return (s?.aux || "").toUpperCase() === "SI";
  }, [filteredSeries, form.serie]);

  const getAddress = (sourceType: string) => {
    if (sourceType === "ALM_ORIG")
      return catalogs.AlmacenInicioJson?.find((x: any) => x.key === form.almacenId)?.aux || "";
    if (sourceType === "ALM_DEST")
      return catalogs.AlmacenDestinoJson?.find((x: any) => x.key === form.almacenDestinoId)?.aux || "";
    if (sourceType === "CLI")
      return catalogs.clienteJson?.find((x: any) => x.key === dVentaForm.clienteId)?.aux || "";
    return "";
  };

  useEffect(() => {
    const partida = form.puntoPartida || getAddress(currentRules.start);
    const llegada = currentRules.end === "ALM_DEST"
      ? getAddress("ALM_DEST")
      : form.puntoLlegada || getAddress(currentRules.end);
    if (!form.puntoPartida && partida)                                      update("puntoPartida", partida);
    if ((!form.puntoLlegada || currentRules.end === "ALM_DEST") && llegada) update("puntoLlegada", llegada);
  }, [form.almacenId, form.almacenDestinoId, dVentaForm.clienteId, catalogs, currentRules.start, currentRules.end]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleFechaTrasladoChange = (value: string) => {
    if (isBefore(parseISO(value), parseISO(todayStr)))
      toast.warning("La fecha de traslado no puede ser menor a la fecha actual");
    update("fechaTraslado", value);
  };

  const handleMotivoChange = (value: string) => {
    update("motivoTrasladoId", value);
    if (value !== "13") update("otroMotivoTraslado", "");
    if (value !== "04") update("almacenDestinoId", "");
    if (value !== "04") update("puntoLlegada", getAddress(getMotivoRules(value).end) || "");
  };

  // ── Helpers nombres DV ────────────────────────────────────────────────────────
  const getBienNombre = useCallback(
    (bienId: string) =>
      dvCatalogs?.bienes?.find((b) => b.key?.toString() === bienId)?.value ?? bienId,
    [dvCatalogs]
  );

  const getPresentacionNombre = useCallback(
    (bienId: string, presentacionId: string) => {
      const grupo = dvCatalogs?.presentaciones?.find((g) => g.bienId === bienId);
      return grupo?.items?.find((p) => p.key?.toString() === presentacionId)?.value ?? presentacionId;
    },
    [dvCatalogs]
  );

  const monedaLabel = useMemo(() => {
    const found = dvCatalogs?.monedas?.find((m) => m.key?.toString() === dVentaForm.monedaId);
    if (!found) return "S/";
    const v = found.value.toUpperCase();
    if (v.includes("DOLAR")) return "US$";
    if (v.includes("EURO"))  return "€";
    return "S/";
  }, [dvCatalogs, dVentaForm.monedaId]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // ── Payload ───────────────────────────────────────────────────────────────────
  const detallesGuia = useMemo(
    (): GuiaRemisionDetalle[] =>
      detalles.map((det, idx) => ({
        bienId:             det.bienId,
        presentacionId:     det.presentacionId,
        item:               det.item ?? idx + 1,
        cantidad:           det.cantidad,
        conversion_total:   det.conversionTotal ?? det.cantidad,
        precio:             det.precio ?? 0,
        costo:              0,
        importe:            det.importe ?? det.cantidad * (det.precio ?? 0),
        Saldo_cantidad:     det.saldoCantidad ?? det.cantidad,
        descuento_producto: det.descuentoProducto ?? 0,
        afecto_inafecto:    det.afectoInafecto ?? true,
        observacion:        det.observacion ?? "",
        documentoId:        "",
        tabla_documento:    "",
        saldo_temporal:     det.saldoTemporal ?? det.importe ?? det.cantidad * (det.precio ?? 0),
      })),
    [detalles]
  );

  const buildPayload = (): GuiaRemisionPayload => ({
    empresaId:              EMPRESA_ID,
    tipomovimientoId:       TIPO_MOVIMIENTO_GR,
    tipodoccomercialId:     TIPO_DOC_GUIA,
    fecha_emision:          todayStr,
    fecha_doc:              todayStr,
    fecha_traslado:         form.fechaTraslado || todayStr,
    serie:                  form.serie,
    ...(isManualCorrelativo && form.correlativo ? { correlativo: form.correlativo } : {}),
    clienteId:              dVentaForm.clienteId,
    proveedorId:            undefined,
    monedaId:               dVentaForm.monedaId,
    tipo_cambio:            dVentaForm.tipoCambio ?? 1,
    trabajadorId:           dVentaForm.trabajadorId || undefined,
    puntoventaId:           dVentaForm.puntoventaId || undefined,
    cuentausuarioId:        dVentaForm.cuentausuarioId || "",
    id_almacen_inicio:      form.almacenId || "",
    id_almacen_destino:     form.almacenDestinoId || "",
    punto_partida:          form.puntoPartida || undefined,
    punto_llegada:          form.puntoLlegada || undefined,
    motivotrasladoId:       form.motivoTrasladoId,
    otro_motivo_traslado:   form.motivoTrasladoId === "13" ? form.otroMotivoTraslado || undefined : undefined,
    observacion:            form.observacion || undefined,
    movilidadId:            form.movilidadId || undefined,
    transportistaId:        form.transportista || undefined,
    unidadTransporteId:     form.unidadTransporte || undefined,
    conductorId:            form.conductor || undefined,
    incluye_igv:            true,
    estado:                 "REGISTRADO",
    estado_documento_sunat: "PENDIENTEXML",
    detalles:               detallesGuia,
  });

  const handleGuardar = async (enviarSunat: boolean) => {
    if (!form.fechaTraslado)    return toast.error("Ingrese la fecha de traslado");
    if (!form.motivoTrasladoId) return toast.error("Seleccione el motivo del traslado");
    if (!form.serie)            return toast.error("Seleccione la serie de la guía");
    if (!dVentaForm.clienteId)  return toast.error("No hay cliente en el Documento de Venta");
    if (sinDetalles)            return toast.error("No hay ítems en el Documento de Venta");
    if (!form.almacenId)        return toast.error("Seleccione el almacén de origen");
    if (form.motivoTrasladoId === "04" && !form.almacenDestinoId)
      return toast.error("Seleccione el almacén destino");
    if (form.motivoTrasladoId === "13" && !form.otroMotivoTraslado)
      return toast.error('Especifique el motivo cuando selecciona "OTROS"');

    setLoading(true);
    try {
      const payload = buildPayload();
      const resp = enviarSunat
        ? await guiaRemisionService.createAndValidate(payload)
        : await guiaRemisionService.create(payload);

      if (resp.isSuccess) {
        const data  = resp.data ?? {};
        const corr  = data.correlativo ?? "";
        const sunat = data.respuestaSunat ?? "";
        if (enviarSunat) {
          const aceptada =
            sunat.includes("102") || sunat.includes("103") ||
            sunat.toLowerCase().includes("aceptada");
          aceptada
            ? toast.success(`Guía ${corr} enviada a SUNAT · ${sunat}`)
            : toast.warning(`Guía ${corr} guardada · SUNAT: ${sunat || "Pendiente de validación"}`);
        } else {
          toast.success(`Guía de Remisión ${corr} guardada correctamente`);
        }
        resetAll();
        router.push("/dashboard/ventas");
      } else {
        toast.error(resp.message ?? "Error al guardar la Guía de Remisión");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Error crítico al guardar la Guía de Remisión");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto pb-20 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <IconArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nueva Guía de Remisión</h1>
            <p className="text-xs text-slate-500">Generada desde Documento de Venta</p>
          </div>
        </div>

        <button
          onClick={() => handleGuardar(shouldSendToSunat)}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <IconLoader size={18} className="animate-spin" />
            : shouldSendToSunat ? <IconSend size={20} />
            : <IconDeviceFloppy size={20} />}
          {shouldSendToSunat ? "Enviar SUNAT" : "Guardar"}
        </button>
      </div>

      {/* ── Alerta sin cliente ── */}
      {sinClienteVenta && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-amber-800">
          <IconAlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm">
            No hay cliente en el Documento de Venta. Vuelve a la pestaña{" "}
            <button
              onClick={() => router.push("/dashboard/ventas/crear/d_ventas")}
              className="font-bold underline underline-offset-2 hover:text-amber-900"
            >
              Documento de Venta
            </button>{" "}
            y selecciona el cliente antes de guardar la guía.
          </p>
        </div>
      )}

      {/* ── Banner ítems ── */}
      {!sinDetalles && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 mb-5 text-indigo-700 text-sm">
          <IconInfoCircle size={16} className="shrink-0" />
          <span>
            <strong>{detalles.length} ítem{detalles.length !== 1 ? "s" : ""}</strong> del Documento de Venta se incluirán en esta guía.
            {dVentaForm.clienteId && (
              <> · Cliente ID: <span className="font-mono font-bold">{dVentaForm.clienteId}</span></>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">

        {/* ══════════════════ COLUMNA PRINCIPAL ══════════════════ */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* ── Información General ── */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <IconBarcode size={120} />
            </div>
            <SectionTitle title="Información General" icon={IconFileDescription} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo documento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Documento</label>
                <select value={TIPO_DOC_GUIA} disabled
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-slate-50 font-bold text-slate-700">
                  {docTypeOptions.length === 0 && <option value="">Cargando...</option>}
                  {docTypeOptions.map((t: any) => (
                    <option key={t.key} value={t.key}>{t.value}</option>
                  ))}
                </select>
              </div>

              {/* Serie + Correlativo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serie</label>
                  <select
                    value={form.serie}
                    onChange={(e) => update("serie", e.target.value)}
                    disabled={filteredSeries.length === 0}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50"
                  >
                    {filteredSeries.length === 0 && <option value="">-</option>}
                    {filteredSeries.map((s: any) => (
                      <option key={s.key} value={s.key}>{s.value}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex justify-between">
                    Correlativo
                    <div className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isManualCorrelativo}
                        onChange={(e) => {
                          setIsManualCorrelativo(e.target.checked);
                          if (!e.target.checked) update("correlativo", "");
                        }}
                        className="w-3 h-3 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-[9px] text-indigo-600 font-bold select-none">MANUAL</span>
                    </div>
                  </label>
                  <input
                    value={form.correlativo || ""}
                    onChange={(e) => isManualCorrelativo && update("correlativo", e.target.value)}
                    disabled={!isManualCorrelativo}
                    placeholder={isManualCorrelativo ? "Escriba..." : "Automático"}
                    className={`w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-wider
                      ${isManualCorrelativo
                        ? "bg-white border-indigo-300"
                        : "bg-slate-50 border-slate-200 text-slate-500"}`}
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Fecha Documento" type="date" value={todayStr} disabled />
                <FormInput
                  label="Fecha Traslado"
                  type="date"
                  value={form.fechaTraslado || todayStr}
                  onChange={(e: any) => handleFechaTrasladoChange(e.target.value)}
                  min={todayStr}
                />
              </div>
            </div>
          </div>

          {/* ── Datos del Traslado ── */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <SectionTitle title="Datos del Traslado" icon={IconMapPin} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Motivo */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Motivo de Traslado</label>
                <select
                  value={form.motivoTrasladoId}
                  onChange={(e) => handleMotivoChange(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seleccione...</option>
                  {(Array.isArray(catalogs.motivoTrasladoJson)
                    ? catalogs.motivoTrasladoJson
                    : Array.isArray(catalogs.motivoTasladoJson)
                    ? catalogs.motivoTasladoJson
                    : [])
                    .filter((m: any) => m && (m.key || m.aux || m.value))
                    .map((m: any) => (
                      <option key={m.key || m.aux} value={m.key || m.aux}>
                        {m.value || m.descripcion || m.key}
                      </option>
                    ))}
                </select>
              </div>

              {currentRules.allowManual && (
                <div className="md:col-span-2">
                  <FormInput
                    label="Especifique el Motivo"
                    value={form.otroMotivoTraslado}
                    onChange={(e: any) => update("otroMotivoTraslado", e.target.value)}
                  />
                </div>
              )}

              {/* Almacén origen */}
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Almacén Origen</label>
                  <select
                    value={form.almacenId}
                    onChange={(e) => update("almacenId", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    {(catalogs.AlmacenInicioJson || []).map((x: any) => (
                      <option key={x.key} value={x.key}>{x.value}</option>
                    ))}
                  </select>
                </div>
                <FormInput
                  label="Dirección de Partida"
                  value={form.puntoPartida}
                  onChange={(e: any) => update("puntoPartida", e.target.value)}
                />
              </div>

              {/* Almacén destino */}
              <div className="space-y-3">
                {currentRules.showDestAlmacen ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Almacén Destino</label>
                    <select
                      value={form.almacenDestinoId}
                      onChange={(e) => {
                        update("almacenDestinoId", e.target.value);
                        const addr = catalogs.AlmacenDestinoJson?.find(
                          (x: any) => x.key === e.target.value
                        )?.aux || "";
                        update("puntoLlegada", addr);
                      }}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Seleccione...</option>
                      {(catalogs.AlmacenDestinoJson || [])
                        .filter((x: any) => x.key !== form.almacenId)
                        .map((x: any) => (
                          <option key={x.key} value={x.key}>{x.value}</option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="h-[62px] flex items-end pb-2">
                    <span className="text-xs text-slate-400 italic">
                      Destino según cliente del documento de venta
                    </span>
                  </div>
                )}
                <FormInput
                  label="Dirección de Llegada"
                  value={form.puntoLlegada}
                  onChange={(e: any) => update("puntoLlegada", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Bienes a Transportar ── */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
              <div className="flex items-center gap-2 text-slate-800">
                <IconPackage className="text-indigo-600" size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Bienes a Transportar</h3>
                {!sinDetalles && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-2">
                    {detalles.length} ítem{detalles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">Item</th>
                    <th className="p-3 w-24">Código</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3 text-center w-20">Cant.</th>
                    <th className="p-3 w-36">Presentación</th>
                    <th className="p-3 text-center w-24">Conversión</th>
                    <th className="p-3 text-right w-28">Precio</th>
                    <th className="p-3 text-right w-28">Importe</th>
                    <th className="p-3 text-center w-16">Afecto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sinDetalles ? (
                    <tr>
                      <td colSpan={9}
                        className="p-8 text-center text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200">
                        No hay ítems heredados del documento de venta.
                      </td>
                    </tr>
                  ) : detalles.map((det, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono font-bold">{det.item ?? idx + 1}</td>
                      <td className="p-3 font-mono text-slate-500 text-[10px]">{det.bienId}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block leading-tight">
                          {getBienNombre(det.bienId)}
                        </span>
                        {det.key && det.key !== "000" && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">
                            Det. {det.key} {det.detraccionPorcentaje}%
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">{det.cantidad.toFixed(2)}</td>
                      <td className="p-3 text-slate-600 text-[10px]">
                        {getPresentacionNombre(det.bienId, det.presentacionId)}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {(det.conversionTotal ?? det.cantidad).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {monedaLabel} {(det.precio ?? 0).toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">
                        {monedaLabel} {formatMoney(det.importe ?? det.cantidad * (det.precio ?? 0))}
                      </td>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={det.afectoInafecto ?? true} readOnly
                          className="w-3.5 h-3.5 accent-indigo-600 cursor-default" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══════════════════ COLUMNA LATERAL ══════════════════ */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 space-y-6">

            {/* — Transporte — */}
            <div>
              <SectionTitle title="Transporte" icon={IconTruck} />
              <div className="space-y-4">

                {/* Transportista */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Transportista</label>
                  <select
                    value={form.transportista || ""}
                    onChange={(e) => update("transportista", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    {transportistas.map((t) => (
                      <option key={t.transportistaId} value={t.transportistaId}>
                        {t.descripcion} – {t.numero_doc}
                      </option>
                    ))}
                  </select>
                  {form.transportista && (
                    <p className="text-[11px] text-slate-500 italic ml-1">
                      Dirección:{" "}
                      {transportistas.find((t) => t.transportistaId === form.transportista)?.direccion || "No registrada"}
                    </p>
                  )}
                </div>

                {/* Unidad de Transporte */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unidad de Transporte</label>
                  <select
                    value={form.unidadTransporte || ""}
                    onChange={(e) => update("unidadTransporte", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    {unidades.map((u) => (
                      <option key={u.unidadtransporteId} value={u.unidadtransporteId}>
                        {u.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conductor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Conductor</label>
                  <select
                    value={form.conductor || ""}
                    onChange={(e) => update("conductor", e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    {conductores.map((c) => (
                      <option key={c.conductortransporteId} value={c.conductortransporteId}>
                        {c.nro_documento} – {c.nombres} {c.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* — Observaciones — */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                  Observaciones Generales
                </label>
                <textarea
                  value={form.observacion || ""}
                  onChange={(e) => update("observacion", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all resize-none"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            {/* — Datos heredados (solo lectura) — */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-[10px] text-indigo-800 leading-relaxed">
              <p className="font-bold mb-1">Datos heredados del Documento de Venta</p>
              <div className="space-y-1.5">
                {[
                  { label: "Cliente ID",     value: dVentaForm.clienteId       },
                  { label: "Moneda",         value: dVentaForm.monedaId        },
                  { label: "Punto de Venta", value: dVentaForm.puntoventaId    },
                  { label: "Cuenta Usuario", value: dVentaForm.cuentausuarioId },
                ]
                  .filter((x) => x.value)
                  .map((x) => (
                    <div key={x.label} className="flex justify-between gap-2">
                      <span>{x.label}</span>
                      <span className="font-mono font-bold text-right">{x.value}</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}