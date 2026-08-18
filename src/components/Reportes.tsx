import { useState, useMemo } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, 
    Wallet, 
    TrendingUp, 
    Search, 
    AlertCircle,
    ChevronRight,
    Download,
    Package,
    ListTodo,
    Edit3,
    Trash2,
    X,
    AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reportes() {
    const { user } = useAuth();
    const { items, loading: invLoading, error: invError, deleteItem, addOrUpdateItem } = useInventory();
    const { orders, loading: ordersLoading, error: ordersError } = useOrders();
    
    const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');

    // --- LOGICA DE INVENTARIO ---
    const [invSearchTerm, setInvSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({
        name: '', sku: '', supplier: '', stock_quantity: '' as number | '', unit_price: '' as number | '', sale_price: '' as number | ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deletingItem, setDeletingItem] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setEditFormData({
            name: item.name,
            sku: item.sku || '',
            supplier: item.supplier || '',
            stock_quantity: item.stock_quantity,
            unit_price: item.unit_price,
            sale_price: item.sale_price
        });
    };

    const handleDeleteClick = (item: any) => {
        setDeletingItem(item);
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;
        setIsDeleting(true);
        try {
            await deleteItem(deletingItem.id);
            setDeletingItem(null);
        } catch (error) {
            console.error("Error al eliminar", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            await addOrUpdateItem({
                name: editFormData.name,
                sku: editFormData.sku,
                supplier: editFormData.supplier,
                stock_quantity: Number(editFormData.stock_quantity),
                unit_price: Number(editFormData.unit_price),
                sale_price: Number(editFormData.sale_price)
            }, editingItem.id);
            setEditingItem(null);
        } catch (error) {
            console.error("Error al guardar", error);
        } finally {
            setIsSaving(false);
        }
    };

    const reportData = useMemo(() => {
        return items
            .filter(i => 
                i.name.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                i.sku?.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                i.supplier?.toLowerCase().includes(invSearchTerm.toLowerCase())
            )
            .map(item => ({
                ...item,
                totalInvestment: (item.stock_quantity || 0) * (item.unit_price || 0),
                totalPotentialProfit: (item.stock_quantity || 0) * ((item.sale_price || 0) - (item.unit_price || 0))
            }));
    }, [items, invSearchTerm]);

    const globals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            investment: acc.investment + curr.totalInvestment,
            profit: acc.profit + curr.totalPotentialProfit
        }), { investment: 0, profit: 0 });
    }, [reportData]);

    const exportToPDF = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        doc.setFontSize(18);
        doc.text('Reporte de Inventario - Sentinel', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de generación: ${date}`, 14, 28);
        doc.text(`Usuario: ${user?.email}`, 14, 33);

        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Inversión Total: $${globals.investment.toFixed(2)}`, 14, 45);
        doc.text(`Ganancia Estimada: $${globals.profit.toFixed(2)}`, 14, 50);

        const tableColumn = ["SKU", "Producto", "Stock", "Costo", "Venta", "Inv. Total", "Ganancia"];
        const tableRows = reportData.map(item => [
            item.sku || 'N/A',
            item.name,
            item.stock_quantity,
            `$${item.unit_price.toFixed(2)}`,
            `$${item.sale_price.toFixed(2)}`,
            `$${item.totalInvestment.toFixed(2)}`,
            `$${item.totalPotentialProfit.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] }, 
            styles: { fontSize: 8 },
            columnStyles: {
                0: { fontStyle: 'italic' },
                6: { fontStyle: 'bold' }
            }
        });

        doc.save(`Reporte_Inventario_${date.replace(/\//g, '-')}.pdf`);
    };

    // --- LOGICA DE ENCARGOS ---
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatus, setOrderStatus] = useState<'todos' | 'pendiente' | 'pagado'>('todos');

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchStatus = orderStatus === 'todos' || o.status === orderStatus;
            const matchSearch = o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                                o.product_description.toLowerCase().includes(orderSearch.toLowerCase());
            return matchStatus && matchSearch;
        }).map(o => {
            const paid = o.payments?.reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0) || 0;
            const pending = o.sale_price - paid;
            return {
                ...o,
                paidAmount: paid,
                pendingAmount: pending
            };
        });
    }, [orders, orderSearch, orderStatus]);

    const ordersGlobals = useMemo(() => {
        return filteredOrders.reduce((acc, curr) => ({
            totalSales: acc.totalSales + curr.sale_price,
            totalCollected: acc.totalCollected + curr.paidAmount,
            totalPending: acc.totalPending + curr.pendingAmount,
            totalProfit: acc.totalProfit + curr.profit
        }), { totalSales: 0, totalCollected: 0, totalPending: 0, totalProfit: 0 });
    }, [filteredOrders]);

    const exportOrdersToPDF = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        doc.setFontSize(18);
        doc.text('Reporte de Encargos - Sentinel', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de generación: ${date}`, 14, 28);
        doc.text(`Usuario: ${user?.email}`, 14, 33);
        doc.text(`Filtro de estado: ${orderStatus.toUpperCase()}`, 14, 38);

        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Esperado (Ventas): $${ordersGlobals.totalSales.toFixed(2)}`, 14, 50);
        doc.text(`Total Cobrado: $${ordersGlobals.totalCollected.toFixed(2)}`, 14, 55);
        doc.text(`Total Pendiente: $${ordersGlobals.totalPending.toFixed(2)}`, 14, 60);

        const tableColumn = ["Fecha", "Cliente", "Producto", "Total Venta", "Abonado", "Pendiente", "Estado"];
        const tableRows = filteredOrders.map(item => [
            new Date(item.order_date).toLocaleDateString(),
            item.customer_name,
            item.product_description,
            `$${item.sale_price.toFixed(2)}`,
            `$${item.paidAmount.toFixed(2)}`,
            `$${item.pendingAmount.toFixed(2)}`,
            item.status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] }, 
            styles: { fontSize: 8 },
            columnStyles: {
                0: { fontStyle: 'italic' },
                5: { fontStyle: 'bold' }
            }
        });

        doc.save(`Reporte_Encargos_${date.replace(/\//g, '-')}.pdf`);
    };

    if (invLoading || ordersLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">Preparando reportes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            
            {/* Header y Selector de Pestañas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'inventory' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    <Package size={20} />
                    Reporte de Inventario
                </button>
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 font-black text-sm uppercase tracking-wider transition-colors ${activeTab === 'orders' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    <ListTodo size={20} />
                    Reporte de Encargos
                </button>
            </div>

            {/* ERROR GENERAL */}
            {(invError || ordersError) && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-center gap-3">
                    <AlertCircle className="text-rose-500" size={20} />
                    <p className="text-rose-700 text-xs font-bold uppercase">{invError || ordersError}</p>
                </div>
            )}

            {/* === PESTAÑA: INVENTARIO === */}
            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-600 p-2 rounded-lg shadow-md">
                                    <FileText className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Hoja de Balance</h2>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Inventario Real-Time</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar celdas..." 
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white transition-all"
                                        value={invSearchTerm}
                                        onChange={(e) => setInvSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={exportToPDF}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm font-bold active:scale-95"
                                >
                                    <Download size={16} />
                                    <span>PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
                            <div className="z-10">
                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Inversión Total</p>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">${globals.investment.toFixed(2)}</h3>
                            </div>
                            <Wallet className="text-slate-100 dark:text-slate-800/50 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform duration-500" size={100} />
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
                            <div className="z-10">
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase mb-1">Ganancia Estimada</p>
                                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${globals.profit.toFixed(2)}</h3>
                            </div>
                            <TrendingUp className="text-emerald-50 dark:text-emerald-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform duration-500" size={100} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-800 dark:bg-slate-950 text-white">
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">SKU</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Producto</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700 text-center">Stock</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Costo</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Venta</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Inv. Total</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider bg-emerald-700 dark:bg-emerald-800">Ganancia</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-l border-slate-700 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                                    {reportData.map((item, idx) => (
                                        <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'} hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-colors`}>
                                            <td className="p-4 font-mono text-xs text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800">{item.sku || '---'}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">{item.name}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{item.supplier || 'GENÉRICO'}</div>
                                            </td>
                                            <td className="p-4 text-center border-r border-slate-100 dark:border-slate-800 font-black text-slate-600 dark:text-slate-300">{item.stock_quantity}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono">${item.unit_price.toFixed(2)}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono">${item.sale_price.toFixed(2)}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 font-black text-slate-800 dark:text-slate-200 font-mono">${item.totalInvestment.toFixed(2)}</td>
                                            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 font-mono">${item.totalPotentialProfit.toFixed(2)}</td>
                                            <td className="p-4 text-center border-l border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditClick(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                No se encontraron datos para el reporte.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white border-t-2 border-slate-800">
                                    <tr className="font-black">
                                        <td colSpan={5} className="p-4 text-right text-[10px] uppercase tracking-widest text-slate-400">Totales Finales:</td>
                                        <td className="p-4 border-r border-slate-700 text-lg font-mono">${globals.investment.toFixed(2)}</td>
                                        <td className="p-4 bg-emerald-800 text-lg font-mono">${globals.profit.toFixed(2)}</td>
                                        <td className="p-4 bg-slate-900 border-t-2 border-slate-800"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="md:hidden bg-slate-50 dark:bg-slate-800/50 p-2 text-center border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
                                Desliza horizontalmente para ver balances <ChevronRight size={12}/>
                            </p>
                        </div>
                    </div>

                    {/* Modal de Edición */}
                    {editingItem && (
                        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                                        <Edit3 className="text-amber-500" /> Editar Producto
                                    </h3>
                                    <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nombre *</label>
                                        <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">SKU</label>
                                        <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.sku} onChange={e => setEditFormData({...editFormData, sku: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Proveedor</label>
                                        <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.supplier} onChange={e => setEditFormData({...editFormData, supplier: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Stock *</label>
                                        <input type="number" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.stock_quantity} onChange={e => setEditFormData({...editFormData, stock_quantity: e.target.value === '' ? '' : Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Costo ($) *</label>
                                        <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.unit_price} onChange={e => setEditFormData({...editFormData, unit_price: e.target.value === '' ? '' : Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Venta ($) *</label>
                                        <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={editFormData.sale_price} onChange={e => setEditFormData({...editFormData, sale_price: e.target.value === '' ? '' : Number(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => setEditingItem(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={isSaving || !editFormData.name || editFormData.stock_quantity === ''} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl shadow-sm transition-colors">
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal de Eliminación */}
                    {deletingItem && (
                        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mb-4">
                                        <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                                        Eliminar Producto
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                        ¿Estás seguro que deseas eliminar <strong>{deletingItem.name}</strong> del inventario? Esta acción no se puede deshacer.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <button onClick={() => setDeletingItem(null)} disabled={isDeleting} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={confirmDelete} disabled={isDeleting} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl shadow-sm transition-colors">
                                        {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* === PESTAÑA: ENCARGOS === */}
            {activeTab === 'orders' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600 p-2 rounded-lg shadow-md">
                                    <FileText className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Reporte de Encargos</h2>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Métricas de Pedidos</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-bold"
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value as any)}
                                >
                                    <option value="todos">Todos los Estados</option>
                                    <option value="pendiente">Solo Pendientes</option>
                                    <option value="pagado">Solo Pagados</option>
                                </select>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar cliente..." 
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                                        value={orderSearch}
                                        onChange={(e) => setOrderSearch(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={exportOrdersToPDF}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm font-bold active:scale-95"
                                >
                                    <Download size={16} />
                                    <span>PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Total Esperado</p>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">${ordersGlobals.totalSales.toFixed(2)}</h3>
                            </div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase mb-1">Total Cobrado</p>
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${ordersGlobals.totalCollected.toFixed(2)}</h3>
                            </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-500/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-500/20 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase mb-1">Total Pendiente</p>
                                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">${ordersGlobals.totalPending.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-800 dark:bg-slate-950 text-white">
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Fecha</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Cliente</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Producto</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Total Venta</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Abonado</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider border-r border-slate-700">Pendiente</th>
                                        <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                                    {filteredOrders.map((item, idx) => (
                                        <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'} hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-colors`}>
                                            <td className="p-4 font-mono text-xs text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800">{new Date(item.order_date).toLocaleDateString()}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">{item.customer_name}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">{item.product_description}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono">${item.sale_price.toFixed(2)}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-bold font-mono">${item.paidAmount.toFixed(2)}</td>
                                            <td className="p-4 border-r border-slate-100 dark:border-slate-800 font-black text-amber-600 dark:text-amber-400 font-mono">${item.pendingAmount.toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'pagado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                No se encontraron encargos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden bg-slate-50 dark:bg-slate-800/50 p-2 text-center border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
                                Desliza horizontalmente para ver la tabla completa <ChevronRight size={12}/>
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}