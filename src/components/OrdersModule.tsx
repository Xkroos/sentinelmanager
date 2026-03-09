import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, DollarSign, Search, Eye, CheckCircle2, History, ListTodo } from 'lucide-react';
import { OrderForm } from './OrderForm';
import { PaymentModal } from './PaymentModal';

// --- INTERFACES ---
interface Order {
    id: string;
    user_id: string;
    customer_name: string;
    product_description: string;
    purchase_price: number;
    sale_price: number;
    profit: number;
    order_date: string;
    merchandise_status: 'comprada' | 'por_comprar';
    status: 'pendiente' | 'pagado';
}

interface Payment {
    id: string;
    order_id: string;
    amount: number | string;
    payment_method: string;
    reference_number: string | null;
    payment_date: string;
    capture_url?: string;
}

interface OrderWithPayments extends Order {
    payments: Payment[];
}

interface ReferenceMatch {
    referenceNumber: string;
    count: number;
}

export function OrdersModule() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderWithPayments[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<OrderWithPayments[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editOrder, setEditOrder] = useState<Order | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Control de Vistas (Activos vs Historial)
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [referenceMatchInfo, setReferenceMatchInfo] = useState<ReferenceMatch | null>(null);

    useEffect(() => {
        if (user) loadOrders();
    }, [user]);

    useEffect(() => {
        filterOrders();
    }, [orders, searchTerm, viewMode]);

    const loadOrders = async () => {
        if (!user) return;

        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('order_date', { ascending: false });

        if (ordersData) {
            const ordersWithPayments = await Promise.all(
                ordersData.map(async (order: any) => {
                    const { data: payments } = await supabase
                        .from('payments')
                        .select('*')
                        .eq('order_id', order.id);

                    return {
                        ...order,
                        purchase_price: parseFloat(order.purchase_price.toString()),
                        sale_price: parseFloat(order.sale_price.toString()),
                        profit: parseFloat(order.profit.toString()),
                        merchandise_status: order.merchandise_status || 'por_comprar', 
                        payments: payments || [],
                    } as OrderWithPayments;
                })
            );
            setOrders(ordersWithPayments);
        }
    };

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
        if (!confirm('¿Estás seguro de eliminar este encargo?')) return;
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) loadOrders();
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

    return (
        <div className="space-y-6">
            {/* Totales Globales - Paleta Slate Original */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-slate-200 text-sm">Inversión {viewMode === 'active' ? 'Pendiente' : 'Recogida'}</p>
                        <p className="text-3xl font-bold">${globalTotals.totalInvestment.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-slate-200 text-sm">Ingreso Total</p>
                        <p className="text-3xl font-bold">${globalTotals.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-slate-200 text-sm">Ganancia Total</p>
                        <p className="text-3xl font-bold">${globalTotals.totalProfit.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Controles y Navegación de Pestañas */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ListTodo className="w-4 h-4" /> Activos ({countActive})
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                </div>
                
                <button
                    onClick={() => { setEditOrder(null); setShowForm(true); }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nuevo Encargo
                </button>
            </div>

            {/* Mensaje de Referencia Encontrada - Paleta Green Original */}
            {referenceMatchInfo && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                        <h4 className="text-green-900 font-bold">Referencia Encontrada: {referenceMatchInfo.referenceNumber}</h4>
                        <p className="text-green-700 text-sm">Mostrando {referenceMatchInfo.count} pedidos asociados a este pago.</p>
                    </div>
                </div>
            )}

            {/* Lista de Órdenes - Diseño de Tarjetas Original */}
            <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => {
                    const totalPaid = getTotalPaid(order.payments);
                    const remaining = order.sale_price - totalPaid;

                    const matchingPayments = order.payments.filter(p => 
                        searchTerm && p.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    return (
                        <div key={order.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 text-lg uppercase">{order.customer_name}</h3>
                                    <p className="text-slate-600 text-sm">{order.product_description}</p>
                                    <p className="text-slate-500 text-xs mt-1">
                                        {new Date(order.order_date).toLocaleDateString('es-VE')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {order.status === 'pendiente' && (
                                        <button onClick={() => setShowPaymentModal(order.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                            <DollarSign className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={() => { setEditOrder(order); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(order.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {matchingPayments.length > 0 && (
                                <div className="mb-3 p-2 bg-slate-50 border border-slate-100 rounded flex flex-wrap gap-3">
                                    {matchingPayments.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                                            <span className="font-medium">Ref: {p.reference_number}</span>
                                            {p.capture_url && (
                                                <a href={p.capture_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                    <Eye className="w-4 h-4" /> Ver Capture
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm pt-3 border-t border-slate-50">
                                <div>
                                    <p className="text-slate-500">Compra</p>
                                    <p className="font-semibold">${order.purchase_price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Venta</p>
                                    <p className="font-semibold">${order.sale_price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Ganancia</p>
                                    <p className="font-semibold text-green-600">${order.profit.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Abonado</p>
                                    <p className="font-semibold text-blue-600">${totalPaid.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Mercancía</p>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                        order.merchandise_status === 'comprada' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {order.merchandise_status === 'comprada' ? 'Comprada' : 'Por Comprar'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-slate-500">Pago</p>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                        order.status === 'pagado' ? 'bg-green-100 text-green-800' :
                                        remaining > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {order.status === 'pagado' ? 'Pagado' : `Debe $${remaining.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                        No hay encargos en esta sección
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
        </div>
    );
}