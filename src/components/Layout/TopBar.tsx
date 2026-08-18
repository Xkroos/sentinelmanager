import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Sun, Moon, Menu, ShoppingBag } from 'lucide-react';
import { useTheme } from '../../App'; // We will export useTheme from App.tsx or ThemeContext

interface TopBarProps {
    toggleSidebar: () => void;
}

export function TopBar({ toggleSidebar }: TopBarProps) {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [bcvRate, setBcvRate] = useState<number | null>(null);

    useEffect(() => {
        fetch('https://ve.dolarapi.com/v1/dolares/oficial')
            .then(res => res.json())
            .then(data => {
                if (data && data.promedio) {
                    setBcvRate(data.promedio);
                }
            })
            .catch(err => console.error("Error fetching BCV rate:", err));
    }, []);

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="flex justify-between items-center w-full">
                
                <div className="flex items-center">
                    <button 
                        onClick={toggleSidebar}
                        className="p-2 mr-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <ShoppingBag className="w-6 h-6 text-emerald-600 dark:text-emerald-400 hidden sm:block" />
                    <h1 className="ml-2 text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent whitespace-nowrap">
                        Sentinel Manager
                    </h1>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    {bcvRate !== null && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm transition-all" title="Tasa Oficial BCV">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">BCV</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">Bs. {bcvRate.toFixed(2)}</span>
                        </div>
                    )}

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 ring-1 ring-slate-200 dark:ring-slate-700"
                        title={theme === 'dark' ? "Activar Modo Claro" : "Activar Modo Oscuro"}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {user?.email && (
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:block truncate max-w-[150px]">
                            {user.email}
                        </span>
                    )}
                    
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl transition-all shadow-md active:scale-95"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
