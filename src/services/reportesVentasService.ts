// src/services/reportesVentasService.ts
import apiClient from '@/api/apiCliente';

const BASE = '/ReportesVentas';

type Params = Record<string, string | number>;

class ReportesVentasService {
    private async fetch(endpoint: string, params: Params): Promise<any[]> {
        const { data } = await apiClient.get(`${BASE}/${endpoint}`, { params });
        return Array.isArray(data) ? data : (data?.data ?? data?.value?.data ?? []);
    }

    private withOptional(base: Params, puntoventaId?: string, sedeId?: string): Params {
        const p = { ...base };
        if (puntoventaId?.trim()) p.puntoventaId = puntoventaId.trim();
        if (sedeId?.trim()) p.sedeId = sedeId.trim();
        return p;
    }

    // ── Ventas Administrativo (4 combinaciones) ────────────────────────────────

    async getVentasGeneral(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ventas-general', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getVentasGeneralDetallado(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ventas-general-detallado', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getVentasPendientesDespacho(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ventas-pendientes-despacho', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getVentasPendientesDespachoDetallado(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ventas-pendientes-despacho-detallado', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    // ── Ventas Contable ────────────────────────────────────────────────────────

    async getVentasContable(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ventas-contable', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    // ── NC/ND (4 combinaciones) ────────────────────────────────────────────────

    async getNcNdGeneral(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ncnd-general', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getNcNdGeneralDetallado(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ncnd-general-detallado', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getNcNdPendientesDespacho(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ncnd-pendientes-despacho', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    async getNcNdPendientesDespachoDetallado(e: string, fi: string, ff: string, pv?: string, s?: string) {
        return this.fetch('ncnd-pendientes-despacho-detallado', this.withOptional({ empresaId: e, fechaInicial: fi, fechaFinal: ff }, pv, s));
    }

    // ── Comprobantes Gratuitos ─────────────────────────────────────────────────

    async getComprobantesGratuitos(e: string, fi: string, ff: string) {
        return this.fetch('comprobantes-gratuitos', { empresaId: e, fechaInicial: fi, fechaFinal: ff });
    }

    // ── Importar Sistema Contable ──────────────────────────────────────────────

    async getReporteImportarSisContable(e: string, fi: string, ff: string, asientoAnterior: number) {
        return this.fetch('importar-sistema-contable', { empresaId: e, fechaInicial: fi, fechaFinal: ff, asientoAnterior });
    }
}

export const reportesVentasService = new ReportesVentasService();
