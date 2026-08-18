import { useState } from 'react';
import { useStatistics } from '../hooks/useStatistics';
import { useOrders } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import { 
    Wallet, 
    TrendingUp, 
    ShoppingBag, 
    AlertTriangle,
    ArrowRight,
    X
} from 'lucide-react';
import { Tab } from './Layout/Sidebar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardHomeProps {
    onNavigate: (tab: Tab) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
    const [activeModal, setActiveModal] = useState<'balance' | 'pending' | 'receivables' | null>(null);
    const { globalStats, economiaGlobal, loading: statsLoading } = useStatistics('month');
    const { items } = useInventory();
    const { orders } = useOrders();

    const lowStockItems = items.filter(item => item.stock_quantity > 0 && item.stock_quantity <= 5);
    const outOfStockItems = items.filter(item => item.stock_quantity === 0);
    const pendingOrders = orders.filter(order => order.status === 'pendiente');

    const loading = statsLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Cabecera */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">Resumen General</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Un vistazo rápido a cómo va tu negocio hoy.
                </p>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
                    onClick={() => setActiveModal('balance')}
                >
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Balance General</p>
                        <h3 className={`text-3xl font-black ${economiaGlobal.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ${economiaGlobal.balance.toFixed(2)}
                        </h3>
                    </div>
                    <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 dark:text-slate-800/50 group-hover:scale-110 transition-transform duration-500" />
                    <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                        Ver detalles <ArrowRight className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => setActiveModal('pending')}>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Encargos Pendientes</p>
                            <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">{pendingOrders.length}</h3>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-xl">
                            <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                        Ver detalles <ArrowRight className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => setActiveModal('receivables')}>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Por Cobrar</p>
                            <h3 className="text-3xl font-black text-amber-500 dark:text-amber-400">${globalStats.totalPending.toFixed(2)}</h3>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                        Ver detalles <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Sección de Alertas y Novedades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Alertas de Inventario */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            Alertas de Inventario
                        </h3>
                        <button onClick={() => onNavigate('inventory')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            Ver inventario
                        </button>
                    </div>

                    <div className="space-y-3">
                        {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Todo el inventario está en niveles óptimos.</p>
                        )}
                        
                        {outOfStockItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                                <div>
                                    <p className="font-semibold text-rose-900 dark:text-rose-200">{item.name}</p>
                                    <p className="text-xs text-rose-600 dark:text-rose-400">Sin stock disponible</p>
                                </div>
                                <span className="px-2 py-1 bg-rose-200 dark:bg-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-lg">AGOTADO</span>
                            </div>
                        ))}

                        {lowStockItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                                <div>
                                    <p className="font-semibold text-amber-900 dark:text-amber-200">{item.name}</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Stock bajo crítico</p>
                                </div>
                                <span className="px-2 py-1 bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-lg">Quedan {item.stock_quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Encargos Recientes */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-emerald-500" />
                            Últimos Encargos
                        </h3>
                        <button onClick={() => onNavigate('orders')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            Ver todos
                        </button>
                    </div>

                    <div className="space-y-3">
                        {orders.slice(0, 5).map(order => {
                            const isPaid = order.status === 'pagado';
                            return (
                                <div key={order.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group cursor-pointer" onClick={() => onNavigate('orders')}>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{order.customer_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(order.order_date), 'dd MMM yyyy', { locale: es })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-700 dark:text-slate-300">${order.sale_price.toFixed(2)}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {isPaid ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {orders.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay encargos recientes.</p>
                        )}
                    </div>
                </div>

            </div>

            {/* Modals */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {activeModal === 'balance' && 'Detalle del Balance General'}
                                {activeModal === 'pending' && 'Encargos Pendientes'}
                                {activeModal === 'receivables' && 'Detalle por Cobrar'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar">
                            {activeModal === 'balance' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                        <span className="text-emerald-900 dark:text-emerald-200 font-medium">Ventas por Encargos</span>
                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">+ ${economiaGlobal.ganancia.ventasEncargos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                        <span className="text-emerald-900 dark:text-emerald-200 font-medium">Ventas de Inventario (POS)</span>
                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">+ ${economiaGlobal.ganancia.ventasInventario.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Costo de Encargos</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.costoEncargos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Costo de Inventario</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.costoInventario.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Pagos Operativos / Gastos</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.pagosOperativos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Inyecciones de Socios (Balance)</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.aportesSocios.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Inversiones de Finanzas</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.inversionesFinanzas.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                        <span className="text-rose-900 dark:text-rose-200 font-medium">Retiros de Socios</span>
                                        <span className="text-rose-700 dark:text-rose-400 font-bold">- ${economiaGlobal.inversion.retirosSocios.toFixed(2)}</span>
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-700 my-4 pt-4 flex justify-between items-center px-3">
                                        <span className="text-lg font-black text-slate-800 dark:text-white">Total Balance</span>
                                        <span className={`text-xl font-black ${economiaGlobal.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            ${economiaGlobal.balance.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {activeModal === 'pending' && (
                                <div className="space-y-3">
                                    {pendingOrders.length === 0 ? (
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay encargos pendientes.</p>
                                    ) : (
                                        pendingOrders.map(order => (
                                            <div key={order.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{order.customer_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(order.order_date), 'dd MMM yyyy', { locale: es })}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-700 dark:text-slate-300">${order.sale_price.toFixed(2)}</p>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Pendiente</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeModal === 'receivables' && (
                                <div className="space-y-3">
                                    {orders.filter(o => o.status === 'pendiente' && (o.sale_price - o.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0)) > 0).length === 0 ? (
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay montos por cobrar.</p>
                                    ) : (
                                        orders.filter(o => o.status === 'pendiente' && (o.sale_price - o.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0)) > 0).map(order => {
                                            const paid = order.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
                                            const remaining = order.sale_price - paid;
                                            return (
                                                <div key={order.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white">{order.customer_name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total: ${order.sale_price.toFixed(2)} • Pagado: ${paid.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-amber-600 dark:text-amber-400">${remaining.toFixed(2)}</p>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Restante</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
