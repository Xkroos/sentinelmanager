import { useState, createContext, useContext, useEffect} from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { OrdersModule } from './components/OrdersModule';
import { StatisticsModule } from './components/StatisticsModule';
import { NotesModule } from './components/NotesModule';
import { FinancialOperationsModule } from './components/FinancialOperationsModule';
import { InventoryModule } from './components/InventoryModule'; 
import { LogOut, ShoppingBag, TrendingUp, StickyNote, BarChart3, Package, Menu, X, Sun, Moon, } from 'lucide-react';


type Theme = 'light' | 'dark';
interface ThemeContextProps {
    theme: Theme;
    toggleTheme: () => void;
}

// 1. Crear el contexto de tema
const ThemeContext = createContext<ThemeContextProps>({
    theme: 'light',
    toggleTheme: () => {},
});

// 2. Crear el hook para usar el contexto de tema
const useTheme = () => useContext(ThemeContext);

// 3. Crear el proveedor de tema
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Inicializar el tema basado en el localStorage o preferencia del sistema
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme') as Theme;
        }
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    // Se mantiene la lógica de localStorage pero se elimina la manipulación de document.documentElement
    useEffect(() => {
        // Guardar la preferencia del usuario
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    // Función para alternar el tema
    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            console.log("Theme Toggled:", newTheme);
            return newTheme;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// ----------------------------------------------------------------------
// COMPONENTE DE TOGGLE DE TEMA
// ----------------------------------------------------------------------

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    // Se reemplazan dark: por clases con el prefijo dark- para que el selector CSS funcione
    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-600 dark-text-200 hover:bg-slate-100 dark-hover-bg-700 transition-colors z-10"
            title={isDark ? "Activar Modo Claro" : "Activar Modo Oscuro"}
        >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};


// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL (DASHBOARD)
// ----------------------------------------------------------------------

// Definiciones de tipos
type Tab = 'orders' | 'statistics' | 'notes' | 'operations' | 'inventory';

function Dashboard() {
    const { user, signOut } = useAuth();
    // Se utiliza el contexto del tema aquí para aplicar la clase al contenedor principal
    const { theme } = useTheme(); 
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Se definen los estilos CSS customizados para simular el dark mode de Tailwind
    // Estos estilos se aplican cuando el contenedor principal tiene la clase 'dark-mode'
    const customStyles = `
        .dark-mode .dark-bg-900 { background-color: #0f172a; } /* slate-900 */
        .dark-mode .dark-bg-800 { background-color: #1e293b; } /* slate-800 */
        .dark-mode .dark-bg-700 { background-color: #334155; } /* slate-700 */
        .dark-mode .dark-bg-950 { background-color: #020617; } /* slate-950 */
        .dark-mode .dark-bg-sky-600 { background-color: #0284c7; } /* sky-600 */
        
        .dark-mode .dark-text-white { color: #ffffff; }
        .dark-mode .dark-text-200 { color: #e2e8f0; } /* slate-200 */
        .dark-mode .dark-text-400 { color: #94a3b8; } /* slate-400 */
        .dark-mode .dark-text-300 { color: #cbd5e1; } /* slate-300 */
        .dark-mode .dark-text-sky-500 { color: #0ea5e9; } /* sky-500 */

        .dark-mode .dark-border-700 { border-color: #334155; } /* slate-700 */
        .dark-mode .dark-border-800 { border-color: #1e293b; } /* slate-800 */

        .dark-mode .dark-hover-bg-700:hover { background-color: #334155; } /* slate-700 */
        
        .dark-mode .dark-hover-bg-slate-700:hover { background-color: #334155; }
        .dark-mode .dark-hover-bg-red-700:hover { background-color: #b91c1c; }
        .dark-mode .dark-hover-text-white:hover { color: #ffffff; }

        /* Asegurarse de que el color del icono en el botón de toggle se actualice */
        .dark-mode button[title="Activar Modo Claro"] svg { color: #e2e8f0; } /* Sun (light mode icon) color in dark mode */
        .dark-mode button[title="Activar Modo Oscuro"] svg { color: #475569; } /* Moon (dark mode icon) color in light mode */
    `;

    if (!user) {
        return <Login />;
    }

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (isMenuOpen) {
            setIsMenuOpen(false);
        }
    };

    // Componente auxiliar para el botón de la pestaña
    const TabButton: React.FC<{ tab: Tab, icon: React.ReactNode, label: string }> = ({ tab, icon, label }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`
                w-full flex items-center gap-3 p-3 text-left font-medium rounded-lg transition-all
                ${
                    // Clases para el estado ACTIVO
                    activeTab === tab
                        // Fondo oscuro en Light Mode, fondo más claro en Dark Mode
                        ? 'bg-slate-700 text-white shadow-md dark-bg-sky-600'
                        // Clases para el estado INACTIVO
                        : 'text-slate-200 hover:bg-slate-600 hover:text-white dark-text-400 dark-hover-bg-slate-700 dark-hover-text-white'
                }
            `}
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );

    // Función para renderizar el módulo de contenido actual
    const renderContent = () => {
        switch (activeTab) {
            case 'orders': return <OrdersModule />;
            case 'inventory': return <InventoryModule />;
            case 'statistics': return <StatisticsModule />;
            case 'notes': return <NotesModule />;
            case 'operations': return <FinancialOperationsModule />;
            default: return <OrdersModule />;
        }
    };

    return (
        // Se inyectan los estilos customizados para simular el dark mode
        <>
            <style>{customStyles}</style>
            
            {/* Se aplica la clase 'dark-mode' al contenedor principal */}
            <div className={`min-h-screen bg-slate-50 dark-bg-900 flex flex-col transition-colors duration-300 font-sans ${theme === 'dark' ? 'dark-mode' : ''}`}>
                
                {/* --- BARRA DE NAVEGACIÓN SUPERIOR FIJA (HEADER) --- */}
                <header className="bg-white dark-bg-800 border-b border-slate-200 dark-border-700 shadow-sm sticky top-0 z-20 h-16 flex items-center px-4 sm:px-6 lg:px-8 transition-colors">
                    <div className="flex justify-between items-center w-full">
                        
                        {/* Botón de Menú Móvil / Logo */}
                        <div className="flex items-center">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 mr-3 text-slate-600 dark-text-400 hover:text-slate-800 dark-hover-text-white transition-colors md:hidden"
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>

                            {/* Logo y Título */}
                            <ShoppingBag className="w-6 h-6 text-slate-700 dark-text-sky-500" />
                            <h1 className="ml-2 text-xl font-bold text-slate-800 dark-text-white whitespace-nowrap">
                                Sentinel Manager
                            </h1>
                        </div>

                        {/* Menú de Usuario, Theme Toggle y Salir */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            
                            <ThemeToggle /> {/* ¡Aquí está el botón! */}

                            {user.email && (
                                <span className="text-sm text-slate-600 dark-text-400 hidden sm:block truncate max-w-[150px]">{user.email}</span>
                            )}
                            
                            {/* Botón de Salir con estilos destacados */}
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 text-white hover:bg-red-600 dark-hover-bg-red-700 rounded-lg transition-colors shadow-md"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- CONTENEDOR PRINCIPAL: Sidebar + Contenido --- */}
                <main className="flex flex-1 overflow-hidden">
                    
                    {/* // --- BARRA LATERAL (SIDEBAR) --- 
                        // CAMBIO: Se ajusta 'dark-bg-950' a 'dark-bg-800' para coincidir con el Header.
                    */}
                    <aside 
                        className={`
                            fixed inset-y-0 left-0 z-30 transform 
                            md:fixed md:top-16 md:bottom-0 md:translate-x-0 md:w-64 md:flex-shrink-0
                            
                            w-64 bg-slate-800 dark-bg-800 transition-all duration-300 ease-in-out
                            p-4 flex flex-col space-y-4 shadow-2xl
                            ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                        `}
                    >
                        {/* Sección principal de navegación (pestañas) */}
                        <div className="flex flex-col space-y-2 flex-1">
                            <TabButton tab="orders" icon={<ShoppingBag className="w-5 h-5" />} label="Encargos" />
                            <TabButton tab="inventory" icon={<Package className="w-5 h-5" />} label="Inventario" />
                            <TabButton tab="statistics" icon={<TrendingUp className="w-5 h-5" />} label="Estadísticas" />
                            <TabButton tab="operations" icon={<BarChart3 className="w-5 h-5" />} label="Operaciones" />
                            <TabButton tab="notes" icon={<StickyNote className="w-5 h-5" />} label="Notas" />
                        </div>

                        {/* Pie de página del Sidebar (Ajustes) - Alineado al fondo */}
                        <div className="mt-auto border-t border-slate-700 dark-border-800 pt-4">
                            {/* El ThemeToggle se movió al Header para mayor visibilidad */}
                        </div>
                    </aside>
                    
                    {/* --- Overlay para móvil --- */}
                    {isMenuOpen && (
                        <div 
                            className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                        ></div>
                    )}

                    {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
                    <section className="flex-1 overflow-y-auto p-4 md:p-8 md:ml-64 transition-colors">
                        {renderContent()}
                    </section>

                </main>
            </div>
        </>
    );
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Dashboard />
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;