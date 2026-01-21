import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Zap, Save, Clock } from 'lucide-react';
// Asegúrate de que FinancialTransaction esté definido en '../lib/supabase'
import { Order, Payment, FinancialTransaction } from '../lib/supabase';

// INTERFACES (Asegúrate de que 'Order' use 'number' para precios)
interface OrderWithPayments extends Order {
    payments: Payment[];
}

export function FinancialOperationsModule() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderWithPayments[]>([]);

    // 💡 ESTADO: Lista para el log de transacciones
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

    // Estados para los datos guardados
    const [withdrawn, setWithdrawn] = useState(0);
    const [investedAmount, setInvestedAmount] = useState(0);

    // Estados temporales para los inputs
    const [tempWithdrawn, setTempWithdrawn] = useState('');
    const [tempInvestedAmount, setTempInvestedAmount] = useState('');

    // Estados para las descripciones
    const [investDescription, setInvestDescription] = useState('');
    const [withdrawDescription, setWithdrawDescription] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // Para el estado del botón

    // --- FUNCIONES DE CARGA ---

    const loadFinancialLog = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('user_id', user.id)
            // Ordena por fecha para que el más reciente aparezca primero
            .order('transaction_date', { ascending: false });

        if (error) {
            console.error("Error cargando el log de transacciones:", error);
            return;
        }

        // Aplicamos filtro: Eliminamos transacciones con amount <= 0
        const filteredData = (data as FinancialTransaction[]).filter(t =>
            parseFloat(t.amount.toString()) > 0
        );
        setTransactions(filteredData);
    }, [user]);


    const loadAccumulatedTotals = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('type, amount')
            .eq('user_id', user.id);

        if (error) {
            console.error("Error loading totals:", error);
            return;
        }

        let totalInvested = 0;
        let totalWithdrawn = 0;

        data.forEach((transaction: Pick<FinancialTransaction, 'type' | 'amount'>) => {
            // Conversión segura de precio (asumiendo que viene como string o number)
            const amountValue = parseFloat(transaction.amount.toString()); 
            
            if (amountValue > 0) {
                if (transaction.type === 'inversion') {
                    totalInvested += amountValue;
                } else if (transaction.type === 'retiro') {
                    totalWithdrawn += amountValue;
                }
            }
        });

        setInvestedAmount(totalInvested);
        setWithdrawn(totalWithdrawn);
    }, [user]);


    const loadOrders = useCallback(async () => {
        if (!user) return;
        
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            // Mantener orden por fecha para carga inicial, la ordenación alfabética se hará en el useMemo
            .order('order_date', { ascending: false }); 

        if (ordersData) {
            const ordersWithPayments = await Promise.all(
                ordersData.map(async (order: any) => { // Usar 'any' temporalmente para la data cruda
                    const { data: payments } = await supabase
                        .from('payments')
                        .select('*')
                        .eq('order_id', order.id);

                    return {
                        ...order,
                        // Conversión de precios para asegurar el tipo 'number' si vienen de la BD como string
                        purchase_price: parseFloat(order.purchase_price.toString()),
                        sale_price: parseFloat(order.sale_price.toString()),
                        profit: parseFloat(order.profit.toString()),
                        payments: payments || [],
                    } as OrderWithPayments;
                })
            );

            setOrders(ordersWithPayments);
        }
    }, [user]);


    // Carga Inicial
    useEffect(() => {
        if (user) {
            loadOrders();
            loadAccumulatedTotals();
            loadFinancialLog();
        }
    }, [user, loadOrders, loadAccumulatedTotals, loadFinancialLog]);


    const getTotalPaid = (payments: Payment[]) => {
        return payments.reduce((sum, payment) => sum + (parseFloat(payment.amount.toString()) > 0 ? parseFloat(payment.amount.toString()) : 0), 0);
    };

    const financialSummary = orders.reduce(
        (acc, order) => {
            // Aseguramos que los valores base de las órdenes sean positivos
            const investment = order.purchase_price > 0 ? order.purchase_price : 0;
            const revenue = order.sale_price > 0 ? order.sale_price : 0;
            const totalPaid = getTotalPaid(order.payments);
            const remaining = revenue - totalPaid;

            return {
                totalPaid: acc.totalPaid + totalPaid,
                totalPending: acc.totalPending + (order.status === 'pendiente' && remaining > 0 ? remaining : 0),
                totalInvested: acc.totalInvested + investment,
                totalRevenue: acc.totalRevenue + revenue,
            };
        },
        { totalPaid: 0, totalPending: 0, totalInvested: 0, totalRevenue: 0 }
    );

    // --- FUNCIÓN PARA GUARDAR CAMBIOS ---
    const handleApplyChanges = useCallback(async (type: 'invest' | 'withdraw') => {
        if (!user) return;

        setIsProcessing(true);
        const amountStr = type === 'invest' ? tempInvestedAmount : tempWithdrawn;
        const amount = parseFloat(amountStr.toString() || '0');
        const description = type === 'invest' ? investDescription : withdrawDescription;

        try {
            if (amount <= 0 || !description.trim()) {
                alert('El monto debe ser positivo y se requiere una descripción.');
                setIsProcessing(false);
                return;
            }

            const { error } = await supabase
                .from('financial_transactions')
                .insert({
                    user_id: user.id,
                    amount: amount,
                    description: description.trim(),
                    type: type === 'invest' ? 'inversion' : 'retiro',
                });

            if (error) throw error;

            if (type === 'invest') {
                setInvestedAmount(prev => prev + amount);
                setTempInvestedAmount('');
                setInvestDescription('');
            } else {
                setWithdrawn(prev => prev + amount);
                setTempWithdrawn('');
                setWithdrawDescription('');
            }

            loadAccumulatedTotals();
            loadFinancialLog();

            alert(`${type === 'invest' ? 'Inversión' : 'Retiro'} de $${amount.toFixed(2)} guardado permanentemente.`);


        } catch (error) {
            console.error('Error al aplicar cambios:', error);
            alert('Ocurrió un error al guardar los cambios en la base de datos.');
        } finally {
            setIsProcessing(false);
        }
    }, [tempInvestedAmount, tempWithdrawn, investDescription, withdrawDescription, user, loadAccumulatedTotals, loadFinancialLog]);

    // Cálculo del Efectivo Neto (Liquidez Real)
    const netCashFlow = financialSummary.totalPaid - investedAmount - withdrawn;
    const currentBalance = financialSummary.totalPaid;

    // --- CÁLCULO Y REPARACIÓN DEL GRÁFICO (useMemo) ---
    const chartData = useMemo(() => ([
        {
            label: 'Ingresos Pagados',
            value: financialSummary.totalPaid,
            color: '#10b981', // Verde
        },
        {
            label: 'Ingresos Pendientes',
            value: financialSummary.totalPending,
            color: '#f59e0b', // Amarillo
        },
        {
            label: 'Inversión Total',
            value: investedAmount,
            color: '#ef4444', // Rojo
        },
        {
            label: 'Retirado Total',
            value: withdrawn,
            color: '#6366f1', // Índigo
        },
    ].filter(item => item.value > 0)), [financialSummary.totalPaid, financialSummary.totalPending, investedAmount, withdrawn]);

    const totalChartValue = chartData.reduce((sum, item) => sum + item.value, 0) || 1;

    const getConicGradientStyle = useCallback(() => {
        if (totalChartValue === 0) return { background: 'white' };

        let gradientString = 'conic-gradient(';
        let startPercent = 0;

        chartData.forEach((item, index) => {
            const percentage = (item.value / totalChartValue) * 100;
            const endPercent = startPercent + percentage;

            gradientString += `${item.color} ${startPercent}% ${endPercent}%${index === chartData.length - 1 ? '' : ', '}`;

            startPercent = endPercent;
        });

        gradientString += ')';
        return {
            background: gradientString,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        };
    }, [chartData, totalChartValue]);
    // --- FIN GRÁFICO ---


    // 💡 BLOQUE AÑADIDO: ORDENAR LAS ÓRDENES POR NOMBRE DEL CLIENTE (useMemo)
    const sortedOrders = useMemo(() => {
        // Utilizamos una copia para no mutar el estado original
        return [...orders].sort((a, b) => {
            // Aseguramos la comparación sin distinción entre mayúsculas y minúsculas
            const nameA = a.customer_name.toLowerCase();
            const nameB = b.customer_name.toLowerCase();

            if (nameA < nameB) {
                return -1; // 'a' viene antes que 'b'
            }
            if (nameA > nameB) {
                return 1; // 'a' viene después de 'b'
            }
            return 0; // Son iguales
        });
    }, [orders]);


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Operaciones Financieras</h2>

            {/* 💳 TARJETA DESTACADA: EFECTIVO NETO */}
            <div className={`bg-white border border-slate-200 rounded-lg p-6 shadow-md ${
                netCashFlow >= 0 ? 'border-green-400' : 'border-red-400'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${
                            netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            <Zap className={`w-6 h-6 ${
                                netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Efectivo Neto</p>
                            <p className={`text-3xl font-bold ${
                                netCashFlow >= 0 ? 'text-green-800' : 'text-red-800'
                                }`}>
                                ${netCashFlow.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">
                            Fórmula: Pagado - Invertido - Retirado
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ingresos Pagados */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-sm text-slate-600">Dinero Pagado (Ingreso Bruto)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        ${financialSummary.totalPaid.toFixed(2)}
                    </p>
                </div>

                {/* Por Cobrar */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-yellow-600" />
                        </div>
                        <span className="text-sm text-slate-600">Por Cobrar</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        ${financialSummary.totalPending.toFixed(2)}
                    </p>
                </div>

                {/* 🟥 INVERSIÓN: CON INPUTS Y BOTÓN */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                        <span className="text-sm text-slate-600">Registrar Nueva Inversión</span>
                    </div>

                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto a Invertir</label>
                    <input
                        type="number"
                        step="0.01"
                        value={tempInvestedAmount}
                        onChange={(e) => setTempInvestedAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-lg font-bold mb-3"
                        placeholder="$0.00"
                    />

                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                    <input
                        type="text"
                        value={investDescription}
                        onChange={(e) => setInvestDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm mb-4"
                        placeholder="Razón de la inversión"
                    />

                    <button
                        onClick={() => handleApplyChanges('invest')}
                        disabled={isProcessing || parseFloat(tempInvestedAmount.toString() || '0') <= 0 || !investDescription.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-150 disabled:bg-slate-400"
                    >
                        <Save className="w-5 h-5" />
                        {isProcessing ? 'Guardando...' : 'Aplicar Inversión'}
                    </button>
                </div>

                {/* 🟦 RETIRO: CON INPUTS Y BOTÓN */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Wallet className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-sm text-slate-600">Registrar Nuevo Retiro</span>
                    </div>

                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto a Retirar</label>
                    <input
                        type="number"
                        step="0.01"
                        value={tempWithdrawn}
                        onChange={(e) => setTempWithdrawn(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-lg font-bold mb-3"
                        placeholder="$0.00"
                    />

                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                    <input
                        type="text"
                        value={withdrawDescription}
                        onChange={(e) => setWithdrawDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm mb-4"
                        placeholder="Razón del retiro"
                    />

                    <button
                        onClick={() => handleApplyChanges('withdraw')}
                        disabled={isProcessing || parseFloat(tempWithdrawn.toString() || '0') <= 0 || !withdrawDescription.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition duration-150 disabled:bg-slate-400"
                    >
                        <Save className="w-5 h-5" />
                        {isProcessing ? 'Guardando...' : 'Aplicar Retiro'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribución de Flujo de Caja */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">
                        Distribución de Flujo de Caja
                    </h3>
                    <div className="flex items-center gap-8">
                        <div className="flex-1 flex justify-center">
                            <div
                                className="relative w-48 h-48"
                                style={getConicGradientStyle()}
                            >
                                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-sm text-slate-600">Total</p>
                                        <p className="text-xl font-bold text-slate-800">
                                            ${netCashFlow.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {chartData.map((item) => (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        ${item.value.toFixed(2)}
                                    </p>
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full"
                                            style={{
                                                backgroundColor: item.color,
                                                width: `${(item.value / totalChartValue) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Resumen Financiero */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Resumen Financiero</h3>

                    <div className="space-y-3">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Saldo de Pagos Recibidos</p>
                            <p className="text-2xl font-bold text-slate-800">
                                ${currentBalance.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-700 mb-1">Efectivo Neto </p>
                            <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                ${netCashFlow.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm text-red-700 mb-1">Gastos Totales (Invertido + Retirado)</p>
                            <p className="text-2xl font-bold text-red-800">
                                {(investedAmount + withdrawn).toFixed(2) === '0.00'
                                    ? '$0.00'
                                    : `$${(investedAmount + withdrawn).toFixed(2)}`
                                }
                            </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-700 mb-1">Total de Ingresos Potenciales</p>
                            <p className="text-2xl font-bold text-blue-800">
                                ${(financialSummary.totalPaid + financialSummary.totalPending).toFixed(2)}
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            {/* Log de Inversiones y Retiros */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-500" />
                    Registro de Inversiones y Retiros
                </h3>

                {transactions.length === 0 ? (
                    <p className="text-slate-500 italic">
                        Aún no hay registros de inversiones o retiros en el sistema.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                        Descripción
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                        Fecha y Hora
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map((t) => {
                                    const date = new Date(t.transaction_date);
                                    const formattedDate = date.toLocaleDateString('es-VE');
                                    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    const isInvestment = t.type === 'inversion';

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className={`px-4 py-3 font-semibold ${
                                                isInvestment ? 'text-red-600' : 'text-indigo-600'
                                                }`}>
                                                {isInvestment ? 'Inversión' : 'Retiro'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {t.description}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${
                                                isInvestment ? 'text-red-700' : 'text-indigo-700'
                                                }`}>
                                                ${parseFloat(t.amount.toString()).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formattedDate} - {formattedTime}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 📋 DETALLES DE ÓRDENES (Ahora ordenados alfabéticamente) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Detalles de Órdenes 
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                    Cliente
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                    Producto
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                    Inversión
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                    Ingreso
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                    Pagado
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {/* 💡 USAMOS sortedOrders PARA MOSTRAR LOS DATOS ORDENADOS */}
                            {sortedOrders.map((order) => {
                                const totalPaid = getTotalPaid(order.payments);

                                return (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-700">
                                            {order.customer_name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {order.product_description.substring(0, 30)}...
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                            ${order.purchase_price.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                            ${order.sale_price.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                                            ${totalPaid.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                                    order.status === 'pagado'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {order.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}