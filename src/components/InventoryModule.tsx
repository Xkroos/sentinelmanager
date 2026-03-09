import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Package, Plus, Edit3, Trash2, DollarSign, 
    TrendingUp, XCircle, CheckCircle, Search, ShoppingCart, Truck 
} from 'lucide-react'; 

// --- DEFINICIÓN DE TIPOS ---
interface InventoryItem {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    sku: string | null;
    supplier: string | null;
    stock_quantity: number; // Ajustado a tu estructura
    unit_price: number; 
    sale_price: number; 
}

interface Payment {
    id: string;
    amount: number;
}

interface OrderWithPayments {
    id: string;
    user_id: string;
    order_date: string;
    sale_price: number;
    payments: Payment[];
}

export function InventoryModule() {
    const { user } = useAuth();
    
    // Estados de datos
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [orders, setOrders] = useState<OrderWithPayments[]>([]); 
    const [loading, setLoading] = useState(true);

    // Estados de interfaz (Búsqueda y Venta)
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [saleQuantity, setSaleQuantity] = useState(1);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Estados de Formulario (Nuevo Item)
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        supplier: '',
        stock_quantity: 0,
        unit_price: 0,
        sale_price: 0
    });

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // --------------------------------------------------
    // 🚀 CARGA DE DATOS
    // --------------------------------------------------
    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const [invRes, orderRes] = await Promise.all([
            supabase.from('inventory_items').select('*').eq('user_id', user.id).order('name'),
            supabase.from('orders').select('*, payments(*)').eq('user_id', user.id).order('order_date', { ascending: false })
        ]);

        if (invRes.data) setItems(invRes.data as InventoryItem[]);
        if (orderRes.data) setOrders(orderRes.data as OrderWithPayments[]);
        
        setLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // --------------------------------------------------
    // 🛒 LÓGICA DE VENTA (RPC)
    // --------------------------------------------------
    const handleQuickSale = async () => {
        const item = items.find(i => i.id === selectedItemId);
        if (!user || !item || saleQuantity <= 0 || saleQuantity > item.stock_quantity) {
            alert("Verifique la cantidad o el stock disponible.");
            return;
        }

        setIsProcessingSale(true);
        const { error } = await supabase.rpc('handle_quick_sale', {
            p_user_id: user.id,
            p_item_id: item.id,
            p_quantity: saleQuantity,
            p_sale_price: item.sale_price
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            await loadData(); // Recarga todo para actualizar KPIs y tablas
            setSelectedItemId('');
            setSaleQuantity(1);
        }
        setIsProcessingSale(false);
    };

    // --------------------------------------------------
    // 🧠 CÁLCULOS Y FILTROS
    // --------------------------------------------------
    const filteredItems = useMemo(() => {
        return items.filter(i => 
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const stats = useMemo(() => {
        const inv = items.reduce((acc, i) => ({
            cost: acc.cost + (i.stock_quantity * i.unit_price),
            profit: acc.profit + (i.stock_quantity * (i.sale_price - i.unit_price))
        }), { cost: 0, profit: 0 });

        const sales = orders.reduce((acc, o) => {
            const paid = o.payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
            return {
                collected: acc.collected + paid,
                pending: acc.pending + (Number(o.sale_price) - paid)
            };
        }, { collected: 0, pending: 0 });

        return { ...inv, ...sales };
    }, [items, orders]);

    // --------------------------------------------------
    // ✅ ACCIONES CRUD
    // --------------------------------------------------
    const handleAddItem = async () => {
        if (!user || !formData.name) return;
        const { error } = await supabase.from('inventory_items').insert([{
            ...formData,
            user_id: user.id
        }]);

        if (!error) {
            setFormData({ name: '', sku: '', supplier: '', stock_quantity: 0, unit_price: 0, sale_price: 0 });
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este producto permanentemente?')) return;
        await supabase.from('inventory_items').delete().eq('id', id);
        loadData();
    };

    // --------------------------------------------------
    // 🎨 RENDERIZADO
    // --------------------------------------------------
    return (
        <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
            {/* Cabecera */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Package className="text-blue-600" /> INVENTARIO PRO
                </h2>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Inversión Stock" value={stats.cost} color="blue" />
                <StatCard title="Ganancia Estimada" value={stats.profit} color="green" />
                <StatCard title="Caja (Cobrado)" value={stats.collected} color="slate" />
                <StatCard title="Cuentas por Cobrar" value={stats.pending} color="orange" />
            </div>

            {/* Panel de Venta Rápida */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-blue-400">
                    <ShoppingCart size={20} />
                    <h3 className="font-bold uppercase tracking-wider">Venta Directa</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select 
                        className="bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500"
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                    >
                        <option value="">Seleccionar producto...</option>
                        {items.map(i => (
                            <option key={i.id} value={i.id} disabled={i.stock_quantity <= 0}>
                                {i.name} ({i.stock_quantity} disp.) - ${i.sale_price}
                            </option>
                        ))}
                    </select>
                    <input 
                        type="number" 
                        placeholder="Cantidad"
                        className="bg-slate-800 border-none rounded-lg p-3 text-white"
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                    />
                    <button 
                        onClick={handleQuickSale}
                        disabled={isProcessingSale || !selectedItemId}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-3 rounded-lg font-bold transition-all"
                    >
                        {isProcessingSale ? 'Registrando...' : 'PROCESAR VENTA'}
                    </button>
                </div>
            </div>

            {/* Formulario de Entrada */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Plus className="text-green-500" size={18} /> Registrar Nueva Mercancía
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <input type="text" placeholder="Nombre" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="SKU" className="input-field" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    <input type="text" placeholder="Proveedor" className="input-field" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                    <input type="number" placeholder="Stock" className="input-field" value={formData.stock_quantity || ''} onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value)})} />
                    <input type="number" placeholder="Costo" className="input-field" value={formData.unit_price || ''} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})} />
                    <input type="number" placeholder="P. Venta" className="input-field" value={formData.sale_price || ''} onChange={e => setFormData({...formData, sale_price: parseFloat(e.target.value)})} />
                </div>
                <button onClick={handleAddItem} className="mt-4 bg-slate-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-700">Añadir al Sistema</button>
            </div>

            {/* Tabla de Inventario */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                    <span className="font-bold text-slate-600">Stock Actual</span>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" placeholder="Buscar..." 
                            className="pl-10 pr-4 py-2 border rounded-full text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4 text-center">Stock</th>
                                <th className="p-4">Inversión</th>
                                <th className="p-4">Precio Venta</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-xs text-slate-400">SKU: {item.sku || 'N/A'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Truck size={14} /> {item.supplier || 'Genérico'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full font-bold ${item.stock_quantity < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {item.stock_quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">${item.unit_price.toFixed(2)}</td>
                                    <td className="p-4 font-bold text-blue-600">${item.sale_price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingItem(item)} className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* CSS inline para simplificar */}
            <style>{`
                .input-field { @apply border border-slate-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none; }
            `}</style>
        </div>
    );
}

function StatCard({ title, value, color }: any) {
    const variants: any = {
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        green: "bg-green-50 border-green-100 text-green-700",
        slate: "bg-slate-50 border-slate-100 text-slate-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700",
    };
    return (
        <div className={`p-5 rounded-2xl border shadow-sm ${variants[color]}`}>
            <p className="text-xs font-bold uppercase opacity-60 tracking-wider">{title}</p>
            <p className="text-2xl font-black mt-1">${Number(value).toFixed(2)}</p>
        </div>
    );
}