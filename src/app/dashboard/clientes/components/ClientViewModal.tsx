// src/app/dashboard/clientes/components/ClienteViewModal.tsx
"use client";
import { useState, useEffect } from 'react';
import clienteService from '@/services/clienteService';
import Modal from '@/components/ui/Modal';
import { IconLoader, IconX, IconUserCircle, IconMapPin } from '@tabler/icons-react';
import { toast } from 'sonner';

interface Props {
    clienteId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const InfoField = ({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value?: string | number | null | boolean;
    fullWidth?: boolean;
}) => {
    if (value === undefined || value === null || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
            <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 uppercase">
                {display}
            </dd>
        </div>
    );
};

const SectionTitle = ({ title }: { title: string }) => (
    <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-600 rounded" />
        {title}
    </h4>
);

function fmtFecha(iso: string): string {
    if (!iso) return "";
    const [y, m, d] = iso.split("T")[0].split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

export default function ClienteViewModal({ clienteId, isOpen, onClose }: Props) {
    const [cliente, setCliente] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && clienteId) {
            setLoading(true);
            clienteService.getById(clienteId)
                .then(res => setCliente(res))
                .catch(() => {
                    toast.error('Error al cargar el cliente');
                    onClose();
                })
                .finally(() => setLoading(false));
        } else {
            setCliente(null);
        }
    }, [isOpen, clienteId]);

    // Maneja ambas variantes de casing que puede devolver el backend
    const tipoCliente     = cliente?.tipoCliente     || cliente?.tipocliente;
    const docIdentidad    = cliente?.documentoIdentidad || cliente?.documento_identidad;
    const ubigeo          = cliente?.ubigeo;
    const tenant          = cliente?.tenant;
    const direccionesExtras: any[] = cliente?.direccionesExtras ?? [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Cliente" size="xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
                    <p className="text-slate-400 text-sm">Cargando información del cliente...</p>
                </div>
            ) : cliente ? (
                <div className="space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <IconUserCircle size={40} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-800 uppercase">{cliente.descripcion}</h3>
                            <div className="flex flex-wrap gap-3 mt-1">
                                <span className="text-xs text-slate-500 uppercase">
                                    <span className="font-semibold">
                                        {docIdentidad?.descripcion_corta || cliente.docidentId}:
                                    </span>{' '}
                                    {cliente.num_docident}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    cliente.estado
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                    {cliente.estado ? 'ACTIVO' : 'ANULADO'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Información Básica ── */}
                    <div className="space-y-3">
                        <SectionTitle title="Información Básica" />
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField
                                label="Tipo de Cliente"
                                value={tipoCliente?.descripcion || cliente.tipoclienteId}
                            />
                            <InfoField
                                label="Tipo de Documento"
                                value={docIdentidad?.descripcion_larga || docIdentidad?.descripcion_corta || cliente.docidentId}
                            />
                            <InfoField label="Nro. Documento"    value={cliente.num_docident} />
                            <InfoField label="Sexo"              value={(() => {
                                const s = (cliente.sexo ?? "").trim().toUpperCase();
                                return s === 'M' ? 'Masculino' : s === 'F' ? 'Femenino' : s || undefined;
                            })()} />
                            <InfoField label="Fecha Nacimiento"  value={fmtFecha(cliente.fecha_nac)} />
                            <InfoField label="Estado Civil"      value={cliente.estado_civil} />
                        </dl>
                    </div>

                    {/* ── Contacto ── */}
                    {(cliente.email || cliente.telefono_fijo || cliente.telefono_movil || cliente.direccion || cliente.website) && (
                        <div className="space-y-3">
                            <SectionTitle title="Información de Contacto" />
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="Email"            value={cliente.email}            fullWidth />
                                <InfoField label="Sitio Web"        value={cliente.website}          fullWidth />
                                <InfoField label="Teléfono Fijo"    value={cliente.telefono_fijo} />
                                <InfoField label="Teléfono Fijo 2"  value={cliente.telefono_fijo2} />
                                <InfoField label="Teléfono Móvil"   value={cliente.telefono_movil} />
                                <InfoField label="Teléfono Móvil 2" value={cliente.telefono_movil2} />
                                <InfoField label="Dirección Principal" value={cliente.direccion}     fullWidth />
                            </dl>
                        </div>
                    )}

                    {/* ── Ubicación Geográfica ── */}
                    {ubigeo && (
                        <div className="space-y-3">
                            <SectionTitle title="Ubicación Geográfica" />
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="País"          value={ubigeo.ubipan} />
                                <InfoField label="Departamento"  value={ubigeo.ubiden} />
                                <InfoField label="Provincia"     value={ubigeo.ubiprn} />
                                <InfoField label="Código Ubigeo" value={cliente.ubidst} />
                                <InfoField label="Nacionalidad"  value={ubigeo.nacionalidad} />
                            </dl>
                        </div>
                    )}

                    {/* ── Direcciones Adicionales ── */}
                    {direccionesExtras.length > 0 && (
                        <div className="space-y-3">
                            <SectionTitle title={`Direcciones Adicionales (${direccionesExtras.length})`} />
                            <div className="space-y-2">
                                {direccionesExtras.map((dir: any, i: number) => (
                                    <div
                                        key={dir.almacenclienteId || i}
                                        className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                    >
                                        <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 uppercase">{dir.direccion}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <IconMapPin size={11} className="text-slate-400" />
                                                <span className="text-[10px] font-mono text-slate-500">{dir.ubidst || '—'}</span>
                                                {dir.almacenclienteId && (
                                                    <span className="text-[10px] text-slate-400">ID: {dir.almacenclienteId}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            dir.estado
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-500 border-red-100'
                                        }`}>
                                            {dir.estado ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Tenant ── */}
                    {tenant && (
                        <div className="space-y-3">
                            <SectionTitle title="Información del Tenant" />
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="Empresa Tenant"    value={tenant.descripcion} />
                                <InfoField label="Dominio"           value={tenant.dominio} />
                                <InfoField label="Contacto"          value={tenant.nombreContacto} />
                                <InfoField label="Teléfono Contacto" value={tenant.telefonoContacto} />
                                <InfoField label="Email Contacto"    value={tenant.emailContacto} fullWidth />
                            </dl>
                        </div>
                    )}

                    {/* ── Sistema ── */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Información del Sistema</h4>
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            {cliente.clienteId && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">ID Cliente</dt>
                                    <dd className="text-slate-700 font-mono">{cliente.clienteId}</dd>
                                </div>
                            )}
                            {cliente.empresaId && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">ID Empresa</dt>
                                    <dd className="text-slate-700 font-mono">{cliente.empresaId}</dd>
                                </div>
                            )}
                            {cliente.tenantId && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">ID Tenant</dt>
                                    <dd className="text-slate-700 font-mono">{cliente.tenantId}</dd>
                                </div>
                            )}
                            {cliente.codigo_RepresentanteLegal && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">Cód. Rep. Legal</dt>
                                    <dd className="text-slate-700 font-mono">{cliente.codigo_RepresentanteLegal}</dd>
                                </div>
                            )}
                            {cliente.agente_retencion && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">Agente Retención</dt>
                                    <dd className="text-slate-700">{cliente.agente_retencion}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* ── Botón Cerrar ── */}
                    <div className="flex justify-end pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            <IconX size={18} /> Cerrar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 text-slate-400">
                    No se pudo cargar la información del cliente
                </div>
            )}
        </Modal>
    );
}
