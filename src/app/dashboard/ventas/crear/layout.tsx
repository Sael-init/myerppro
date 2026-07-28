// src/app/dashboard/ventas/crear/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { CrearProvider } from "./store";

function TopBar({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Breadcrumb + back (sticky) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 py-3">
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
      <TopBar>{children}</TopBar>
    </CrearProvider>
  );
}
