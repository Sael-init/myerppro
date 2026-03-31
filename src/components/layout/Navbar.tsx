import { IconUserCircle, IconBell, IconLogout } from '@tabler/icons-react';

const Navbar = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="text-sm font-medium text-slate-500">
        Bienvenido, <span className="text-slate-900 font-bold">Admin Usuario</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative">
          <IconBell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3 pl-2">
          <IconUserCircle size={32} className="text-slate-300" />
          <button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
            <IconLogout size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;