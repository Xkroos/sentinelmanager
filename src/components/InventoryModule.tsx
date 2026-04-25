import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Package, Plus, Edit3, Trash2, DollarSign, 
    TrendingUp, XCircle, CheckCircle, Search, ShoppingCart, Truck, X 
} from 'lucide-react'; 

// --- DEFINICIÓN DE TIPOS ---
interface InventoryItem {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    sku: string | null;
    supplier: string | null;
    stock_quantity: number;
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
    const [saleQuantity, setSaleQuantity] = useState<number | ''>(''); 
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Estados de Formulario (Nuevo/Editar Item)
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        supplier: '',
        stock_quantity: '' as number | '',
        unit_price: '' as number | '',
        sale_price: '' as number | ''
    });

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // --------------------------------------------------
    // 🚀 CARGA DE DATOS
    // --------------------------------------------------
    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        try {
            const [invRes, orderRes] = await Promise.all([
                supabase.from('inventory_items').select('*').eq('user_id', user.id).order('name'),
                supabase.from('orders').select('*, payments(*)').eq('user_id', user.id).order('order_date', { ascending: false })
            ]);

            if (invRes.data) setItems(invRes.data as InventoryItem[]);
            if (orderRes.data) setOrders(orderRes.data as OrderWithPayments[]);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // --------------------------------------------------
    // 🛒 LÓGICA DE VENTA (RPC)
    // --------------------------------------------------
    const handleQuickSale = async () => {
        const item = items.find(i => i.id === selectedItemId);
        const quantity = Number(saleQuantity);

        if (!user || !item || isNaN(quantity) || quantity <= 0 || quantity > item.stock_quantity) {
            alert("Verifique la cantidad o el stock disponible.");
            return;
        }

        setIsProcessingSale(true);
        const { error } = await supabase.rpc('handle_quick_sale', {
            p_user_id: user.id,
            p_item_id: item.id,
            p_quantity: quantity,
            p_sale_price: item.sale_price
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            await loadData();
            setSelectedItemId('');
            setSaleQuantity('');
        }
        setIsProcessingSale(false);
    };

    // --------------------------------------------------
    // ✅ ACCIONES CRUD (Añadir / Editar / Eliminar)
    // --------------------------------------------------
    const handleSubmit = async () => {
        if (!user || !formData.name) {
            alert("El nombre del producto es obligatorio.");
            return;
        }

        // Generación automática de SKU si está vacío
        let finalSku = formData.sku;
        if (!finalSku && !editingItem) {
            const nextNumber = items.length + 1;
            finalSku = `SKU-${nextNumber.toString().padStart(3, '0')}`;
        }

        const payload = {
            name: formData.name,
            sku: finalSku || null,
            supplier: formData.supplier || null,
            stock_quantity: Number(formData.stock_quantity) || 0,
            unit_price: Number(formData.unit_price) || 0,
            sale_price: Number(formData.sale_price) || 0,
            user_id: user.id
        };

        if (editingItem) {
            const { error } = await supabase
                .from('inventory_items')
                .update(payload)
                .eq('id', editingItem.id);

            if (!error) {
                setEditingItem(null);
                setFormData({ name: '', sku: '', supplier: '', stock_quantity: '', unit_price: '', sale_price: '' });
                loadData();
            } else {
                alert("Error al actualizar: " + error.message);
            }
        } else {
            const { error } = await supabase.from('inventory_items').insert([payload]);
            if (!error) {
                setFormData({ name: '', sku: '', supplier: '', stock_quantity: '', unit_price: '', sale_price: '' });
                loadData();
            } else {
                alert("Error al insertar: " + error.message);
            }
        }
    };

    const startEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            sku: item.sku || '',
            supplier: item.supplier || '',
            stock_quantity: item.stock_quantity,
            unit_price: item.unit_price,
            sale_price: item.sale_price
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este producto permanentemente?')) return;
        await supabase.from('inventory_items').delete().eq('id', id);
        loadData();
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

    if (loading && items.length === 0) return <div className="p-10 text-center font-bold text-slate-400">CARGANDO INVENTARIO...</div>;

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
                        className="bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                    >
                        <option value="">Seleccionar producto...</option>
                        {items.map(i => (
                            <option key={i.id} value={i.id} disabled={i.stock_quantity <= 0}>
                                {i.name} ({i.stock_quantity} disp.) - ${i.sale_price.toFixed(2)}
                            </option>
                        ))}
                    </select>
                    <input 
                        type="number" 
                        placeholder="Ingrese una cantidad"
                        className="bg-slate-800 border-none rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                    <button 
                        onClick={handleQuickSale}
                        disabled={isProcessingSale || !selectedItemId || !saleQuantity}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-3 rounded-lg font-bold transition-all uppercase tracking-tight"
                    >
                        {isProcessingSale ? 'Registrando...' : 'Procesar Venta'}
                    </button>
                </div>
            </div>

            {/* Formulario de Entrada / Edición */}
            <div className={`rounded-xl p-6 shadow-sm border transition-all ${editingItem ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        {editingItem ? <><Edit3 size={18} className="text-amber-500"/> Editando Producto</> : <><Plus size={18} className="text-green-500"/> Registrar Mercancía</>}
                    </h3>
                    {editingItem && (
                        <button onClick={() => { setEditingItem(null); setFormData({name:'', sku:'', supplier:'', stock_quantity:'', unit_price:'', sale_price:''}) }} className="text-red-500 hover:underline text-xs font-bold flex items-center gap-1">
                            <X size={14}/> CANCELAR
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <input type="text" placeholder="Nombre" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="SKU (Auto)" className="input-field bg-slate-50" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    <input type="text" placeholder="Proveedor" className="input-field" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                    <input type="number" placeholder="Ingrese una cantidad" className="input-field" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value === '' ? '' : parseInt(e.target.value)})} />
                    <input type="number" step="0.01" placeholder="Costo" className="input-field" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                    <input type="number" step="0.01" placeholder="P. Venta" className="input-field" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                </div>
                <button 
                    onClick={handleSubmit} 
                    className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-colors ${editingItem ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                    {editingItem ? 'Guardar Cambios' : 'Añadir al Sistema'}
                </button>
                {!editingItem && <p className="text-[10px] text-slate-400 mt-2 italic">* El SKU se genera solo si dejas el campo vacío.</p>}
            </div>

            {/* Tabla de Inventario */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
                    <span className="font-bold text-slate-600 uppercase text-xs tracking-widest">Stock Actual</span>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" placeholder="Buscar producto..." 
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4 text-center">Stock</th>
                                <th className="p-4">Costo</th>
                                <th className="p-4">P. Venta</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-[10px] font-mono text-slate-400 uppercase">{item.sku || 'Sin SKU'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-slate-500 text-xs italic">
                                            <Truck size={12} /> {item.supplier || 'Genérico'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${item.stock_quantity < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {item.stock_quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 font-mono">${item.unit_price.toFixed(2)}</td>
                                    <td className="p-4 font-bold text-blue-600 font-mono">${item.sale_price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => startEdit(item)} className="p-2 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <style>{`
                .input-field { 
                    border: 1px solid #e2e8f0; 
                    padding: 0.5rem 0.75rem; 
                    border-radius: 0.5rem; 
                    font-size: 0.875rem; 
                    outline: none; 
                    transition: all 0.2s;
                    background: white;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                }
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
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{title}</p>
            <p className="text-2xl font-black mt-1">${Number(value).toFixed(2)}</p>
        </div>
    );
}