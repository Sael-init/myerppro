// src/app/dashboard/ventas/crear/layout.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconFileInvoice, IconTruck, IconArrowLeft, IconLock } from "@tabler/icons-react";
import { CrearProvider, useCrearStore } from "./store";

const TABS = [
  {
    label:    "Documento Venta",
    href:     "/dashboard/ventas/crear/d_ventas",
    match:    "/d_ventas",
    icon:     IconFileInvoice,
    guarded:  false,   // siempre accesible
  },
  {
    label:    "Guía Remisión",
    href:     "/dashboard/ventas/crear/d_guia_remision",
    match:    "/d_guia_remision",
    icon:     IconTruck,
    guarded:  true,    // solo si guiaActiva === true
  },
];

function TabShell({ children }: { children: React.ReactNode }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const { guiaActiva } = useCrearStore();

  const handleTabClick = (tab: typeof TABS[0]) => {
    // Si la tab está guardada y la guía no está activa → no navegar
    if (tab.guarded && !guiaActiva) return;
    router.push(tab.href);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Barra de tabs (sticky) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">

          {/* Breadcrumb + back */}
          <div className="flex items-center gap-2 pt-3 pb-1">
            <button
              onClick={() => router.push("/dashboard/ventas")}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
            >
              <IconArrowLeft size={18} />
            </button>
            <span className="text-[11px] text-slate-400">
              Módulo Ventas
              <span className="mx-1.5">/</span>
              <span className="text-slate-600 font-semibold">Nuevo Documento</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 -mb-px">
            {TABS.map((tab) => {
              const active   = pathname.includes(tab.match);
              const locked   = tab.guarded && !guiaActiva;
              const Icon     = tab.icon;
              return (
                <button
                  key={tab.href}
                  onClick={() => handleTabClick(tab)}
                  title={locked ? "Activa la Guía de Remisión desde el panel de Condiciones de Pago" : undefined}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 text-sm font-semibold
                    border-b-2 transition-all rounded-t-lg
                    ${active
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : locked
                        ? "border-transparent text-slate-300 cursor-not-allowed"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                >
                  <Icon size={15} />
                  {tab.label}
                  {locked && <IconLock size={11} className="ml-0.5 text-slate-300" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

export default function CrearLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrearProvider>
      <TabShell>{children}</TabShell>
    </CrearProvider>
  );
}