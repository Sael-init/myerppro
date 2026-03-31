// src/app/dashboard/clientes/components/ClienteViewModal.tsx
"use client";
import { useState, useEffect } from 'react';
import clienteService from '@/services/clienteService';
import Modal from '@/components/ui/Modal';
import { IconLoader, IconX, IconUserCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Cliente } from '@/types/cliente.types';

interface Props {
    clienteId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

// Componente para mostrar un campo de información
const InfoField = ({ label, value, fullWidth = false }: { label: string; value?: string | number | null; fullWidth?: boolean }) => {
    if (!value) return null;
    
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
            <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 uppercase">
                {value}
            </dd>
        </div>
    );
};

export default function ClienteViewModal({ clienteId, isOpen, onClose }: Props) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && clienteId) {
            setLoading(true);
            clienteService.getById(clienteId)
                .then(res => {
                    setCliente(res);
                })
                .catch(err => {
                    console.error('Error cargando cliente:', err);
                    toast.error('Error al cargar el cliente');
                    onClose();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setCliente(null);
        }
    }, [isOpen, clienteId]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Detalle del Cliente"
            size="xl"
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
                    <p className="text-slate-400 text-sm">Cargando información del cliente...</p>
                </div>
            ) : cliente ? (
                <div className="space-y-6">
                    {/* Header del Cliente */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <IconUserCircle size={40} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-800 uppercase">{cliente.descripcion}</h3>
                            <div className="flex gap-4 mt-1">
                                <span className="text-xs text-slate-500 uppercase">
                                    <span className="font-semibold">{cliente.docidentId}:</span> {cliente.num_docident}
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

                    {/* Información Básica */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-blue-600 rounded"></div>
                            Información Básica
                        </h4>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Tipo de Cliente" value={cliente.tipoclienteId} />
                            <InfoField label="Tipo de Documento" value={cliente.docidentId} />
                            <InfoField label="Nro. Documento" value={cliente.num_docident} />
                            <InfoField label="Sexo" value={cliente.sexo === 'M' ? 'Masculino' : cliente.sexo === 'F' ? 'Femenino' : cliente.sexo} />
                            <InfoField label="Fecha de Nacimiento" value={cliente.fecha_nac} />
                            <InfoField label="Estado Civil" value={cliente.estado_civil} />
                        </dl>
                    </div>

                    {/* Información de Contacto */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-blue-600 rounded"></div>
                            Información de Contacto
                        </h4>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Email" value={cliente.email} fullWidth />
                            <InfoField label="Sitio Web" value={cliente.website} fullWidth />
                            <InfoField label="Teléfono Fijo 1" value={cliente.telefono_fijo} />
                            <InfoField label="Teléfono Fijo 2" value={cliente.telefono_fijo2} />
                            <InfoField label="Teléfono Móvil 1" value={cliente.telefono_movil} />
                            <InfoField label="Teléfono Móvil 2" value={cliente.telefono_movil2} />
                            <InfoField label="Dirección" value={cliente.direccion} fullWidth />
                        </dl>
                    </div>

                    {/* Información Adicional */}
                    {(cliente.codigo_RepresentanteLegal || cliente.agente_retencion) && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                                <div className="w-1 h-4 bg-blue-600 rounded"></div>
                                Información Adicional
                            </h4>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="Código Rep. Legal" value={cliente.codigo_RepresentanteLegal} />
                                <InfoField label="Agente de Retención" value={cliente.agente_retencion} />
                            </dl>
                        </div>
                    )}

                    {/* Información del Sistema */}
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
                        </dl>
                    </div>

                    {/* Botón Cerrar */}
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