import { useState } from 'react';
import { usePartners } from '../hooks/usePartners';
import { Users, TrendingUp, ArrowUpRight, ArrowDownRight, Building, UserPlus, X, DollarSign, Wallet, History, Edit2 } from 'lucide-react';

export function PartnersModule() {
    const { partners, transactions, loading, error, addPartner, updatePartner, addTransaction, deletePartner } = usePartners();
    
    // UI States
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
    const [editingPartner, setEditingPartner] = useState<{ id: string, name: string, profit_percentage: string } | null>(null);

    // Form States
    const [partnerForm, setPartnerForm] = useState({ name: '', profit_percentage: '10' });
    const [transactionForm, setTransactionForm] = useState({ type: 'inversion' as 'inversion'|'retiro', amount: '', description: '' });

    if (loading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div></div>;
    }

    if (error) {
        return <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl font-medium">Error cargando socios: {error}</div>;
    }

    const totalInvested = partners.reduce((sum, p) => sum + p.netInvestment, 0);
    const totalProfit = partners.reduce((sum, p) => sum + p.profitAmount, 0);
    const totalBalance = partners.reduce((sum, p) => sum + p.totalBalance, 0);

    const handleAddPartner = async () => {
        if (!partnerForm.name) return;
        await addPartner({ name: partnerForm.name, profit_percentage: parseFloat(partnerForm.profit_percentage) || 0 });
        setShowPartnerModal(false);
        setPartnerForm({ name: '', profit_percentage: '10' });
    };

    const handleEditPartner = async () => {
        if (!editingPartner) return;
        const newPercentage = parseFloat(editingPartner.profit_percentage) || 0;
        await updatePartner(editingPartner.id, { profit_percentage: newPercentage });
        setEditingPartner(null);
    };

    const handleAddTransaction = async () => {
        if (!selectedPartner || !transactionForm.amount || !transactionForm.description) return;
        await addTransaction(selectedPartner, transactionForm.type, parseFloat(transactionForm.amount), transactionForm.description);
        setShowTransactionModal(false);
        setTransactionForm({ type: 'inversion', amount: '', description: '' });
        setSelectedPartner(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500 p-3 rounded-xl shadow-lg shadow-indigo-500/30">
                        <Building className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Socios e Inversores</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gestión de capital y ganancias</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowPartnerModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                >
                    <UserPlus size={18} />
                    Añadir Socio
                </button>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={64} className="text-indigo-500"/>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        Capital Activo Neto
                    </p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">${totalInvested.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-emerald-500"/>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        Ganancia Proyectada
                    </p>
                    <p className="text-3xl font-black text-emerald-500">${totalProfit.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-amber-400"/>
                    </div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        Compromiso Total
                    </p>
                    <p className="text-3xl font-black text-amber-400">${totalBalance.toFixed(2)}</p>
                </div>
            </div>

            {/* Partners List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map(partner => (
                    <div key={partner.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                        <Users className="text-indigo-500" size={18} />
                                        {partner.name}
                                    </h3>
                                    <button 
                                        onClick={() => setEditingPartner({ id: partner.id, name: partner.name, profit_percentage: partner.profit_percentage.toString() })}
                                        className="inline-flex items-center gap-1 mt-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-colors"
                                        title="Editar porcentaje de retorno"
                                    >
                                        Retorno: {partner.profit_percentage}% <Edit2 size={10} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => deletePartner(partner.id)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Eliminar socio"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Capital Invertido</span>
                                    <span className="font-black text-slate-800 dark:text-white">${partner.netInvestment.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ganancia ({partner.profit_percentage}%)</span>
                                    <span className="font-black text-emerald-500">+${partner.profitAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase">Balance Total</span>
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">${partner.totalBalance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            <button 
                                onClick={() => {
                                    setSelectedPartner(partner.id);
                                    setTransactionForm({ ...transactionForm, type: 'inversion' });
                                    setShowTransactionModal(true);
                                }}
                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-all shadow-sm"
                            >
                                <ArrowDownRight size={14} /> Invertir
                            </button>
                            <button 
                                onClick={() => {
                                    setSelectedPartner(partner.id);
                                    setTransactionForm({ ...transactionForm, type: 'retiro' });
                                    setShowTransactionModal(true);
                                }}
                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 text-rose-600 dark:text-rose-400 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-all shadow-sm"
                            >
                                <ArrowUpRight size={14} /> Retirar
                            </button>
                        </div>
                    </div>
                ))}
                
                {partners.length === 0 && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
                            <Users size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">No hay socios registrados</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">Agrega a tus inversores para llevar un control detallado de su capital y el cálculo automático de sus ganancias.</p>
                    </div>
                )}
            </div>

            {/* Historial de Transacciones */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-8">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400">
                            <History size={20} />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase">Historial de Operaciones</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">No hay transacciones registradas.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Socio</th>
                                    <th className="px-6 py-4">Operación</th>
                                    <th className="px-6 py-4">Descripción</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {transactions.map((tx) => {
                                    const partner = partners.find(p => p.id === tx.partner_id);
                                    const isRetiro = tx.type === 'retiro';
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                                                {new Date(tx.transaction_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                <Users size={14} className="text-indigo-500" />
                                                {partner?.name || 'Socio Desconocido'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${isRetiro ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                                                    {isRetiro ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                    {isRetiro ? 'Retiro' : 'Inversión'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {tx.description}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black ${isRetiro ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {isRetiro ? '-' : '+'}${parseFloat(tx.amount.toString()).toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Partner Modal */}
            {showPartnerModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <UserPlus className="text-indigo-500" /> Nuevo Socio
                            </h3>
                            <button onClick={() => setShowPartnerModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Nombre del Socio</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" 
                                    value={partnerForm.name} 
                                    onChange={e => setPartnerForm({...partnerForm, name: e.target.value})}
                                    placeholder="Ej: Empresa XYZ / Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Porcentaje de Ganancia (%)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" 
                                    value={partnerForm.profit_percentage} 
                                    onChange={e => setPartnerForm({...partnerForm, profit_percentage: e.target.value})}
                                    placeholder="10"
                                />
                            </div>
                            <button 
                                onClick={handleAddPartner} 
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-colors shadow-sm"
                            >
                                Registrar Socio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Partner Modal */}
            {editingPartner && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Edit2 className="text-indigo-500" /> Editar Porcentaje
                            </h3>
                            <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Socio</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                                    value={editingPartner.name} 
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Nuevo Porcentaje de Ganancia (%)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" 
                                    value={editingPartner.profit_percentage} 
                                    onChange={e => setEditingPartner({...editingPartner, profit_percentage: e.target.value})}
                                    placeholder="10"
                                />
                            </div>
                            <button 
                                onClick={handleEditPartner} 
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-colors shadow-sm"
                            >
                                Actualizar Porcentaje
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {showTransactionModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                {transactionForm.type === 'inversion' ? <ArrowDownRight className="text-emerald-500" /> : <ArrowUpRight className="text-rose-500" />}
                                {transactionForm.type === 'inversion' ? 'Registrar Inversión' : 'Registrar Retiro'}
                            </h3>
                            <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Monto ($)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" 
                                    value={transactionForm.amount} 
                                    onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Descripción</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" 
                                    value={transactionForm.description} 
                                    onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                                    placeholder="Motivo o referencia"
                                />
                            </div>
                            <button 
                                onClick={handleAddTransaction} 
                                className={`w-full text-white font-black py-3 rounded-xl transition-colors shadow-sm ${transactionForm.type === 'inversion' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}
                            >
                                Confirmar {transactionForm.type === 'inversion' ? 'Inversión' : 'Retiro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
