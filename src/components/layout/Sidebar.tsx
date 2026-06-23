"use client"; // <--- OBLIGATORIO: Necesario para saber en qué ruta estamos

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconUsers,
  IconUserCog,
  IconTruck,
  IconCreditCard,
  IconCalendarTime,
  IconFileInvoice,
  IconShoppingCart,
  IconFileText,
  IconTag,
  IconReceiptRefund,
  IconChartBar,
} from "@tabler/icons-react";

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { title: 'Clientes', icon: <IconUsers size={20} />, path: '/dashboard/clientes' },
    { title: 'Trabajadores', icon: <IconUserCog size={20} />, path: '/dashboard/trabajadores' },
    { title: 'Proveedores', icon: <IconTruck size={20} />, path: '/dashboard/proveedores' },
    { title: 'Formas de Pago', icon: <IconCreditCard size={20} />, path: '/dashboard/formaspago' },
    { title: 'Condiciones de Pago', icon: <IconCalendarTime size={20} />, path: '/dashboard/condicionpago' },
    { title: 'Documentos Venta', icon: <IconFileInvoice size={20} />, path: '/dashboard/ventas' },
    { title: 'Pedidos de Venta', icon: <IconShoppingCart size={20} />, path: '/dashboard/pedidoventa' },
    { title: 'Cotizaciones', icon: <IconFileText size={20} />, path: '/dashboard/cotizaciones' },
    { title: 'Lista de Precios', icon: <IconTag size={20} />, path: '/dashboard/lista_precios' },
    { title: 'Notas de Crédito', icon: <IconReceiptRefund size={20} />, path: '/dashboard/notacredito' },
    { title: 'Reportes Ventas', icon: <IconChartBar size={20} />, path: '/dashboard/reportesventas' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-100 font-bold text-blue-700 text-xl">
          Mi ERP PRO
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          // Lógica para saber si el item está activo
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;