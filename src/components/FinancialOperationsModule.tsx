import React, { useState, useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useOrders } from '../hooks/useOrders';
import { useStatistics } from '../hooks/useStatistics';
import { useUI } from '../contexts/UIContext';
import { 
    BarChart3, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Users, Wallet, Image as ImageIcon, ChevronDown, ChevronRight, Clock 
} from 'lucide-react';

export function FinancialOperationsModule() {
    const { transactions, loading: financeLoading, error: financeError, addTransaction } = useFinance();
    const { orders, loading: ordersLoading, error: ordersError } = useOrders();
    const { economiaGlobal, globalStats, loading: statsLoading } = useStatistics();
    const { showToast } = useUI();

    const [activeTab, setActiveTab] = useState<'internas' | 'clientes'>('internas');
    const [showForm, setShowForm] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [expandedKPI, setExpandedKPI] = useState<'inversiones' | 'retiros' | 'balance' | 'cobrar' | null>(null);
    
    const [formData, setFormData] = useState({
        type: 'inversion' as 'inversion' | 'retiro',
        amount: '',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) return;
        
        try {
            await addTransaction(formData.type, parseFloat(formData.amount), formData.description);
            setFormData({ type: 'inversion', amount: '', description: '' });
            setShowForm(false);
            showToast('Operación registrada exitosamente', 'success');
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const totalInversiones = economiaGlobal.inversion.total;
    const totalGanancia = economiaGlobal.ganancia.total;
    const balance = economiaGlobal.balance;
    const totalPorCobrar = globalStats.totalPending;

    // --- Lógica de Pagos de Clientes ---
    const [paymentSearch, setPaymentSearch] = useState('');

    const filteredOrders = useMemo(() => {
        const searchTerm = paymentSearch.toLowerCase().trim();
        return orders.filter(o => {
            return o.customer_name.toLowerCase().includes(searchTerm) || 
                   o.product_description.toLowerCase().includes(searchTerm) ||
                   o.payments.some(p => p.reference_number && p.reference_number.toLowerCase().includes(searchTerm));
        }).map(o => {
            const paid = o.payments?.reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0) || 0;
            return {
                ...o,
                paidAmount: paid
            };
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [orders, paymentSearch]);



    if (statsLoading || financeLoading || ordersLoading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>;
    }

    if (financeError || ordersError) {
        return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{financeError || ordersError}</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header y Tabs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 p-2 rounded-lg shadow-md">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Operaciones Financieras</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Flujo de Efectivo</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row">
                    <button 
                        onClick={() => setActiveTab('internas')}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'internas' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Wallet size={20} />
                        Operaciones Internas
                    </button>
                    <button 
                        onClick={() => setActiveTab('clientes')}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'clientes' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Users size={20} />
                        Pagos de Clientes
                    </button>
                </div>
            </div>

            {/* === PESTAÑA: OPERACIONES INTERNAS === */}
            {activeTab === 'internas' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Nueva Operación
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div 
                            onClick={() => setExpandedKPI(expandedKPI === 'inversiones' ? null : 'inversiones')}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm cursor-pointer hover:border-emerald-500 transition-all"
                        >
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1"><ArrowDownRight className="w-4 h-4 text-emerald-500" /> Total Inversión</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedKPI === 'inversiones' ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${totalInversiones.toFixed(2)}</p>
                            
                            {expandedKPI === 'inversiones' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Costos de Encargos:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.costoEncargos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Costo de Inventario:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.costoInventario.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Pagos Operativos / Gastos:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.pagosOperativos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Inyecciones Socios:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.aportesSocios.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Inversiones Finanzas:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.inversionesFinanzas.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Retiros Socios:</span>
                                        <span className="font-bold">${economiaGlobal.inversion.retirosSocios.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div 
                            onClick={() => setExpandedKPI(expandedKPI === 'retiros' ? null : 'retiros')}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm cursor-pointer hover:border-emerald-500 transition-all"
                        >
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500" /> Total Ganancia (Ingresos)</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedKPI === 'retiros' ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${totalGanancia.toFixed(2)}</p>

                            {expandedKPI === 'retiros' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Ventas por Encargos:</span>
                                        <span className="font-bold">${economiaGlobal.ganancia.ventasEncargos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Ventas Inventario (POS):</span>
                                        <span className="font-bold">${economiaGlobal.ganancia.ventasInventario.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div 
                            onClick={() => setExpandedKPI(expandedKPI === 'balance' ? null : 'balance')}
                            className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 p-6 rounded-2xl shadow-sm text-white cursor-pointer hover:border-amber-400 transition-all"
                        >
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-amber-400" /> Balance General</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedKPI === 'balance' ? 'rotate-180' : ''}`} />
                            </p>
                            <p className={`text-3xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${balance.toFixed(2)}
                            </p>
                            
                            {expandedKPI === 'balance' && (
                                <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-slate-300">
                                        <span>Total Ganancia (Ingresos):</span>
                                        <span className="font-bold text-emerald-400">+${totalGanancia.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span>Total Inversión (Compras/Gastos):</span>
                                        <span className="font-bold text-rose-400">-${totalInversiones.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div 
                            onClick={() => setExpandedKPI(expandedKPI === 'cobrar' ? null : 'cobrar')}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm cursor-pointer hover:border-indigo-500 transition-all"
                        >
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-indigo-500" /> Total por Cobrar</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedKPI === 'cobrar' ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${totalPorCobrar.toFixed(2)}</p>

                            {expandedKPI === 'cobrar' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Encargos pendientes:</span>
                                        <span className="font-bold">${totalPorCobrar.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Historial de Operaciones */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Historial de Operaciones Internas</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="p-4 flex flex-wrap sm:flex-nowrap items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`p-3 rounded-xl flex-shrink-0 ${
                                            transaction.type === 'inversion' 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {transaction.type === 'inversion' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{transaction.description}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString('es-VE')}
                                                </p>
                                            </div>
                                            <div className="hidden sm:block">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                                                    transaction.type === 'inversion' 
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                                                }`}>
                                                    {transaction.type === 'inversion' ? 'Inversión' : 'Retiro / Personal'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`font-black font-mono text-lg mt-2 sm:mt-0 ${
                                        transaction.type === 'inversion' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {transaction.type === 'inversion' ? '+' : '-'}${parseFloat(transaction.amount.toString()).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    No hay operaciones registradas.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* === PESTAÑA: PAGOS DE CLIENTES === */}
            {activeTab === 'clientes' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Wallet className="w-4 h-4 text-emerald-500" /> Total Cobrado Histórico
                            </p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">${globalStats.totalPaid.toFixed(2)}</p>
                        </div>
                        <input 
                            type="text"
                            placeholder="Buscar cliente, producto o referencia..."
                            className="w-full sm:w-80 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-800 dark:bg-slate-950 text-white">
                                        <th className="p-4 w-12 text-center"></th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Cliente</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Producto</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700 text-right">Monto Total</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-right">Total Abonado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                                    {filteredOrders.map((order, idx) => {
                                        const isExpanded = expandedOrder === order.id;
                                        return (
                                            <React.Fragment key={order.id}>
                                                {/* Fila Principal */}
                                                <tr 
                                                    className={`cursor-pointer ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'} hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isExpanded ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}
                                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                >
                                                    <td className="p-4 text-slate-400 flex justify-center">
                                                        {isExpanded ? <ChevronDown size={20} className="text-emerald-500" /> : <ChevronRight size={20} />}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                                                        {order.customer_name}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                                                        {order.product_description}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-right">
                                                        ${order.sale_price.toFixed(2)}
                                                    </td>
                                                    <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-right">
                                                        ${order.paidAmount.toFixed(2)}
                                                    </td>
                                                </tr>
                                                
                                                {/* Sub-tabla / Acordeón */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50 dark:bg-slate-950/80">
                                                        <td colSpan={5} className="p-0 border-b-2 border-emerald-500">
                                                            <div className="p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
                                                                <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                                                    <Wallet size={14}/> Historial de Pagos y Abonos
                                                                </h4>
                                                                {order.payments.length > 0 ? (
                                                                    <div className="grid gap-3">
                                                                        {order.payments.map((p) => (
                                                                            <div key={p.id} className="flex flex-wrap items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                                                                <div className="flex gap-6 items-center flex-wrap">
                                                                                    <div>
                                                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Fecha</p>
                                                                                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(p.payment_date).toLocaleDateString()}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Referencia Bancaria</p>
                                                                                        <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{p.reference_number || 'Efectivo / N/A'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                                                                    {p.payment_image_url ? (
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setSelectedImage(p.payment_image_url);
                                                                                            }}
                                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                                                                        >
                                                                                            <ImageIcon size={14} /> Ver Capture
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Sin Capture</span>
                                                                                    )}
                                                                                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-1.5 rounded-lg">
                                                                                        +${parseFloat(p.amount.toString()).toFixed(2)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                                                                        <p className="text-sm text-slate-500 font-medium">Este cliente aún no ha registrado ningún abono.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                No se encontraron clientes o pagos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nueva Operación Interna */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Registrar Operación</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Operación</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'inversion' })}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                            formData.type === 'inversion' 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20' 
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        Inversión
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'retiro' })}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                            formData.type === 'retiro' 
                                                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20' 
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        Retiro
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white outline-none transition-all"
                                    placeholder="Ej: Inyección de capital, Pago a proveedor..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para ver imagen/capture */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <img 
                        src={selectedImage} 
                        alt="Capture de pago" 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 text-white hover:text-rose-400 bg-black/50 hover:bg-black/80 p-2 rounded-full transition-colors"
                    >
                        <Plus className="w-8 h-8 rotate-45" />
                    </button>
                </div>
            )}
        </div>
    );
}