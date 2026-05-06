// src/services/catalogService.ts
import apiClient from '../api/apiCliente';
import { SelectOption } from '../types/catalog.types';

const catalogCache = new Map<string, Promise<SelectOption[]>>();

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

export const catalogService = {
    getDynamicCatalog: (
        endpointName: string,
        extraParams?: Record<string, unknown>
    ): Promise<SelectOption[]> => {
        const paramsKey = extraParams ? stableStringify(extraParams) : '';
        const cacheKey = `${endpointName}_${paramsKey}`;

        if (catalogCache.has(cacheKey)) {
            return catalogCache.get(cacheKey)!;
        }

        const fetchPromise = (async () => {
            try {
                // Base param
                const queryParams: Record<string, unknown> = { page: 1, ...(extraParams || {}) };
                let fullUrl = `/${endpointName}`;
                const getParamString = (value: unknown): string => String(value ?? '').trim();
                
                // Reglas de ruteo
                if (endpointName === 'MotivoTraslado') fullUrl = `/${endpointName}/list`;
                else if (endpointName === 'TablaTransaccionesPerfil') fullUrl = `/TablaTransacciones/por-perfil`; 
                else if (endpointName === 'AlmacenLote') {
                    fullUrl = `/AlmacenLote/almacen/${getParamString(queryParams.almacenId)}/presentacion/${getParamString(queryParams.presentacionId)}`;
                    delete queryParams.almacenId;
                    delete queryParams.presentacionId;
                }

                const endpointsPorEmpresa = new Set([
                    'Almacen', 'Punto_Venta', 'Trabajador', 'Transportista',
                    'UnidadTransporte', 'ConductorTransporte', 'TablaTransacciones', 'Producto'
                ]);

                const empresaId = getParamString(queryParams.empresaId);
                if (endpointsPorEmpresa.has(endpointName) && empresaId) {
                    fullUrl = `/${endpointName}/empresa/${empresaId}`;
                    delete queryParams.empresaId;
                }

                const tenantId = getParamString(queryParams.tenantId);
                if (endpointName === 'Proveedor' && tenantId) {
                    fullUrl = `/${endpointName}/tenant/${tenantId}`;
                    delete queryParams.tenantId;
                }
                if (endpointName === 'Cliente' && tenantId) queryParams.tenantId = tenantId;

                // 🚀 LA MAGIA DE LA PAGINACIÓN INTELIGENTE
                // Solo las tablas masivas cargarán 20 por defecto. Las demás traen 1000.
                const catMasivos = new Set(['Cliente', 'Proveedor', 'Trabajador', 'Transportista', 'ConductorTransporte', 'AlmacenSerie', 'Producto', 'AlmacenLote']);
                
                // Configuración de parámetros por endpoint
                if (endpointName === 'DocumentoIdentidadXcore') {
                    queryParams.pageSize = 1000;
                    queryParams.estado = true;
                } else if (endpointName === 'Marca' || endpointName === 'Modelo') {
                    // 🚀 REGRESAMOS A LA VERSIÓN ESTABLE: 1000 registros para evitar roturas
                    queryParams.size = 1000;
                    queryParams.estado = 1;
                } else {
                    queryParams.pageSize = 1000;
                    // 🚀 LA CURA 1: Agregamos OperacionesItem y DetraccionBien para que no fallen
                    const endpointsSinEstado = new Set(['Cliente', 'Proveedor', 'AlmacenSerie', 'OperacionesItem', 'DetraccionBien']);
                    
                    if (!endpointsSinEstado.has(endpointName) && !('estado' in queryParams)) {
                        queryParams.estado = true;
                    }
                }

                const response = await apiClient.get(fullUrl, { params: queryParams });
                
                const rawData = Array.isArray(response.data?.data) ? response.data.data
                    : Array.isArray(response.data) ? response.data : [];

                const formattedData: SelectOption[] = rawData.map((item: any, index: number) => {
                    const endpointSpecificId =
                        endpointName === 'MotivoTraslado' ? item.motivotrasladoId
                        : endpointName === 'TipoMovimiento' ? item.tipomovimientoId
                        : endpointName === 'TipoOperacion' ? item.tipoOperacionId
                        : endpointName === 'TipoDocumentoComercial' ? item.tipodoccomercialId
                        : endpointName === 'CuentaUsuario' ? item.cuentausuarioId
                        : endpointName === 'EstadoGuiasRemision' ? (item.Id || item.id)
                        : endpointName === 'Transportista' ? item.transportistaId
                        : endpointName === 'UnidadTransporte' ? item.unidadtransporteId
                        : endpointName === 'ConductorTransporte' ? item.conductortransporteId
                        : endpointName === 'Almacen' ? item.almacenId
                        : endpointName === 'PuntoVenta' || endpointName === 'Punto_Venta' ? item.puntoventaId
                        : endpointName === 'Trabajador' ? item.trabajadorId
                        : endpointName === 'AlmacenSerie' ? item.serie
                        : endpointName === 'Cliente' ? item.clienteId
                        : endpointName === 'Proveedor' ? item.proveedorId
                        : endpointName === 'TablaTransacciones' || endpointName === 'TablaTransaccionesPerfil' ? item.transaccionId
                        : endpointName === 'AlmacenLote' ? item.loteId
                        : endpointName === 'DetraccionBien' ? item.detraccionbienserviceId
                        : endpointName === 'OperacionesItem' ? item.operacionesItemId
                        : endpointName === 'SubClaseBien' ? item.subclasebienId
                        : endpointName === 'UnidadMedida' ? item.unidadmedidaId
                        : endpointName === 'TipoBien' ? item.tipobienId
                        : endpointName === 'Producto' ? item.bienId // 🚀 ¡ESTA ES LA LÍNEA QUE FALTABA!
                        : undefined;

                    // Y por si acaso, añádelo de primero en los fallbacks aquí abajo:
                    const extractedId = String(
                        endpointSpecificId || item.bienId || item.Id || item.tipobienId || item.subclasebienId || 
                        item.unidadmedidaId || item.modeloId || item.marcaId || item.docidentId || 
                        item.id || item.codigo || item.serie || `fallback-${index}`
                    ).trim();

                    const extractedDesc = endpointName === 'AlmacenSerie' ? item.serie : 
                        (item.Descripcion || item.descripcion_larga || item.descripcion || item.razon_social || 
                         item.nombres || item.nombre || item.observacion || 'Sin nombre');
                    
                    let finalLabel = String(extractedDesc);
                    
                    if (endpointName === 'UnidadTransporte') {
                        const unidadDesc = String(item.descripcion || item.nombre || extractedDesc || '').trim();
                        const refs = [item.nro_matricula_cabina, item.certificado_inscripcion].filter(Boolean).join(' | ');
                        if (refs) finalLabel = `${unidadDesc} - ${refs}`.trim();
                    }
                    if (endpointName === 'ConductorTransporte' && item.apellidos) {
                        finalLabel = `${String(item.apellidos || '')}, ${String(item.nombres || '')}`.trim();
                    }

                    const auxValue = String(
                        endpointName === 'AlmacenSerie' ? (item.enviarSunat || '') : 
                        endpointName === 'DetraccionBien' ? (item.tasa !== undefined ? item.tasa : '') :
                        (item.tasa || item.abreviatura || item.descripcion_corta || item.numero_doc || '')
                    ).trim();

                    const groupKeyValue = String(endpointName === 'AlmacenSerie' ? item.tipodoccomercialId : (item.clasebienId || item.marcaId || item.groupkey || '')).trim();

                    return {
                        ...item, 
                        value: extractedId,
                        label: finalLabel,
                        key: extractedId, 
                        aux: auxValue,
                        groupKey: groupKeyValue, 
                        originalData: item
                    };
                });

                return formattedData;
            } catch (error) {
                console.error(`Error cargando catálogo ${endpointName}:`, error);
                catalogCache.delete(cacheKey);
                return [];
            }
        })();

        catalogCache.set(cacheKey, fetchPromise);
        return fetchPromise;
    },
    clearCache: () => { catalogCache.clear(); }
};