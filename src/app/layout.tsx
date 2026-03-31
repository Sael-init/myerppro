// src/app/layout.tsx
import "./globals.css"; // <--- ESTA ES LA LÍNEA QUE DEBES AGREGAR
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mi ERP PRO",
  description: "Sistema de gestión empresarial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        {children}
        {/* El Toaster manejará las notificaciones visuales de éxito/error */}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}