import { useState, useEffect, useMemo, Fragment } from 'react';
import { useOrders } from '../hooks/useOrders';
import { apiOrders, apiSettings, apiCustomers } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { MessageCircle, Settings, AlertTriangle, AlertCircle, TrendingUp, X, Search, Edit3, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { OrderWithPayments } from '../lib/supabase';

export function RemindersModule() {
    const { orders, loadOrders, loading } = useOrders();
    const { user } = useAuth();
    const { showToast, showConfirm } = useUI();
    
    const [whatsappMessage, setWhatsappMessage] = useState('Hola {nombre}, te recordamos que tienes un saldo pendiente de ${deuda} por tu encargo. Por favor, comunícate con nosotros para coordinar el pago.');
    const [showConfig, setShowConfig] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [penaltyPercentage, setPenaltyPercentage] = useState(5);
    const [applyingPenalty, setApplyingPenalty] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
    const [editPhoneValue, setEditPhoneValue] = useState('');
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const toggleRow = (key: string) => {
        setExpandedRows(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    useEffect(() => {
        if (user) {
            apiSettings.getSetting(user.id, 'whatsapp_reminder_template', whatsappMessage).then(msg => {
                if (msg) setWhatsappMessage(msg);
            });
            apiSettings.getSetting(user.id, 'delay_penalty_percentage', '5').then(pct => {
                if (pct) setPenaltyPercentage(parseFloat(pct));
            });
        }
    }, [user]);

    const saveSettings = async () => {
        if (!user) return;
        setSavingSettings(true);
        try {
            await apiSettings.saveSetting(user.id, 'whatsapp_reminder_template', whatsappMessage);
            await apiSettings.saveSetting(user.id, 'delay_penalty_percentage', penaltyPercentage.toString());
            setShowConfig(false);
            showToast('Configuración guardada exitosamente', 'success');
        } catch (err: any) {
            showToast('Error guardando configuración: ' + err.message, 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleApplyPenalty = async (order: OrderWithPayments) => {
        if (!(await showConfirm(`¿Estás seguro de aplicar el ${penaltyPercentage}% de mora a la deuda restante?`))) return;
        
        setApplyingPenalty(order.id);
        try {
            await apiOrders.applyDelayPenalty(order, order.payments || [], penaltyPercentage);
            await loadOrders(); // Refresh
        } catch (err: any) {
            showToast('Error al aplicar mora: ' + err.message, 'error');
        } finally {
            setApplyingPenalty(null);
        }
    };

    const handleSavePhone = async (order: OrderWithPayments) => {
        if (!user || editingPhoneId !== order.id) return;
        try {
            const newPhone = editPhoneValue.trim();
            let customerId = order.customer_id;

            if (newPhone) {
                if (customerId) {
                    try {
                        await apiCustomers.updateCustomerPhone(customerId, newPhone);
                    } catch (e: any) {
                        if (e.code === '23505') {
                            const existing = await apiCustomers.getCustomerByPhone(user.id, newPhone);
                            if (existing) customerId = existing.id;
                        } else {
                            throw e;
                        }
                    }
                } else {
                    const customer = await apiCustomers.getOrCreateCustomer(user.id, order.customer_name, newPhone);
                    if (customer) customerId = customer.id;
                }
            }
            
            await apiOrders.updateOrder(order.id, {
                customer_phone: newPhone || undefined,
                customer_id: customerId
            });
            
            await loadOrders();
            setEditingPhoneId(null);
            showToast('Teléfono actualizado exitosamente', 'success');
        } catch (err: any) {
            showToast('Error al actualizar el teléfono: ' + err.message, 'error');
        }
    };

    const openWhatsApp = (customerPhone: string | null, customerName: string, debt: number) => {
        if (!customerPhone) {
            showToast("Este cliente no tiene número de teléfono registrado.", 'warning');
            return;
        }

        const formattedMessage = whatsappMessage
            .replace('{nombre}', customerName)
            .replace('{deuda}', debt.toFixed(2));
        
        const encodedMessage = encodeURIComponent(formattedMessage);
        
        // Remove non-numeric characters from phone
        const cleanPhone = customerPhone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    };

    const pendingGroups = useMemo(() => {
        const filtered = orders.filter(o => o.status === 'pendiente').filter(o => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return o.customer_name.toLowerCase().includes(term) || (o.customer_phone && o.customer_phone.includes(term));
        }).map(order => {
            const paid = order.payments?.reduce((s, p) => s + parseFloat(p.amount.toString()), 0) || 0;
            const debt = parseFloat(order.sale_price.toString()) - paid;
            
            const orderDate = new Date(order.order_date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - orderDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            return { ...order, debt, diffDays };
        }).filter(o => o.debt > 0);

        const groups = filtered.reduce((acc, order) => {
            const key = order.customer_name.trim().toLowerCase(); 
            if (!acc[key]) {
                acc[key] = {
                    key,
                    customer_name: order.customer_name,
                    customer_phone: order.customer_phone,
                    customer_id: order.customer_id,
                    totalDebt: 0,
                    maxDiffDays: 0,
                    orders: []
                };
            }
            acc[key].orders.push(order);
            acc[key].totalDebt += order.debt;
            if (order.diffDays > acc[key].maxDiffDays) {
                acc[key].maxDiffDays = order.diffDays;
            }
            if (!acc[key].customer_phone && order.customer_phone) {
                acc[key].customer_phone = order.customer_phone;
                acc[key].customer_id = order.customer_id;
            }
            return acc;
        }, {} as Record<string, any>);

        return Object.values(groups).map(group => {
            let alertLevel = 'none';
            let statusText = 'Al día';
            let color = 'text-emerald-600 bg-emerald-50 border-emerald-200';

            if (group.maxDiffDays > 30) {
                alertLevel = 'critical';
                statusText = 'Atraso crítico (>30 días)';
                color = 'text-rose-700 bg-rose-50 border-rose-300';
            } else if (group.maxDiffDays > 15) {
                alertLevel = 'warning';
                statusText = 'Atraso moderado (>15 días)';
                color = 'text-amber-700 bg-amber-50 border-amber-300';
            }

            return { ...group, alertLevel, statusText, color };
        }).sort((a: any, b: any) => b.maxDiffDays - a.maxDiffDays);

    }, [orders, searchTerm]);

    if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <MessageCircle className="text-blue-500" /> COBRANZA Y RECORDATORIOS
                </h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente o teléfono..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowConfig(true)}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-all"
                    >
                        <Settings size={18} /> <span className="hidden sm:inline">Mensaje</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Cliente</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Días Transcurridos</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Estado de Pago</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Deuda Restante</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-300 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {pendingGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No hay encargos pendientes con deudas.
                                    </td>
                                </tr>
                            ) : (
                                pendingGroups.map(group => (
                                    <Fragment key={group.key}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {group.orders.length > 1 ? (
                                                        <button 
                                                            onClick={() => toggleRow(group.key)}
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                        >
                                                            {expandedRows.includes(group.key) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                        </button>
                                                    ) : (
                                                        <div className="w-5" />
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                            {group.customer_name} 
                                                            {group.orders.length > 1 && (
                                                                <span className="text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                                                    {group.orders.length} encargos
                                                                </span>
                                                            )}
                                                        </div>
                                                        {editingPhoneId === group.customer_id && group.customer_id ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <input 
                                                                    type="text"
                                                                    className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-blue-500 w-32"
                                                                    value={editPhoneValue}
                                                                    onChange={(e) => setEditPhoneValue(e.target.value)}
                                                                    placeholder="Ej. +58412..."
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleSavePhone(group.orders[0])} className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 dark:bg-emerald-900/30 rounded" title="Guardar"><Check size={14} /></button>
                                                                <button onClick={() => setEditingPhoneId(null)} className="text-rose-600 hover:text-rose-700 p-1 bg-rose-50 dark:bg-rose-900/30 rounded" title="Cancelar"><X size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                                                {group.customer_phone || 'Sin número'}
                                                                {group.orders.length === 1 && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditPhoneValue(group.customer_phone || '');
                                                                            setEditingPhoneId(group.orders[0].id);
                                                                        }}
                                                                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                                                        title="Editar Teléfono"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {group.orders.length === 1 && (
                                                            <div className="text-xs text-slate-400 mt-1 max-w-[200px] truncate">{group.orders[0].product_description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                                                {group.orders.length === 1 ? `${group.orders[0].diffDays} días` : `${group.maxDiffDays} días (Máx)`}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${group.color} flex items-center w-max gap-1`}>
                                                    {group.alertLevel === 'critical' ? <AlertCircle size={14}/> : group.alertLevel === 'warning' ? <AlertTriangle size={14}/> : <div/>}
                                                    {group.statusText}
                                                </span>
                                            </td>
                                            <td className="p-4 font-black text-rose-600 dark:text-rose-400">
                                                ${group.totalDebt.toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    {group.orders.length === 1 && (
                                                        <button
                                                            onClick={() => handleApplyPenalty(group.orders[0])}
                                                            disabled={applyingPenalty === group.orders[0].id}
                                                            className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 p-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                                                            title={`Aplicar ${penaltyPercentage}% Demora`}
                                                        >
                                                            <TrendingUp size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openWhatsApp(group.customer_phone, group.customer_name, group.totalDebt)}
                                                        disabled={!group.customer_phone}
                                                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 p-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                                        title="Notificar por WhatsApp"
                                                    >
                                                        <MessageCircle size={18} /> <span className="hidden xl:inline">WhatsApp</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {group.orders.length > 1 && expandedRows.includes(group.key) && group.orders.map((order: any, idx: number) => (
                                            <tr key={order.id} className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                                <td className="p-4 pl-14">
                                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between items-center pr-4">
                                                        <span>Encargo {idx + 1}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1 max-w-[250px] truncate" title={order.product_description}>
                                                        {order.product_description}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-500">
                                                    {order.diffDays} días
                                                </td>
                                                <td className="p-4">
                                                </td>
                                                <td className="p-4 text-sm font-bold text-rose-500">
                                                    ${order.debt.toFixed(2)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => handleApplyPenalty(order)}
                                                            disabled={applyingPenalty === order.id}
                                                            className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 p-1.5 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                                                            title={`Aplicar ${penaltyPercentage}% Demora`}
                                                        >
                                                            <TrendingUp size={14} /> Mora
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Configuración WhatsApp */}
            {showConfig && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Settings className="text-slate-500" /> Plantilla de Mensaje
                            </h3>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cuerpo del mensaje</label>
                                <p className="text-xs text-slate-500 mb-2">Variables disponibles: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nombre}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{deuda}'}</code></p>
                                <textarea 
                                    className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    value={whatsappMessage}
                                    onChange={(e) => setWhatsappMessage(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Porcentaje de Demora (%)</label>
                                <p className="text-xs text-slate-500 mb-2">Se aplicará este porcentaje a la deuda restante cuando apliques demora a un encargo.</p>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={penaltyPercentage}
                                    onChange={(e) => setPenaltyPercentage(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <button 
                                onClick={saveSettings}
                                disabled={savingSettings || !whatsappMessage.trim()}
                                className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 py-3 rounded-xl font-black transition-all text-white active:scale-95 disabled:active:scale-100 disabled:opacity-50"
                            >
                                {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
