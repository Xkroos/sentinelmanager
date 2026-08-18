import { useState, useMemo } from 'react';
import { useStatistics } from '../hooks/useStatistics';
import { useInventory } from '../hooks/useInventory';
import { useOrders } from '../hooks/useOrders';
import { usePartners } from '../hooks/usePartners';
import { TrendingUp, TrendingDown, DollarSign, Activity, Package, ListTodo, Globe, ArrowUpRight, ShoppingBag } from 'lucide-react';

export function StatisticsModule() {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const { stats, globalStats, economiaGlobal, financialExpenses, loading: statsLoading } = useStatistics(period);
    const { items, loading: invLoading } = useInventory();
    const { orders, loading: ordersLoading } = useOrders();
    const { loading: partnersLoading } = usePartners();

    const [activeTab, setActiveTab] = useState<'encargos' | 'inventario' | 'global'>('encargos');

    // Stats de inventario actual (Stock inmovilizado)
    const invStats = useMemo(() => {
        return items.reduce((acc, i) => ({
            investment: acc.investment + (i.stock_quantity * i.unit_price),
            profit: acc.profit + (i.stock_quantity * (i.sale_price - i.unit_price))
        }), { investment: 0, profit: 0 });
    }, [items]);

    // Stats de ventas del POS (Ventas Rápidas) en el periodo seleccionado
    const posStats = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        if (period === 'week') startDate.setDate(now.getDate() - 7);
        else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setFullYear(now.getFullYear() - 1);

        const periodOrders = orders.filter((o) => new Date(o.order_date) >= startDate);
        const posOrders = periodOrders.filter(o => o.payments.some(p => p.reference_number?.startsWith('POS-')));

        return posOrders.reduce((acc, o) => ({
            revenue: acc.revenue + o.sale_price,
            cost: acc.cost + o.purchase_price,
            profit: acc.profit + o.profit
        }), { revenue: 0, cost: 0, profit: 0 });
    }, [orders, period]);

    // Removed duplicated manual sums since we now use economiaGlobal

    if (statsLoading || invLoading || ordersLoading || partnersLoading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Cabecera y Tabs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg shadow-md">
                            <Activity className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Estadísticas y Análisis</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Métricas de Negocio</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row">
                    <button 
                        onClick={() => setActiveTab('encargos')}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'encargos' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <ListTodo size={20} />
                        Encargos
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventario')}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'inventario' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Package size={20} />
                        Inventario
                    </button>
                    <button 
                        onClick={() => setActiveTab('global')}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'global' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Globe size={20} />
                        Global
                    </button>
                </div>
            </div>

            {/* Selector de periodo (Aplica para todas las pestañas) */}
            <div className="flex justify-end">
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
                    <button
                        onClick={() => setPeriod('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            period === 'week' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        Últimos 7 días
                    </button>
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            period === 'month' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        Último Mes
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            period === 'year' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        Último Año
                    </button>
                </div>
            </div>

            {/* === PESTAÑA: ENCARGOS === */}
            {activeTab === 'encargos' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">Ingresos por Encargos</p>
                                <TrendingUp className="text-emerald-500 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${(stats.totalRevenue - posStats.revenue).toFixed(2)}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2 py-1 rounded-lg">
                                Total vendido en encargos (Periodo)
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">Costo de Encargos</p>
                                <TrendingDown className="text-rose-500 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${(stats.totalInvestment - posStats.cost).toFixed(2)}</p>
                            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-500/10 inline-block px-2 py-1 rounded-lg">
                                Costo base de la mercancía por encargo
                            </p>
                        </div>

                        <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-6 shadow-sm text-white">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Ganancia de Encargos</p>
                                <DollarSign className="text-blue-400 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-blue-400">${(stats.totalProfit - posStats.profit).toFixed(2)}</p>
                            <p className="text-xs font-semibold text-blue-300 mt-2 bg-blue-900/50 inline-block px-2 py-1 rounded-lg">
                                Beneficio exclusivo de encargos
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* === PESTAÑA: INVENTARIO === */}
            {activeTab === 'inventario' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Estadísticas de Ventas (Histórico/Periodo) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm border-l-4 border-l-emerald-500">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">Ventas Realizadas de Stock</p>
                                <ShoppingBag className="text-emerald-500 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${posStats.revenue.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                                Dinero ingresado por ventas directas (Periodo)
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">Ganancia Real de Stock</p>
                                <DollarSign className="text-blue-500 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${posStats.profit.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                                Beneficio limpio de ventas directas (Periodo)
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas de Stock Físico (Futuro/Actual) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm border-l-4 border-l-slate-400">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">Inversión Stock Físico</p>
                                <Package className="text-slate-400 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-slate-700 dark:text-slate-300">${invStats.investment.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                                Capital inmovilizado en mercancía actual (Futuro)
                            </p>
                        </div>

                        <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-2xl p-6 shadow-sm text-white border-l-4 border-l-emerald-400">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Ganancia Estimada Stock</p>
                                <TrendingUp className="text-emerald-400 w-5 h-5" />
                            </div>
                            <p className="text-3xl font-black text-emerald-400">${invStats.profit.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-emerald-300 mt-2 bg-emerald-900/50 inline-block px-2 py-1 rounded-lg">
                                Retorno esperado al vender todo (Futuro)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* === PESTAÑA: GLOBAL === */}
            {activeTab === 'global' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Ganancias (Ingresos)</p>
                            <p className="text-3xl font-black text-emerald-500">${economiaGlobal.ganancia.total.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Ventas totales procesadas</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Cuentas por Cobrar</p>
                            <p className="text-3xl font-black text-amber-500">${globalStats.totalPending.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Dinero en la calle (Encargos)</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Inversión</p>
                            <p className="text-3xl font-black text-blue-500">${economiaGlobal.inversion.total.toFixed(2)}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Compras, gastos y aportes</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Balance General Neto</p>
                            <p className={`text-3xl font-black ${economiaGlobal.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                ${economiaGlobal.balance.toFixed(2)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Flujo de caja total del negocio</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex justify-between items-center">
                         <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-rose-500" /> Egresos Operativos y Retiros
                            </p>
                            <p className="text-2xl font-black text-rose-500">${financialExpenses.toFixed(2)}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Filtrado por</p>
                             <p className="text-sm font-black text-slate-700 dark:text-slate-300">{period === 'week' ? 'Últimos 7 días' : period === 'month' ? 'Último mes' : 'Último año'}</p>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
}