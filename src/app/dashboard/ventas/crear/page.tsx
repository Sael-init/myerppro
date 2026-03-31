// src/app/dashboard/ventas/crear/page.tsx
// Redirige automáticamente a la pestaña de Documento Venta
import { redirect } from "next/navigation";

export default function CrearPage() {
  redirect("/dashboard/ventas/crear/d_ventas");
}