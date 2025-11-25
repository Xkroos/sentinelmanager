import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { OrdersModule } from './components/OrdersModule';
import { StatisticsModule } from './components/StatisticsModule';
import { NotesModule } from './components/NotesModule';
import { FinancialOperationsModule } from './components/FinancialOperationsModule';
import { InventoryModule } from './components/InventoryModule'; 
import { LogOut, ShoppingBag, TrendingUp, StickyNote, BarChart3, Package, Menu, X } from 'lucide-react';


// Definiciones de tipos
type Tab = 'orders' | 'statistics' | 'notes' | 'operations' | 'inventory';

function Dashboard() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('orders'); 
    // Nuevo estado para controlar la visibilidad del menú móvil
    const [isMenuOpen, setIsMenuOpen] = useState(false); 

    if (!user) {
        return <Login />;
    }

    // Función para manejar el cambio de pestaña y cerrar el menú móvil
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setIsMenuOpen(false); // Cierra el menú al seleccionar una pestaña
    };

    // Componente auxiliar para el botón de la pestaña
    const TabButton: React.FC<{ tab: Tab, icon: React.ReactNode, label: string }> = ({ tab, icon, label }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`
                flex items-center gap-2 px-4 py-2 font-medium transition-colors 
                whitespace-nowrap rounded-lg 
                ${
                    activeTab === tab
                        ? 'text-slate-800 border-b-2 border-slate-700 bg-slate-100 md:bg-transparent md:border-b-2'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 md:hover:bg-transparent'
                }
            `}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* --- BARRA DE NAVEGACIÓN SUPERIOR --- */}
            <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo y Título */}
                        <div className="flex items-center">
                            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700" />
                            <h1 className="ml-2 text-lg sm:text-xl font-bold text-slate-800">
                                SentinelSyS
                            </h1>
                        </div>

                        {/* Menú de Usuario (Desktop) */}
                        <div className="hidden sm:flex items-center gap-4">
                            <span className="text-sm text-slate-600 truncate max-w-[150px]">{user.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4" />
                                Salir
                            </button>
                        </div>

                        {/* Botón de Menú Móvil */}
                        <div className="sm:hidden">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            
            {/* --- MENÚ DE TABS (ESCRITORIO) --- */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6">
                <div className="hidden md:flex gap-4 border-b border-slate-200 overflow-x-auto pb-1">
                    <TabButton tab="orders" icon={<ShoppingBag className="w-5 h-5" />} label="Encargos" />
                    <TabButton tab="inventory" icon={<Package className="w-5 h-5" />} label="Inventario" />
                    <TabButton tab="statistics" icon={<TrendingUp className="w-5 h-5" />} label="Estadísticas" />
                    <TabButton tab="notes" icon={<StickyNote className="w-5 h-5" />} label="Notas" />
                    <TabButton tab="operations" icon={<BarChart3 className="w-5 h-5" />} label="Operaciones" />
                </div>
                
                {/* --- MENÚ MÓVIL (PANTALLAS PEQUEÑAS) --- */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white p-4 border border-slate-200 rounded-lg shadow-md mb-4">
                        <div className="flex flex-col space-y-2">
                            {/* Información del Usuario Móvil */}
                            <div className="py-2 mb-2 border-b border-slate-100">
                                <span className="text-sm font-semibold text-slate-700 block">Hola, {user.email}</span>
                            </div>

                            {/* Botones de Navegación */}
                            <TabButton tab="orders" icon={<ShoppingBag className="w-5 h-5" />} label="Encargos" />
                            <TabButton tab="inventory" icon={<Package className="w-5 h-5" />} label="Inventario" />
                            <TabButton tab="statistics" icon={<TrendingUp className="w-5 h-5" />} label="Estadísticas" />
                            <TabButton tab="notes" icon={<StickyNote className="w-5 h-5" />} label="Notas" />
                            <TabButton tab="operations" icon={<BarChart3 className="w-5 h-5" />} label="Operaciones" />
                            
                            {/* Botón de Salir Móvil */}
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 px-4 py-2 mt-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
                
                {/* --- CONTENIDO PRINCIPAL --- */}
                <div>
                    {activeTab === 'orders' && <OrdersModule />}
                    {activeTab === 'statistics' && <StatisticsModule />}
                    {activeTab === 'notes' && <NotesModule />}
                    {activeTab === 'operations' && <FinancialOperationsModule />}
                    {activeTab === 'inventory' && <InventoryModule />} 
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    );
}

export default App;