import { useState, useEffect, useMemo } from 'react';
import { X, Search, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { apiInventory, apiOrders } from '../services/api';
import { InventoryItem, Order } from '../lib/supabase';

interface AddMerchandiseModalProps {
    order: Order;
    onClose: () => void;
    onSuccess: () => void;
}

interface CartItem {
    item: InventoryItem;
    quantity: number;
}

export function AddMerchandiseModal({ order, onClose, onSuccess }: AddMerchandiseModalProps) {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        loadItems();
    }, [user]);

    const loadItems = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await apiInventory.getInventory(user.id);
            setItems(data);
        } catch (err: any) {
            showToast('Error al cargar el inventario: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [items, searchTerm]);

    const addToCart = (item: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                if (existing.quantity >= item.stock_quantity) {
                    showToast('Stock insuficiente', 'warning');
                    return prev;
                }
                return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            if (item.stock_quantity <= 0) {
                showToast('Producto agotado', 'warning');
                return prev;
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === itemId) {
                const newQ = c.quantity + delta;
                if (newQ > c.item.stock_quantity) {
                    showToast('Stock máximo alcanzado', 'warning');
                    return c;
                }
                if (newQ <= 0) return c; // Se usa remove en su lugar
                return { ...c, quantity: newQ };
            }
            return c;
        }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(c => c.item.id !== itemId));
    };

    const handleConfirm = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        try {
            const cartPayload = cart.map(c => ({
                itemId: c.item.id,
                quantity: c.quantity,
                salePrice: c.item.sale_price
            }));
            await apiOrders.addMerchandiseToOrder(order.id, cartPayload);
            showToast('Mercancía agregada exitosamente', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast('Error al agregar mercancía: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const totalToAdd = cart.reduce((sum, c) => sum + (c.item.sale_price * c.quantity), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="text-blue-500" />
                            Agregar al Encargo de {order.customer_name}
                        </h2>
                        <p className="text-slate-500 mt-1">Selecciona productos del inventario para añadirlos a este encargo.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Lista de Productos */}
                    <div className="flex-1 border-r border-slate-100 dark:border-slate-800 flex flex-col h-[50vh] md:h-auto overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o SKU..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white mx-auto"></div></div>
                            ) : filteredItems.length === 0 ? (
                                <div className="text-center p-8 text-slate-500">No se encontraron productos.</div>
                            ) : (
                                filteredItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                            <div className="text-sm text-slate-500">Stock: {item.stock_quantity} • ${item.sale_price.toFixed(2)}</div>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(item)}
                                            disabled={item.stock_quantity <= 0}
                                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Carrito */}
                    <div className="w-full md:w-96 bg-slate-50 dark:bg-slate-900/50 flex flex-col h-[40vh] md:h-auto border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ShoppingCart size={20} /> Resumen a Agregar
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="text-center p-8 text-slate-500 flex flex-col items-center gap-2">
                                    <ShoppingCart size={32} className="opacity-20" />
                                    No hay productos seleccionados
                                </div>
                            ) : (
                                cart.map(c => (
                                    <div key={c.item.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                                        <div className="flex justify-between font-bold text-slate-800 dark:text-white text-sm">
                                            <span className="truncate pr-2">{c.item.name}</span>
                                            <span>${(c.item.sale_price * c.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                                <button onClick={() => updateQuantity(c.item.id, -1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-bold text-sm w-4 text-center dark:text-white">{c.quantity}</span>
                                                <button onClick={() => updateQuantity(c.item.id, 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFromCart(c.item.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4 text-lg">
                                <span className="font-bold text-slate-600 dark:text-slate-400">Total a sumar:</span>
                                <span className="font-black text-blue-600 dark:text-blue-400">${totalToAdd.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={cart.length === 0 || saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><ShoppingCart size={20} /> Añadir al Encargo</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
