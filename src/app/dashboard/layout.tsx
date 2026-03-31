import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-left">
      {/* El Sidebar se mantiene estático aquí */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* El Navbar se mantiene estático aquí */}
        <Navbar />
        
        <main className="flex-1 p-4">
          {/* "children" es el equivalente a <Outlet /> de React */}
          {children}
        </main>
      </div>
    </div>
  );
}