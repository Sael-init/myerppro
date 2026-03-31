"use client";
import { IconChevronLeft, IconChevronRight, IconPackage, IconLoader2 } from '@tabler/icons-react';

interface Column<T> {
  header: string;
  key?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  meta?: {
    totalPages: number;
    currentPage: number;
    totalRecords: number;
  };
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

export default function DataTable<T>({ 
  columns, data, loading = false, meta, onPageChange, emptyMessage = "No se encontraron registros" 
}: DataTableProps<T>) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="overflow-auto custom-scrollbar h-[calc(100vh-320px)] relative">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className={`py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 ${col.className || ''}`} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-blue-600">
                    <IconLoader2 size={40} className="animate-spin" />
                    <span className="text-slate-400 italic text-xs">Cargando datos del ERP...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-blue-50/30 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                      {col.render ? col.render(row) : (col.key ? (row[col.key] as React.ReactNode) : null)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center text-slate-400 italic">
                  <IconPackage size={48} className="mx-auto mb-2 opacity-20" />
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {meta && (
        <div className="bg-slate-50 border-t border-slate-300 p-3 flex justify-between items-center text-xs text-slate-600 font-medium">
          <div>Mostrando <span className="text-slate-900">{data.length}</span> de <span className="text-slate-900">{meta.totalRecords}</span> registros</div>
          <div className="flex items-center gap-2">
            <button disabled={meta.currentPage === 1 || loading} onClick={() => onPageChange?.(meta.currentPage - 1)} className="p-1.5 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm">
              <IconChevronLeft size={16} />
            </button>
            <span>Página {meta.currentPage} de {meta.totalPages}</span>
            <button disabled={meta.currentPage === meta.totalPages || loading} onClick={() => onPageChange?.(meta.currentPage + 1)} className="p-1.5 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm">
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}