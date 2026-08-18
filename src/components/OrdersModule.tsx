import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Search, Eye, CheckCircle2, History, ListTodo, ShoppingBag } from 'lucide-react';
import { OrderForm } from './OrderForm';
import { PaymentModal } from './PaymentModal';
import { AddMerchandiseModal } from './AddMerchandiseModal';
import { useUI } from '../contexts/UIContext';
import { Order, OrderWithPayments, Payment } from '../lib/supabase';
import { useOrders } from '../hooks/useOrders';

interface ReferenceMatch {
    referenceNumber: string;
    count: number;
}

export function OrdersModule() {
    const { orders, loading, error, loadOrders, deleteOrder } = useOrders();
    const { showConfirm } = useUI();
    const [filteredOrders, setFilteredOrders] = useState<OrderWithPayments[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editOrder, setEditOrder] = useState<Order | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
    const [showAddMerchandiseModal, setShowAddMerchandiseModal] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Control de Vistas (Activos vs Historial)
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [referenceMatchInfo, setReferenceMatchInfo] = useState<ReferenceMatch | null>(null);

    useEffect(() => {
        filterOrders();
    }, [orders, searchTerm, viewMode]);

    const filterOrders = () => {
        let result = [...orders];
        const lowerCaseSearch = searchTerm.toLowerCase().trim();
        setReferenceMatchInfo(null);

        // 1. Filtrar por Pestaña
        if (viewMode === 'active') {
            result = result.filter(o => o.status === 'pendiente');
        } else {
            result = result.filter(o => o.status === 'pagado');
        }

        // 2. Filtrar por Búsqueda
        if (lowerCaseSearch) {
            result = result.filter((order) => {
                const nameMatch = order.customer_name.toLowerCase().includes(lowerCaseSearch);
                const descMatch = order.product_description.toLowerCase().includes(lowerCaseSearch);
                const refMatch = order.payments.some(p => 
                    p.reference_number && p.reference_number.toLowerCase().includes(lowerCaseSearch)
                );
                return nameMatch || descMatch || refMatch;
            });

            const anyRefMatched = orders.some(o => o.payments.some(p => p.reference_number?.toLowerCase() === lowerCaseSearch));
            if (anyRefMatched) {
                setReferenceMatchInfo({
                    referenceNumber: searchTerm,
                    count: result.length
                });
            }
        }

        setFilteredOrders(result);
    };

    const handleDelete = async (id: string) => {
        if (!(await showConfirm('¿Estás seguro de eliminar este encargo?'))) return;
        await deleteOrder(id);
    };

    const getTotalPaid = (payments: Payment[]) => {
        return payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    };

    const countActive = orders.filter(o => o.status === 'pendiente').length;
    const countHistory = orders.filter(o => o.status === 'pagado').length;

    const globalTotals = filteredOrders.reduce(
        (acc, order) => ({
            totalInvestment: acc.totalInvestment + order.purchase_price,
            totalRevenue: acc.totalRevenue + order.sale_price,
            totalProfit: acc.totalProfit + order.profit,
        }),
        { totalInvestment: 0, totalRevenue: 0, totalProfit: 0 }
    );

    if (loading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>;
    }

    if (error) {
        return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Totales Globales */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-slate-300 text-sm font-semibold tracking-wide uppercase">Inversión {viewMode === 'active' ? 'Pendiente' : 'Recogida'}</p>
                        <p className="text-3xl font-black">${globalTotals.totalInvestment.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-slate-300 text-sm font-semibold tracking-wide uppercase">Ingreso Total</p>
                        <p className="text-3xl font-black">${globalTotals.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">Ganancia Total</p>
                        <p className="text-3xl font-black text-emerald-400">${globalTotals.totalProfit.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Controles y Navegación de Pestañas */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            viewMode === 'active' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <ListTodo className="w-4 h-4" /> Activos ({countActive})
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            viewMode === 'history' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <History className="w-4 h-4" /> Historial ({countHistory})
                    </button>
                </div>

                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar cliente, descripción o referencia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm outline-none"
                    />
                </div>
                
                <button
                    onClick={() => { setEditOrder(null); setShowForm(true); }}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Nuevo Encargo
                </button>
            </div>

            {/* Mensaje de Referencia Encontrada */}
            {referenceMatchInfo && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <h4 className="text-emerald-900 dark:text-emerald-200 font-bold">Referencia Encontrada: {referenceMatchInfo.referenceNumber}</h4>
                        <p className="text-emerald-700 dark:text-emerald-400 text-sm">Mostrando {referenceMatchInfo.count} pedidos asociados a este pago.</p>
                    </div>
                </div>
            )}

            {/* Lista de Órdenes */}
            <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => {
                    const totalPaid = getTotalPaid(order.payments);
                    const remaining = order.sale_price - totalPaid;

                    const matchingPayments = order.payments.filter(p => 
                        searchTerm && p.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    return (
                        <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all group">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                                <div className="flex-1">
                                    <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tight">{order.customer_name}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{order.product_description}</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">
                                        {new Date(order.order_date).toLocaleDateString('es-VE')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {order.status === 'pendiente' && (
                                        <>
                                            <button onClick={() => setShowAddMerchandiseModal(order)} className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors" title="Agregar mercancía">
                                                <ShoppingBag className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setShowPaymentModal(order.id)} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors" title="Registrar Abono">
                                                <DollarSign className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => { setEditOrder(order); setShowForm(true); }} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(order.id)} className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {matchingPayments.length > 0 && (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl flex flex-wrap gap-3">
                                    {matchingPayments.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <span className="font-semibold">Ref: {p.reference_number}</span>
                                            {p.payment_image_url && (
                                                <a href={p.payment_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                                    <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Ver Capture</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Compra</p>
                                    <p className="font-black text-slate-700 dark:text-slate-200">${order.purchase_price.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Venta</p>
                                    <p className="font-black text-slate-700 dark:text-slate-200">${order.sale_price.toFixed(2)}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl">
                                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Ganancia</p>
                                    <p className="font-black text-emerald-700 dark:text-emerald-300">${order.profit.toFixed(2)}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl">
                                    <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Abonado</p>
                                    <p className="font-black text-blue-700 dark:text-blue-300">${totalPaid.toFixed(2)}</p>
                                </div>
                                <div className="p-3">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mercancía</p>
                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                        order.merchandise_status === 'comprada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                    }`}>
                                        {order.merchandise_status === 'comprada' ? 'Comprada' : 'Por Comprar'}
                                    </span>
                                </div>
                                <div className="p-3">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Estado</p>
                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                        order.status === 'pagado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                        remaining > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                    }`}>
                                        {order.status === 'pagado' ? 'Pagado' : `Debe $${remaining.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold">No hay encargos en esta sección</p>
                    </div>
                )}
            </div>

            {/* Modales */}
            {showForm && (
                <OrderForm 
                    onClose={() => { setShowForm(false); setEditOrder(null); }} 
                    onSuccess={loadOrders} 
                    editOrder={editOrder} 
                />
            )}
            {showPaymentModal && (
                <PaymentModal
                    orderId={showPaymentModal}
                    orderTotal={orders.find(o => o.id === showPaymentModal)?.sale_price || 0}
                    customerName={orders.find(o => o.id === showPaymentModal)?.customer_name || ''}
                    onClose={() => setShowPaymentModal(null)}
                    onSuccess={loadOrders}
                />
            )}
            {showAddMerchandiseModal && (
                <AddMerchandiseModal
                    order={showAddMerchandiseModal}
                    onClose={() => setShowAddMerchandiseModal(null)}
                    onSuccess={loadOrders}
                />
            )}
        </div>
    );
}