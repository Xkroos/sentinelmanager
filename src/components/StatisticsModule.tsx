import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    TrendingUp, DollarSign, ShoppingBag, Calendar, X, 
    ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, 
    User, Clock 
} from 'lucide-react'; 
// Placeholder para tipos si no están en '../lib/supabase'
type Order = any; 
type Payment = any; 
// Importaciones de utilidades
import { useExchangeRate } from '../hooks/useExchangeRate'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; 

// ====================================================================
// TIPOS DE DATOS
// ====================================================================

interface OrderWithPayments extends Order {
    payments: Payment[];
}

interface OrderDetails {
    id: string;
    order_date: Date;
    remaining: number;
    first_due: Date;
    second_due: Date;
    is_fully_paid: boolean;
}

interface CustomerDebt {
    customer_name: string;
    total_due: number;
    earliest_due_date: Date | null;
    orders_pending: OrderDetails[];
}

interface CalendarEvent {
    date: Date;
    customer_name: string;
    type: 'Primer Abono' | 'Segundo Abono';
    order_id: string;
    amount_remaining: number;
    is_overdue: boolean;
    original_order_date: Date; 
}

interface DailyInfo {
    date: Date;
    events: CalendarEvent[];
    totalDueToday: number;
}

// ====================================================================
// 1. MODAL DE DETALLES DEL DÍA (DayDetailsModal)
// ====================================================================

interface DayDetailsModalProps {
    dailyInfo: DailyInfo;
    onClose: () => void;
    onViewOrderDetails: (orderId: string) => void;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ dailyInfo, onClose, onViewOrderDetails }) => {
    
    const pendingEvents = dailyInfo.events.filter(e => e.amount_remaining > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full max-h-[95vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="bg-blue-600 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                        {format(dailyInfo.date, "EEEE, d 'de' MMMM", { locale: es })}
                    </h3>
                    <button onClick={onClose} className="text-blue-200 hover:text-white p-1">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Contenido Desplazable */}
                <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
                    {pendingEvents.length === 0 ? (
                        <div className="text-center p-4 sm:p-6 bg-green-50 rounded-lg">
                            <CheckCircle className="w-7 h-7 text-green-600 mx-auto mb-3" />
                            <p className="text-md font-medium text-green-800">No hay abonos pendientes este día.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Resumen Total */}
                            <div className="p-3 bg-yellow-100 rounded-lg border-l-4 border-yellow-500">
                                <p className="text-sm font-semibold text-yellow-800">
                                    Total a Cobrar Estimado: <span className="text-xl font-bold">${dailyInfo.totalDueToday.toFixed(2)}</span>
                                </p>
                            </div>

                            {/* Lista de Eventos */}
                            {pendingEvents.map((event, index) => (
                                <div 
                                    key={index} 
                                    className={`p-3 rounded-lg border transition duration-150 ${event.is_overdue ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}
                                >
                                    <div className="flex flex-col gap-1"> 
                                        
                                        {/* Fila 1: Cliente y Tipo de Abono */}
                                        <div className="flex items-center justify-between pb-1 border-b border-dashed border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-700"/>
                                                <span className="font-semibold text-slate-800 text-sm truncate">{event.customer_name}</span>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${event.is_overdue ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                                {event.type}
                                            </span>
                                        </div>

                                        {/* Fila 2: Detalles de Deuda y Botón */}
                                        <div className="flex justify-between items-center pt-1">
                                            {/* Detalles */}
                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    <Clock className='w-3 h-3 inline mr-1'/> 
                                                    Compra: {format(event.original_order_date, 'd/MMM/yy', { locale: es })}
                                                </p>
                                                <p className="text-sm font-bold text-slate-900 mt-0.5">
                                                    Deuda Pendiente: <span className='text-green-600'>${event.amount_remaining.toFixed(2)}</span>
                                                </p>
                                            </div>

                                            {/* Botón de Acción */}
                                            <button 
                                                onClick={() => onViewOrderDetails(event.order_id)}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
                                            >
                                                Ver Encargo
                                            </button>
                                        </div>
                                        
                                        {/* Alerta de Vencimiento */}
                                        {event.is_overdue && (
                                            <p className="flex items-center gap-1 text-xs font-bold text-red-600 mt-1">
                                                <AlertTriangle className='w-3 h-3' /> ¡Vencido!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ====================================================================
// 2. VISTA DE CALENDARIO MENSUAL (PaymentCalendar)
// ====================================================================

interface PaymentCalendarProps {
    customerDebts: CustomerDebt[];
    onClose: () => void;
    onViewOrderDetails: (orderId: string) => void; 
}

const PaymentCalendar: React.FC<PaymentCalendarProps> = ({ customerDebts, onClose, onViewOrderDetails }) => {
    
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedDayInfo, setSelectedDayInfo] = useState<DailyInfo | null>(null);
    
    const startOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const endOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const handleViewOrderDetails = useCallback((orderId: string) => {
        setSelectedDayInfo(null); 
        onViewOrderDetails(orderId); 
    }, [onViewOrderDetails]); 

    // Generar eventos
    const allEvents = useMemo<CalendarEvent[]>(() => {
        const events: CalendarEvent[] = [];
        customerDebts.forEach(debt => {
            debt.orders_pending.forEach(order => {
                const now = new Date();
                
                if (order.remaining <= 0) return;

                // Primer Abono (15 días)
                events.push({
                    date: order.first_due,
                    customer_name: debt.customer_name,
                    type: 'Primer Abono',
                    order_id: order.id,
                    amount_remaining: order.remaining,
                    is_overdue: order.first_due < now,
                    original_order_date: order.order_date, 
                });

                // Segundo Abono (30 días)
                 events.push({
                    date: order.second_due,
                    customer_name: debt.customer_name,
                    type: 'Segundo Abono',
                    order_id: order.id,
                    amount_remaining: order.remaining,
                    is_overdue: order.second_due < now,
                    original_order_date: order.order_date, 
                });
            });
        });
        return events;
    }, [customerDebts]);

    // Agrupar eventos por día
    const groupedEvents = useMemo(() => {
        return allEvents.reduce((acc, event) => {
            const dateKey = format(event.date, 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    date: event.date,
                    events: [],
                    totalDueToday: 0,
                };
            }
            if (event.amount_remaining > 0) {
                 acc[dateKey].events.push(event);
                 acc[dateKey].totalDueToday += event.amount_remaining / 2; 
            }
            return acc;
        }, {} as Record<string, DailyInfo>);
    }, [allEvents]);

    // Generar la cuadrícula del calendario
    const calendarDays = useMemo(() => {
        const days = [];
        const monthStartDay = startOfMonth.getDay(); 
        const startingDayIndex = monthStartDay === 0 ? 6 : monthStartDay - 1;

        const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        for (let i = startingDayIndex; i > 0; i--) {
             days.push({ 
                 date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthLastDay - i + 1), 
                 isCurrentMonth: false 
             });
        }
        
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push({ 
                date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i), 
                isCurrentMonth: true 
            });
        }

        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
                isCurrentMonth: false
            });
        }

        return days.slice(0, 42); 
    }, [currentDate, startOfMonth, endOfMonth]);


    const handlePrevMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const handleNextMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);

    const handleDayClick = useCallback((date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const info = groupedEvents[dateKey] || { 
            date: date, 
            events: [], 
            totalDueToday: 0 
        };
        setSelectedDayInfo(info);
    }, [groupedEvents]);

    const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-full md:max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                
                {/* Header y Navegación */}
                <div className="bg-slate-700 text-white px-4 py-3 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6" /> <span className='hidden sm:inline'>Control de Abonos Pendientes</span><span className='sm:hidden'>Abonos</span>
                    </h2>
                    <button onClick={onClose} className="text-slate-300 hover:text-white p-1">
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
                <div className="flex justify-between items-center p-3 md:p-4 border-b flex-shrink-0">
                    <button onClick={handlePrevMonth} className="p-1 md:p-2 rounded-full hover:bg-slate-100"><ChevronLeft className="w-5 h-5 text-slate-700" /></button>
                    <h3 className="text-base md:text-xl font-bold text-slate-800">{format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}</h3>
                    <button onClick={handleNextMonth} className="p-1 md:p-2 rounded-full hover:bg-slate-100"><ChevronRight className="w-5 h-5 text-slate-700" /></button>
                </div>

                {/* Cuadrícula del Calendario */}
                <div className="p-2 md:p-4 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-7 text-center font-semibold text-xs md:text-sm text-slate-500 border-b border-slate-200">
                        {daysOfWeek.map(day => (<div key={day} className="py-2">{day}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200">
                        {calendarDays.map((dayInfo, index) => {
                            const dateKey = format(dayInfo.date, 'yyyy-MM-dd');
                            const dailyData = groupedEvents[dateKey];
                            const hasPaymentDue = dailyData && dailyData.events.length > 0;
                            const isToday = dateKey === todayKey;
                            const isOverdue = hasPaymentDue && dailyData!.events.some(e => e.is_overdue);

                            let cellClasses = 'h-24 md:h-32 p-1 text-right relative transition-all duration-100 cursor-pointer ';
                            cellClasses += dayInfo.isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 text-slate-400 hover:bg-slate-100';
                            if (isToday) {cellClasses += ' border-2 border-blue-500';}
                            if (hasPaymentDue) {cellClasses += isOverdue ? ' bg-red-100 hover:bg-red-200' : ' bg-yellow-50 hover:bg-yellow-100';}

                            return (
                                <div key={index} className={cellClasses} onClick={() => handleDayClick(dayInfo.date)}>
                                    <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : ''}`}>{dayInfo.date.getDate()}</span>
                                    {dailyData && dailyData.events.length > 0 && (
                                        <div className='absolute bottom-1 left-1 right-1'>
                                            <div className='flex items-center justify-end'>
                                                <Clock className={`w-3 h-3 ${isOverdue ? 'text-red-700' : 'text-yellow-700'} mr-1`} />
                                                <span className={`text-xs font-bold ${isOverdue ? 'text-red-700' : 'text-yellow-700'}`}>${dailyData.totalDueToday.toFixed(2)}</span>
                                            </div>
                                            <p className='text-[10px] text-center mt-0.5 text-slate-600 hidden md:block'>{dailyData.events.length} abono{dailyData.events.length > 1 ? 's' : ''}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal de Detalles del Día */}
            {selectedDayInfo && (
                <DayDetailsModal 
                    dailyInfo={selectedDayInfo} 
                    onClose={() => setSelectedDayInfo(null)}
                    onViewOrderDetails={handleViewOrderDetails} 
                />
            )}
        </div>
    );
};


// ====================================================================
// 3. COMPONENTE PRINCIPAL: StatisticsModule (SOLUCIONADO)
// ====================================================================

export function StatisticsModule() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderWithPayments[]>([]);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false); 
    const { rate: exchangeRate } = useExchangeRate();

    const navigate = useNavigate(); 
    

    useEffect(() => {
        if (user) {
            loadOrders();
        }
    }, [user]);

    const loadOrders = async () => { 
        if (!user) return;
        const { data: ordersData } = await supabase.from('orders').select('*').eq('user_id', user.id).order('order_date', { ascending: false });
        if (ordersData) {
            const ordersWithPayments = await Promise.all(
                ordersData.map(async (order) => {
                    const { data: payments } = await supabase.from('payments').select('*').eq('order_id', order.id);
                    return { ...order, payments: payments || [], };
                })
            );
            setOrders(ordersWithPayments as OrderWithPayments[]);
        }
    };

    // Lógica de Agrupación de Deudas (CORREGIDA la tipificación)
    const customerDebts = useMemo<CustomerDebt[]>(() => {
        const debtMap = new Map<string, CustomerDebt>();
        orders.forEach(order => {
            const paidAmount = order.payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
            const remaining = Math.max(0, parseFloat(order.sale_price.toString()) - paidAmount);
            if (remaining <= 0) return; 

            const orderDate = new Date(order.order_date);
            const firstDue = new Date(orderDate); firstDue.setDate(orderDate.getDate() + 15);
            const secondDue = new Date(orderDate); secondDue.setDate(orderDate.getDate() + 30);
            
            // ⭐️ CORRECCIÓN CLAVE: Inicializar con as CustomerDebt para definir orders_pending
            const currentDebt = debtMap.get(order.customer_name) || ({ 
                customer_name: order.customer_name, 
                total_due: 0, 
                earliest_due_date: null, 
                orders_pending: [], 
            } as CustomerDebt); 

            currentDebt.total_due += remaining;

            const today = new Date();
            let nextDueDate: Date | null = null;
            if (remaining > 0) {
                 if (firstDue > today) { nextDueDate = firstDue; } 
                 else if (secondDue > today) { nextDueDate = secondDue; } 
                 else { nextDueDate = secondDue; } 
            }
            if (nextDueDate && (!currentDebt.earliest_due_date || nextDueDate < currentDebt.earliest_due_date)) {
                currentDebt.earliest_due_date = nextDueDate;
            }

            currentDebt.orders_pending.push({
                id: order.id, order_date: orderDate, remaining: remaining, first_due: firstDue, second_due: secondDue, is_fully_paid: false,
            });

            debtMap.set(order.customer_name, currentDebt);
        });
        return Array.from(debtMap.values()).sort((a, b) => {
            if (!a.earliest_due_date) return 1;
            if (!b.earliest_due_date) return -1;
            return a.earliest_due_date.getTime() - b.earliest_due_date.getTime();
        });
    }, [orders]);


    const handleViewOrderDetailsFromCalendar = (orderId: string) => {
        setIsCalendarOpen(false); 
        navigate(`/abonos/detalle/${orderId}`); 
    };


    // Lógica de estadísticas
    const getDateRange = () => { 
        const now = new Date(); let startDate = new Date();
        switch (period) {
            case 'week': startDate.setDate(now.getDate() - 7); break;
            case 'month': startDate.setMonth(now.getMonth() - 1); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
        }
        return startDate;
    };
    const filteredOrders = orders.filter((order) => new Date(order.order_date) >= getDateRange());
    const stats = filteredOrders.reduce((acc, order) => { 
        const revenue = parseFloat(order.sale_price.toString());
        const investment = parseFloat(order.purchase_price.toString());
        const profit = parseFloat(order.profit.toString());
        const totalPaid = order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
        return { totalRevenue: acc.totalRevenue + revenue, totalInvestment: acc.totalInvestment + investment, totalProfit: acc.totalProfit + profit, totalPaid: acc.totalPaid + totalPaid, orderCount: acc.orderCount + 1, paidOrders: order.status === 'pagado' ? acc.paidOrders + 1 : acc.paidOrders, };
    }, { totalRevenue: 0, totalInvestment: 0, totalProfit: 0, totalPaid: 0, orderCount: 0, paidOrders: 0 });
    const profitMargin = stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0;
    const getPeriodLabel = () => {
        switch (period) {
            case 'week': return 'Última Semana';
            case 'month': return 'Último Mes';
            case 'year': return 'Último Año';
        }
    };


    return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Estadísticas</h2>
            
            {/* Controles de Período y Calendario */}
            <div className="flex gap-2 flex-wrap justify-end">
                <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm whitespace-nowrap"
                >
                    <Calendar className="w-5 h-5" />
                    Control de Abonos
                </button>
                <button onClick={() => setPeriod('week')} className={`px-3 py-2 text-sm rounded-lg transition-colors ${period === 'week' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Semana</button>
                <button onClick={() => setPeriod('month')} className={`px-3 py-2 text-sm rounded-lg transition-colors ${period === 'month' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Mes</button>
                <button onClick={() => setPeriod('year')} className={`px-3 py-2 text-sm rounded-lg transition-colors ${period === 'year' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Año</button>
            </div>
        </div>
            
        {/* Bloque de resumen de periodo */}
        <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-slate-700"><Calendar className="w-5 h-5" /><span className="font-medium">Período: {getPeriodLabel()}</span></div>
        </div>

        {/* Tarjetas de estadísticas - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"> 
            {/* Total Encargos */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-100 rounded-lg"><ShoppingBag className="w-5 h-5 text-blue-600" /></div><div><p className="text-slate-600 text-xs">Total Encargos</p><p className="text-xl font-bold text-slate-800">{stats.orderCount}</p></div></div><div className="text-xs text-slate-600"><p>Pagados: {stats.paidOrders}</p><p>Pendientes: {stats.orderCount - stats.paidOrders}</p></div></div>
            {/* Ganancia Total */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-slate-600 text-xs">Ganancia Total</p><p className="text-xl font-bold text-slate-800">${stats.totalProfit.toFixed(2)}</p></div></div>{exchangeRate > 0 && (<p className="text-xs text-slate-600">Bs. {(stats.totalProfit * exchangeRate).toFixed(2)}</p>)}<p className="text-xs text-slate-600 mt-1">Margen: {profitMargin.toFixed(1)}%</p></div>
            {/* Inversión Total */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-red-100 rounded-lg"><DollarSign className="w-5 h-5 text-red-600" /></div><div><p className="text-slate-600 text-xs">Inversión Total</p><p className="text-xl font-bold text-slate-800">${stats.totalInvestment.toFixed(2)}</p></div></div>{exchangeRate > 0 && (<p className="text-xs text-slate-600">Bs. {(stats.totalInvestment * exchangeRate).toFixed(2)}</p>)}</div>
            {/* Ingresos Totales */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-slate-100 rounded-lg"><DollarSign className="w-5 h-5 text-slate-600" /></div><div><p className="text-slate-600 text-xs">Ingresos Totales</p><p className="text-xl font-bold text-slate-800">${stats.totalRevenue.toFixed(2)}</p></div></div>{exchangeRate > 0 && (<p className="text-xs text-slate-600">Bs. {(stats.totalRevenue * exchangeRate).toFixed(2)}</p>)}</div>
            {/* Dinero Recibido */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div><div><p className="text-slate-600 text-xs">Dinero Recibido</p><p className="text-xl font-bold text-slate-800">${stats.totalPaid.toFixed(2)}</p></div></div>{exchangeRate > 0 && (<p className="text-xs text-slate-600">Bs. {(stats.totalPaid * exchangeRate).toFixed(2)}</p>)}</div>
            {/* Por Cobrar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="w-5 h-5 text-yellow-600" /></div><div><p className="text-slate-600 text-xs">Por Cobrar</p><p className="text-xl font-bold text-slate-800">${(stats.totalRevenue - stats.totalPaid).toFixed(2)}</p></div></div>{exchangeRate > 0 && (<p className="text-xs text-slate-600">Bs. {((stats.totalRevenue - stats.totalPaid) * exchangeRate).toFixed(2)}</p>)}</div>
        </div>

        {/* Tasa de cambio */}
        {exchangeRate > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-blue-900 text-sm font-medium">Tasa BCV: Bs. {exchangeRate.toFixed(2)} por dólar</p>
            </div>
        )}

        {/* RENDERIZADO DEL CALENDARIO COMPLETO */}
        {isCalendarOpen && (
            <PaymentCalendar
                customerDebts={customerDebts}
                onClose={() => setIsCalendarOpen(false)}
                onViewOrderDetails={handleViewOrderDetailsFromCalendar} 
            />
        )}
    </div>
    );
}