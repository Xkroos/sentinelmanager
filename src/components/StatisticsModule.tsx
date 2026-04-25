import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    TrendingUp, DollarSign, ShoppingBag, Calendar, X, 
    ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, 
    User, Clock, Calculator
} from 'lucide-react'; 

import { useExchangeRate } from '../hooks/useExchangeRate'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; 

export function StatisticsModule() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [financialExpenses, setFinancialExpenses] = useState<number>(0); 
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false); 
    const { rate: exchangeRate } = useExchangeRate();
    const navigate = useNavigate(); 

    const getDateRange = useCallback(() => { 
        const now = new Date(); 
        let startDate = new Date();
        if (period === 'week') startDate.setDate(now.getDate() - 7);
        else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setFullYear(now.getFullYear() - 1);
        return startDate;
    }, [period]);

    useEffect(() => {
        if (user) {
            loadOrders();
            loadFinancialData();
        }
    }, [user, period]);

    const loadOrders = async () => { 
        if (!user) return;
        const { data: ordersData } = await supabase.from('orders').select('*').eq('user_id', user.id);
        if (ordersData) {
            const withPayments = await Promise.all(
                ordersData.map(async (order) => {
                    const { data: payments } = await supabase.from('payments').select('*').eq('order_id', order.id);
                    return { ...order, payments: payments || [] };
                })
            );
            setOrders(withPayments);
        }
    };

    const loadFinancialData = async () => {
        if (!user) return;
        const startDate = getDateRange().toISOString();

        // 1. Intentamos traer todos los campos para no fallar por nombre de columna
        const { data, error } = await supabase
            .from('financial_operations') 
            .select('*') 
            .eq('user_id', user.id)
            .gte('created_at', startDate);

        if (error) {
            console.error("Error en Supabase:", error);
            return;
        }

        if (data && data.length > 0) {
            const total = data.reduce((sum, item) => {
                // Buscamos el valor numérico en 'amount' o 'monto'
                const value = parseFloat(item.amount || item.monto || 0);
                
                // Buscamos el tipo en 'type' o 'tipo'
                const rawType = (item.type || item.tipo || "").toLowerCase();

                // Sumamos si el tipo contiene "invers" (para que coincida con tu "Inversión Total")
                // También incluimos "retir" para que sume los $43.00 que viste en tu captura
                if (rawType.includes('invers') || rawType.includes('retir') || rawType.includes('egres')) {
                    return sum + value;
                }
                return sum;
            }, 0);
            
            setFinancialExpenses(total);
        } else {
            setFinancialExpenses(0);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => new Date(o.order_date) >= getDateRange());
    }, [orders, period]);

    const stats = useMemo(() => {
        return filteredOrders.reduce((acc, order) => { 
            const inv = parseFloat(order.purchase_price || 0);
            const rev = parseFloat(order.sale_price || 0);
            const prof = parseFloat(order.profit || 0);
            const paid = order.payments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0);
            return { 
                totalRevenue: acc.totalRevenue + rev, 
                totalInvestment: acc.totalInvestment + inv, 
                totalProfit: acc.totalProfit + prof, 
                totalPaid: acc.totalPaid + paid, 
            };
        }, { totalRevenue: 0, totalInvestment: 0, totalProfit: 0, totalPaid: 0 });
    }, [filteredOrders]);

    const inversionProductos = stats.totalInvestment;
    const gastosOperativos = financialExpenses;
    const inversionTotalSumatoria = inversionProductos + gastosOperativos;

    return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Estadísticas Financieras</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {['week', 'month', 'year'].map((p) => (
                    <button key={p} onClick={() => setPeriod(p as any)} className={`px-3 py-1.5 text-xs rounded-md transition-all ${period === p ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>
                        {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                    </button>
                ))}
            </div>
        </div>

        {/* INTERFAZ ORIGINAL CON LAS 3 CUENTAS REQUERIDAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"> 
            
            {/* CUENTA 1: INVERSIÓN PRODUCTOS */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg"><ShoppingBag className="w-5 h-5 text-blue-600" /></div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Inversión Productos</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">${inversionProductos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* CUENTA 2: GASTOS OPERATIVOS (Sincronizado con Operaciones) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Gastos Operativos</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">${gastosOperativos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* CUENTA 3: SUMATORIA TOTAL */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-md text-white">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-700 rounded-lg text-yellow-400"><Calculator className="w-5 h-5" /></div>
                    <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Inversión Total</p>
                </div>
                <p className="text-2xl font-bold">${inversionTotalSumatoria.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                {exchangeRate > 0 && (
                    <p className="text-[10px] text-blue-400 mt-1 font-bold">Bs. {(inversionTotalSumatoria * exchangeRate).toFixed(2)}</p>
                )}
            </div>

            {/* MÉTRICAS SECUNDARIAS */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><TrendingUp className="w-5 h-5" /></div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ganancia Bruta</p>
                </div>
                <p className="text-xl font-bold text-slate-800">${stats.totalProfit.toFixed(2)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><DollarSign className="w-5 h-5" /></div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas Totales</p>
                </div>
                <p className="text-xl font-bold text-slate-800">${stats.totalRevenue.toFixed(2)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Efectivo Cobrado</p>
                </div>
                <p className="text-xl font-bold text-slate-800">${stats.totalPaid.toFixed(2)}</p>
            </div>
        </div>

        <button onClick={() => setIsCalendarOpen(true)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" /> Abrir Control de Abonos
        </button>
    </div>
    );
}