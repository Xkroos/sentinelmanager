import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    FileText,
    TrendingUp,
    BarChart3,
    StickyNote,
    X,
    Users,
    MessageCircle
} from 'lucide-react';

export type Tab = 'dashboard' | 'orders' | 'reminders' | 'inventory' | 'reports' | 'statistics' | 'operations' | 'notes' | 'partners';

interface SidebarProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (window.innerWidth < 1024) { // lg breakpoint
            setIsOpen(false);
        }
    };

    const TabButton = ({ tab, icon, label }: { tab: Tab, icon: React.ReactNode, label: string }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => handleTabChange(tab)}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-xl transition-all duration-200 group
                    ${isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }
                `}
            >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </div>
                <span className="truncate tracking-wide">{label}</span>
            </button>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
                    transform transition-transform duration-300 ease-spring lg:translate-x-0 lg:static lg:flex-shrink-0
                    flex flex-col
                    ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between h-16 px-6 lg:hidden border-b border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Menú</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin">
                    <p className="px-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Principal</p>
                    <TabButton tab="dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Resumen" />
                    <TabButton tab="orders" icon={<ShoppingBag className="w-5 h-5" />} label="Encargos" />
                    <TabButton tab="reminders" icon={<MessageCircle className="w-5 h-5" />} label="Cobranza" />

                    <div className="my-6" />
                    <p className="px-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Gestión</p>
                    <TabButton tab="inventory" icon={<Package className="w-5 h-5" />} label="Inventario" />
                    <TabButton tab="reports" icon={<FileText className="w-5 h-5" />} label="Reporte Inventario" />

                    <div className="my-6" />
                    <p className="px-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Inversores</p>
                    <TabButton tab="partners" icon={<Users className="w-5 h-5" />} label="Socios" />

                    <div className="my-6" />
                    <p className="px-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Análisis</p>
                    <TabButton tab="operations" icon={<BarChart3 className="w-5 h-5" />} label="Finanzas" />
                    <TabButton tab="statistics" icon={<TrendingUp className="w-5 h-5" />} label="Estadísticas" />

                    <div className="my-6" />
                    <p className="px-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Herramientas</p>
                    <TabButton tab="notes" icon={<StickyNote className="w-5 h-5" />} label="Notas" />
                </div>
            </aside>
        </>
    );
}
