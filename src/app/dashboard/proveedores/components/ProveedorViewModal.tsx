// src/app/dashboard/proveedores/components/ProveedorViewModal.tsx
"use client";
import { useState, useEffect } from 'react';
import proveedorService from '../../../../services/proveedoresService';
import Modal from '@/components/ui/Modal';
import { IconLoader, IconX, IconBuildingStore } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Proveedor } from '../../../../types/proveedores.types';

interface Props {
    proveedorId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

// Componente para mostrar un campo de información
const InfoField = ({ label, value, fullWidth = false }: { label: string; value?: string | number | null; fullWidth?: boolean }) => {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
        {value}
      </dd>
    </div>
  );
};

export default function ProveedorViewModal({ proveedorId, isOpen, onClose }: Props) {
    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && proveedorId) {
            setLoading(true);
            proveedorService.getById(proveedorId)
                .then(res => {
                    setProveedor(res);
                })
                .catch(err => {
                    console.error('Error cargando proveedor:', err);
                    toast.error('Error al cargar el proveedor');
                    onClose();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setProveedor(null);
        }
    }, [isOpen, proveedorId]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Detalle del Proveedor"
            size="xl"
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <IconLoader className="animate-spin text-purple-600 mb-4" size={48} />
                    <p className="text-slate-400 text-sm">Cargando información del proveedor...</p>
                </div>
            ) : proveedor ? (
                <div className="space-y-6">
                    {/* Header del Proveedor */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                            <IconBuildingStore size={40} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-800">{proveedor.descripcion}</h3>
                            <div className="flex gap-4 mt-1">
                                <span className="text-xs text-slate-500">
                                    <span className="font-semibold">{proveedor.docidentId}:</span> {proveedor.num_docident}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    proveedor.estado 
                                        ? 'bg-green-100 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                    {proveedor.estado ? 'ACTIVO' : 'ANULADO'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Información Básica */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-600 rounded"></div>
                            Información Básica
                        </h4>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Tipo de Proveedor" value={proveedor.tipoProveedor?.descripcion || proveedor.tipoproveedorId} />
                            <InfoField label="Clase de Proveedor" value={proveedor.claseProveedor?.descripcion || proveedor.claseproveedorId} />
                            <InfoField label="Tipo de Documento" value={proveedor.documentoIdentidad?.descripcion_larga || proveedor.docidentId} />
                            <InfoField label="Nro. Documento" value={proveedor.num_docident} />
                        </dl>
                    </div>

                    {/* Información de Contacto */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-600 rounded"></div>
                            Información de Contacto
                        </h4>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Email" value={proveedor.email} fullWidth />
                            <InfoField label="Teléfono Fijo" value={proveedor.telefono_fijo} />
                            <InfoField label="Teléfono Móvil" value={proveedor.telefono_movil} />
                            <InfoField label="Dirección" value={proveedor.direccion} fullWidth />
                        </dl>
                    </div>

                    {/* Información del Tenant */}
                    {proveedor.tenant && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                                <div className="w-1 h-4 bg-purple-600 rounded"></div>
                                Información del Tenant
                            </h4>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="Descripción" value={proveedor.tenant.descripcion} />
                                <InfoField label="Dominio" value={proveedor.tenant.dominio} />
                                <InfoField label="Contacto" value={proveedor.tenant.nombreContacto} />
                                <InfoField label="Teléfono Contacto" value={proveedor.tenant.telefonoContacto} />
                                <InfoField label="Email Contacto" value={proveedor.tenant.emailContacto} fullWidth />
                            </dl>
                        </div>
                    )}

                    {/* Información del Sistema */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Información del Sistema</h4>
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            {proveedor.proveedorId && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">ID Proveedor</dt>
                                    <dd className="text-slate-700 font-mono">{proveedor.proveedorId}</dd>
                                </div>
                            )}
                            {proveedor.tenantId && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">ID Tenant</dt>
                                    <dd className="text-slate-700 font-mono">{proveedor.tenantId}</dd>
                                </div>
                            )}
                            {proveedor.tenantEstado && (
                                <div>
                                    <dt className="text-slate-500 font-semibold">Estado Tenant</dt>
                                    <dd className="text-slate-700">{proveedor.tenantEstado.descripcion}</dd>
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
                    No se pudo cargar la información del proveedor
                </div>
            )}
        </Modal>
    );
}