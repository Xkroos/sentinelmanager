import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useOrders } from '../hooks/useOrders';
import { useStatistics } from '../hooks/useStatistics';
import { apiCustomers } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { 
    Package, Plus, Edit3, Trash2, 
    Search, ShoppingCart, Truck, X 
} from 'lucide-react'; 
import { InventoryItem } from '../lib/supabase';

interface CartItem {
    id: string;
    inventoryItemId: string;
    name: string;
    quantity: number;
    salePrice: number;
}

export function InventoryModule() {
    const { items, loading: invLoading, error, addOrUpdateItem, deleteItem, processQuickSale, registerBatch, getBatches, getBatchItems, updateBatchItem, deleteBatch, updateBatch } = useInventory();
    const { loading: ordersLoading } = useOrders();
    const { globalStats } = useStatistics();

    const [searchTerm, setSearchTerm] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const { user } = useAuth();
    const { showToast, showConfirm } = useUI();

    const handlePhoneBlur = async () => {
        if (customerPhone.trim() && user) {
            try {
                const customer = await apiCustomers.getCustomerByPhone(user.id, customerPhone.trim());
                if (customer) {
                    setCustomerName(customer.name);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [showPosModal, setShowPosModal] = useState(false);
    const [posSearchTerm, setPosSearchTerm] = useState('');
    const [posCart, setPosCart] = useState<CartItem[]>([]);
    const [listQuantities, setListQuantities] = useState<Record<string, number | ''>>({});

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        supplier: '',
        stock_quantity: '' as number | '',
        unit_price: '' as number | '',
        sale_price: '' as number | ''
    });

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(filteredItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!(await showConfirm(`¿Estás seguro de que quieres eliminar ${selectedItems.length} productos permanentemente?`))) return;
        
        setIsDeletingBulk(true);
        try {
            for (const id of selectedItems) {
                await deleteItem(id);
            }
            setSelectedItems([]);
            showToast(`${selectedItems.length} productos eliminados`, 'success');
        } catch (err: any) {
            showToast('Error eliminando productos: ' + err.message, 'error');
        } finally {
            setIsDeletingBulk(false);
        }
    };

    // Lote State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchData, setBatchData] = useState({ batchName: '', batchDate: new Date().toISOString().split('T')[0], shippingCost: '' as number | '', shippingMethod: '' });
    const [batchItems, setBatchItems] = useState<(Partial<InventoryItem> & { isNew: boolean, tempId: string })[]>([]);
    const [batchFormItem, setBatchFormItem] = useState({ name: '', sku: '', supplier: '', stock_quantity: '' as number | '', unit_price: '' as number | '', sale_price: '' as number | '', existingId: '' });
    const [isRegisteringBatch, setIsRegisteringBatch] = useState(false);

    // Lotes Historial State
    const [viewMode, setViewMode] = useState<'global' | 'batches'>('global');
    const [historialBatches, setHistorialBatches] = useState<any[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
    const [selectedBatchItems, setSelectedBatchItems] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    
    // Editar Batch Item
    const [editingBatchItem, setEditingBatchItem] = useState<any | null>(null);
    const [editBatchFormData, setEditBatchFormData] = useState({ quantity: 0, unit_price: 0, sale_price: 0 });
    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

    const [editingBatchObj, setEditingBatchObj] = useState<any | null>(null);
    const [editBatchObjFormData, setEditBatchObjFormData] = useState({ batch_name: '', batch_date: '', shipping_method: '', shipping_cost: 0 });
    const [deletingBatchObj, setDeletingBatchObj] = useState<any | null>(null);
    const [isProcessingBatchAction, setIsProcessingBatchAction] = useState(false);

    const alert = (msg: string) => showToast(msg, msg.toLowerCase().includes('error') || msg.toLowerCase().includes('obligatori') || msg.toLowerCase().includes('verifique') || msg.toLowerCase().includes('por favor') || msg.toLowerCase().includes('agregue al menos') ? 'error' : 'success');

    const loading = invLoading || ordersLoading;

    const totalBatchItemsInversion = selectedBatchItems.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity)), 0);
    const totalBatchShipping = selectedBatch ? Number(selectedBatch.shipping_cost || 0) : 0;
    const totalBatchInversion = totalBatchItemsInversion + totalBatchShipping;
    const totalBatchVentas = selectedBatchItems.reduce((acc, item) => acc + (Number(item.sale_price) * Number(item.quantity)), 0);
    const totalBatchGanancia = totalBatchVentas - totalBatchInversion;

    // Fetch batches when entering view mode
    useEffect(() => {
        if (viewMode === 'batches') {
            loadHistorialBatches();
        }
    }, [viewMode]);

    const loadHistorialBatches = async () => {
        setLoadingBatches(true);
        try {
            const data = await getBatches();
            setHistorialBatches(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingBatches(false);
        }
    };

    const handleSelectBatch = async (batch: any) => {
        setSelectedBatch(batch);
        setLoadingBatches(true);
        try {
            const data = await getBatchItems(batch.id);
            setSelectedBatchItems(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingBatches(false);
        }
    };

    const handleDeleteBatchObj = async () => {
        if (!deletingBatchObj) return;
        setIsProcessingBatchAction(true);
        try {
            await deleteBatch(deletingBatchObj.id);
            setHistorialBatches(prev => prev.filter(b => b.id !== deletingBatchObj.id));
            setDeletingBatchObj(null);
        } catch (error: any) {
            console.error(error);
            alert("Error eliminando lote: " + error.message);
        } finally {
            setIsProcessingBatchAction(false);
        }
    };

    const handleSaveBatchEditObj = async () => {
        if (!editingBatchObj) return;
        setIsProcessingBatchAction(true);
        try {
            await updateBatch(editingBatchObj.id, editBatchObjFormData);
            setHistorialBatches(prev => prev.map(b => b.id === editingBatchObj.id ? { ...b, ...editBatchObjFormData } : b));
            setEditingBatchObj(null);
        } catch (error: any) {
            console.error(error);
            alert("Error actualizando lote: " + error.message);
        } finally {
            setIsProcessingBatchAction(false);
        }
    };

    const handleSaveBatchItemEdit = async () => {
        if (!editingBatchItem) return;
        setIsUpdatingBatch(true);
        try {
            await updateBatchItem(
                editingBatchItem.id, 
                editingBatchItem.inventory_item_id, 
                editBatchFormData.quantity, 
                editBatchFormData.unit_price, 
                editBatchFormData.sale_price
            );
            // Recargar items del lote
            const data = await getBatchItems(selectedBatch.id);
            setSelectedBatchItems(data);
            setEditingBatchItem(null);
            alert("Lote y Stock global actualizados");
        } catch (err: any) {
            alert("Error actualizando: " + err.message);
        } finally {
            setIsUpdatingBatch(false);
        }
    };

    const handleAddToCart = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        const quantity = Number(listQuantities[itemId]);

        if (!item || isNaN(quantity) || quantity <= 0) {
            alert("Verifique el producto y la cantidad.");
            return;
        }

        const currentCartQty = posCart.filter(c => c.inventoryItemId === item.id).reduce((acc, c) => acc + c.quantity, 0);
        if (currentCartQty + quantity > item.stock_quantity) {
            alert("No hay suficiente stock para esa cantidad.");
            return;
        }

        const existingCartItemIndex = posCart.findIndex(c => c.inventoryItemId === item.id);
        
        if (existingCartItemIndex >= 0) {
            const newCart = [...posCart];
            newCart[existingCartItemIndex].quantity += quantity;
            setPosCart(newCart);
        } else {
            const newItem: CartItem = {
                id: Date.now().toString() + Math.random(),
                inventoryItemId: item.id,
                name: item.name,
                quantity: quantity,
                salePrice: item.sale_price
            };
            setPosCart([...posCart, newItem]);
        }

        // Reset the quantity for this item
        setListQuantities(prev => ({...prev, [itemId]: ''}));
    };
    
    const handleRemoveFromCart = (id: string) => {
        setPosCart(posCart.filter(i => i.id !== id));
    };

    const handleQuickSale = async () => {
        if (posCart.length === 0) {
            alert("El carrito está vacío.");
            return;
        }

        if (!customerName.trim()) {
            alert("Por favor ingrese el nombre del cliente.");
            return;
        }

        setIsProcessingSale(true);
        try {
            const cartPayload = posCart.map(item => ({
                itemId: item.inventoryItemId,
                quantity: item.quantity,
                salePrice: item.salePrice
            }));
            
            await processQuickSale(cartPayload, customerName.trim(), customerPhone.trim());
            setPosCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setShowPosModal(false);
            showToast("Venta procesada con éxito", "success");
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setIsProcessingSale(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            alert("El nombre del producto es obligatorio.");
            return;
        }

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
            sale_price: Number(formData.sale_price) || 0
        };

        try {
            await addOrUpdateItem(payload, editingItem?.id);
            alert(editingItem ? "Producto actualizado correctamente" : "Producto registrado correctamente");
            setEditingItem(null);
            setFormData({ name: '', sku: '', supplier: '', stock_quantity: '', unit_price: '', sale_price: '' });
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleAddBatchItem = () => {
        if (!batchFormItem.name || !batchFormItem.stock_quantity) {
            alert("Nombre y cantidad son obligatorios.");
            return;
        }
        
        let finalSku = batchFormItem.sku;
        if (!finalSku && !batchFormItem.existingId) {
            const nextNumber = items.length + batchItems.length + 1;
            finalSku = `SKU-${nextNumber.toString().padStart(3, '0')}`;
        }

        setBatchItems([...batchItems, {
            tempId: Date.now().toString(),
            isNew: !batchFormItem.existingId,
            id: batchFormItem.existingId || undefined,
            name: batchFormItem.name,
            sku: finalSku || undefined,
            supplier: batchFormItem.supplier || undefined,
            stock_quantity: Number(batchFormItem.stock_quantity),
            unit_price: Number(batchFormItem.unit_price) || 0,
            sale_price: Number(batchFormItem.sale_price) || 0
        }]);
        setBatchFormItem({ name: '', sku: '', supplier: '', stock_quantity: '', unit_price: '', sale_price: '', existingId: '' });
    };

    const handleRemoveBatchItem = (tempId: string) => {
        setBatchItems(batchItems.filter(i => i.tempId !== tempId));
    };

    const handleSubmitBatch = async () => {
        if (batchItems.length === 0) {
            alert("Agregue al menos un producto al lote.");
            return;
        }
        setIsRegisteringBatch(true);
        try {
            await registerBatch({
                batchName: batchData.batchName,
                batchDate: batchData.batchDate,
                shippingCost: Number(batchData.shippingCost) || 0,
                shippingMethod: batchData.shippingMethod
            }, batchItems);
            setShowBatchModal(false);
            setBatchData({ batchName: '', batchDate: new Date().toISOString().split('T')[0], shippingCost: '', shippingMethod: '' });
            setBatchItems([]);
            alert("Lote registrado con éxito");
            
            if (viewMode === 'batches') {
                loadHistorialBatches();
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setIsRegisteringBatch(false);
        }
    };
    
    const handleSelectExistingItemForBatch = (id: string) => {
        if (!id) {
            setBatchFormItem({ ...batchFormItem, existingId: '', name: '', sku: '', supplier: '', unit_price: '', sale_price: '' });
            return;
        }
        const item = items.find(i => i.id === id);
        if (item) {
            setBatchFormItem({
                existingId: item.id,
                name: item.name,
                sku: item.sku || '',
                supplier: item.supplier || '',
                stock_quantity: '',
                unit_price: item.unit_price,
                sale_price: item.sale_price
            });
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
        if (!(await showConfirm('¿Eliminar este producto permanentemente?'))) return;
        try {
            await deleteItem(id);
            alert("Producto eliminado correctamente");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const filteredItems = useMemo(() => {
        return items.filter(i => 
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const posFilteredItems = useMemo(() => {
        return items.filter(i => 
            i.name.toLowerCase().includes(posSearchTerm.toLowerCase()) ||
            i.sku?.toLowerCase().includes(posSearchTerm.toLowerCase())
        );
    }, [items, posSearchTerm]);

    const stats = useMemo(() => {
        const inv = items.reduce((acc, i) => ({
            cost: acc.cost + (i.stock_quantity * i.unit_price),
            profit: acc.profit + (i.stock_quantity * (i.sale_price - i.unit_price))
        }), { cost: 0, profit: 0 });

        return inv;
    }, [items]);

    if (loading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>;
    }

    if (error) {
        return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Package className="text-blue-600 dark:text-blue-400" /> INVENTARIO PRO
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowBatchModal(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Package size={20} />
                        <span className="hidden sm:inline">Entrada Lote</span>
                    </button>
                    <button 
                        onClick={() => setShowPosModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                    >
                        <ShoppingCart size={20} />
                        <span className="hidden sm:inline">POS / Venta</span>
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Inversión Stock" value={stats.cost} color="blue" />
                <StatCard title="Ganancia Estimada" value={stats.profit} color="emerald" />
                <StatCard title="Caja (Cobrado)" value={globalStats.totalPaid} color="slate" />
                <StatCard title="Cuentas por Cobrar" value={globalStats.totalPending} color="amber" />
            </div>

            {/* Modal Punto de Venta */}
            {showPosModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <ShoppingCart className="text-blue-500" /> PUNTO DE VENTA
                            </h3>
                            <button onClick={() => setShowPosModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono del Cliente (WhatsApp)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. +584123456789"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-3"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    onBlur={handlePhoneBlur}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Cliente</label>
                                <input 
                                    type="text" 
                                    placeholder="Nombre de la persona"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Buscar y Añadir Producto</label>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre o SKU..."
                                    className="w-full mb-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                    value={posSearchTerm}
                                    onChange={(e) => setPosSearchTerm(e.target.value)}
                                />
                                
                                {/* Lista Visual de Productos */}
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-56 overflow-y-auto bg-white dark:bg-slate-900 shadow-inner">
                                    {posFilteredItems.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No se encontraron productos.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {posFilteredItems.map(item => (
                                                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</p>
                                                        <p className="text-xs flex gap-2 mt-0.5">
                                                            <span className={item.stock_quantity > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                                                                {item.stock_quantity} disp.
                                                            </span>
                                                            <span className="text-slate-400">•</span>
                                                            <span className="text-slate-500 font-bold">${item.sale_price.toFixed(2)} c/u</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            placeholder="Cant."
                                                            className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            value={listQuantities[item.id] ?? ''}
                                                            onChange={(e) => setListQuantities({...listQuantities, [item.id]: e.target.value === '' ? '' : parseInt(e.target.value)})}
                                                            disabled={item.stock_quantity <= 0}
                                                        />
                                                        <button 
                                                            onClick={() => handleAddToCart(item.id)}
                                                            disabled={item.stock_quantity <= 0 || !listQuantities[item.id] || (listQuantities[item.id] as number) <= 0 || (listQuantities[item.id] as number) > item.stock_quantity}
                                                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 p-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                                                            title="Añadir al carrito"
                                                        >
                                                            <Plus size={16} /> Añadir
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mostrar el carrito */}
                            <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                    <span>Carrito ({posCart.length})</span>
                                    <span>Total: ${posCart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0).toFixed(2)}</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto p-2">
                                    {posCart.length === 0 ? (
                                        <div className="text-center text-slate-400 text-sm py-4">El carrito está vacío</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {posCart.map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.name}</p>
                                                        <p className="text-xs text-slate-500">{item.quantity} x ${item.salePrice.toFixed(2)} = ${(item.quantity * item.salePrice).toFixed(2)}</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-rose-500 hover:text-rose-600 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleQuickSale}
                                disabled={isProcessingSale || posCart.length === 0 || !customerName.trim()}
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 py-3 rounded-xl font-black transition-all uppercase tracking-tight text-white active:scale-95 disabled:active:scale-100 disabled:opacity-50 shadow-sm"
                            >
                                {isProcessingSale ? 'Registrando...' : 'Procesar Venta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Registro por Lote */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Package className="text-emerald-500" /> REGISTRO DE MERCANCÍA POR LOTE
                            </h3>
                            <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nombre Lote / Ref.</label>
                                <input type="text" placeholder="Ej: Lote 1, Contenedor X" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchData.batchName} onChange={e => setBatchData({...batchData, batchName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
                                <input type="date" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchData.batchDate} onChange={e => setBatchData({...batchData, batchDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Costo Envío ($)</label>
                                <input type="number" step="0.01" placeholder="Ej: 50.00" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchData.shippingCost} onChange={e => setBatchData({...batchData, shippingCost: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Vía</label>
                                <input type="text" placeholder="Ej: Marítimo, DHL, Zoom" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchData.shippingMethod} onChange={e => setBatchData({...batchData, shippingMethod: e.target.value})} />
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Agregar Productos al Lote</h4>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                                <div className="mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Seleccionar producto existente (o dejar vacío para crear nuevo)</label>
                                    <select 
                                        className="w-full md:w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                                        value={batchFormItem.existingId}
                                        onChange={(e) => handleSelectExistingItemForBatch(e.target.value)}
                                    >
                                        <option value="">-- NUEVO PRODUCTO --</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name} (SKU: {i.sku})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                    <input type="text" placeholder="Nombre *" className="col-span-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchFormItem.name} onChange={e => setBatchFormItem({...batchFormItem, name: e.target.value})} disabled={!!batchFormItem.existingId} />
                                    <input type="text" placeholder="SKU" className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchFormItem.sku} onChange={e => setBatchFormItem({...batchFormItem, sku: e.target.value})} disabled={!!batchFormItem.existingId} title="Si dejas vacío, se autogenerará" />
                                    <input type="text" placeholder="Proveedor" className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchFormItem.supplier} onChange={e => setBatchFormItem({...batchFormItem, supplier: e.target.value})} disabled={!!batchFormItem.existingId} />
                                    <input type="number" placeholder="Cant. *" className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white border-emerald-500/50 focus:ring-emerald-500" value={batchFormItem.stock_quantity} onChange={e => setBatchFormItem({...batchFormItem, stock_quantity: e.target.value === '' ? '' : parseInt(e.target.value)})} />
                                    <input type="number" step="0.01" placeholder="Costo *" className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchFormItem.unit_price} onChange={e => setBatchFormItem({...batchFormItem, unit_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                                    <input type="number" step="0.01" placeholder="P. Venta *" className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={batchFormItem.sale_price} onChange={e => setBatchFormItem({...batchFormItem, sale_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                                </div>
                                <div className="mt-3 text-right">
                                    <button onClick={handleAddBatchItem} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                                        + Agregar a la lista
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">Lista de Mercancía ({batchItems.length})</h4>
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[100px]">
                                {batchItems.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm font-medium">Aún no has agregado productos al lote.</div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3">Producto</th>
                                                <th className="p-3 text-center">Tipo</th>
                                                <th className="p-3 text-center">Cant.</th>
                                                <th className="p-3">Costo</th>
                                                <th className="p-3">P. Venta</th>
                                                <th className="p-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {batchItems.map(item => (
                                                <tr key={item.tempId} className="dark:text-slate-300">
                                                    <td className="p-3 font-medium">{item.name}</td>
                                                    <td className="p-3 text-center">
                                                        {item.isNew ? <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">NUEVO</span> : <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded">STOCK +</span>}
                                                    </td>
                                                    <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">+{item.stock_quantity}</td>
                                                    <td className="p-3">${item.unit_price?.toFixed(2)}</td>
                                                    <td className="p-3">${item.sale_price?.toFixed(2)}</td>
                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleRemoveBatchItem(item.tempId)} className="text-rose-500 hover:text-rose-700"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                onClick={handleSubmitBatch}
                                disabled={isRegisteringBatch || batchItems.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-8 py-3 rounded-xl font-black transition-all shadow-sm"
                            >
                                {isRegisteringBatch ? 'Guardando...' : 'GUARDAR LOTE COMPLETO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${editingItem ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {editingItem ? <><Edit3 size={18} className="text-amber-500"/> Editando Producto (Global)</> : <><Plus size={18} className="text-emerald-500"/> Registrar Mercancía Individual</>}
                    </h3>
                    {editingItem && (
                        <button onClick={() => { setEditingItem(null); setFormData({name:'', sku:'', supplier:'', stock_quantity:'', unit_price:'', sale_price:''}) }} className="text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                            <X size={14}/> CANCELAR
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <input type="text" placeholder="Nombre" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="SKU (Auto)" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    <input type="text" placeholder="Proveedor" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                    <input type="number" placeholder="Cantidad" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value === '' ? '' : parseInt(e.target.value)})} />
                    <input type="number" step="0.01" placeholder="Costo ($)" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                    <input type="number" step="0.01" placeholder="Venta ($)" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all text-sm" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                </div>
                <div className="flex items-center justify-between mt-6">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">* El SKU se genera solo si dejas el campo vacío.</p>
                    <button 
                        onClick={handleSubmit} 
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 ${editingItem ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white'}`}
                    >
                        {editingItem ? 'Guardar Cambios' : 'Añadir al Sistema'}
                    </button>
                </div>
            </div>

            {/* Pestañas (Stock Global vs Lotes) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button 
                    onClick={() => setViewMode('global')}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${viewMode === 'global' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    STOCK GLOBAL
                </button>
                <button 
                    onClick={() => { setViewMode('batches'); setSelectedBatch(null); }}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${viewMode === 'batches' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    HISTORIAL DE LOTES
                </button>
            </div>

            {/* VISTA: STOCK GLOBAL */}
            {viewMode === 'global' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Stock Actual</span>
                        {selectedItems.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeletingBulk}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                {isDeletingBulk ? 'Eliminando...' : `Eliminar Seleccionados (${selectedItems.length})`}
                            </button>
                        )}
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" placeholder="Buscar producto..." 
                            className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-blue-500 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                        checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4 text-center">Stock</th>
                                <th className="p-4">Costo</th>
                                <th className="p-4">P. Venta</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {filteredItems.map(item => (
                                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${selectedItems.includes(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox"
                                            className="rounded text-blue-500 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => handleSelectItem(item.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{item.sku || 'Sin SKU'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                                            <Truck size={12} className="opacity-70" /> {item.supplier || 'Genérico'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-lg font-bold text-xs ${item.stock_quantity < 5 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                            {item.stock_quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono font-medium">${item.unit_price.toFixed(2)}</td>
                                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400 font-mono">${item.sale_price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => startEdit(item)} className="p-2 hover:bg-amber-100 text-amber-600 dark:hover:bg-amber-500/20 dark:text-amber-400 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-lg transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        No se encontraron productos
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* VISTA: HISTORIAL DE LOTES */}
            {viewMode === 'batches' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in min-h-[300px]">
                    {selectedBatch ? (
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                    <X size={20} />
                                </button>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white">{selectedBatch.batch_name}</h3>
                                    <p className="text-sm text-slate-500">Fecha: {selectedBatch.batch_date} • Vía: {selectedBatch.shipping_method || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Inversión Total</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        ${totalBatchInversion.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Mercancía: ${totalBatchItemsInversion.toFixed(2)} + Envío: ${totalBatchShipping.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Proyección Ventas</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        ${totalBatchVentas.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Total al vender todo el stock
                                    </p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-500 mb-1">Ganancia Estimada</p>
                                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                                        ${totalBatchGanancia.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-1 font-medium">
                                        Ganancia bruta esperada
                                    </p>
                                </div>
                            </div>
                            
                            {loadingBatches ? (
                                <div className="text-center p-8 text-slate-500">Cargando productos del lote...</div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="p-4">Producto</th>
                                                <th className="p-4 text-center">Cant. Original</th>
                                                <th className="p-4">Costo Unit.</th>
                                                <th className="p-4">P. Venta</th>
                                                <th className="p-4">Tipo de Ingreso</th>
                                                <th className="p-4 text-center">Modificar Lote</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {selectedBatchItems.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group dark:text-slate-300">
                                                    <td className="p-4 font-bold">{item.inventory_item?.name || 'Desconocido'}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-mono font-medium">{item.quantity}</span>
                                                    </td>
                                                    <td className="p-4">${Number(item.unit_price).toFixed(2)}</td>
                                                    <td className="p-4">${Number(item.sale_price).toFixed(2)}</td>
                                                    <td className="p-4">
                                                        {item.is_new_product ? <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">NUEVO PRODUCTO</span> : <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">AGREGADO A STOCK</span>}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingBatchItem(item);
                                                                setEditBatchFormData({ quantity: item.quantity, unit_price: item.unit_price, sale_price: item.sale_price });
                                                            }} 
                                                            className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            Editar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4">
                            {loadingBatches ? (
                                <div className="text-center p-8 text-slate-500">Cargando historial...</div>
                            ) : historialBatches.length === 0 ? (
                                <div className="text-center p-8 text-slate-500">No hay lotes registrados todavía.</div>
                            ) : (
                                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {historialBatches.map(batch => (
                                        <div 
                                            key={batch.id} 
                                            onClick={() => handleSelectBatch(batch)}
                                            className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-lg">{batch.batch_name}</h4>
                                                <span className="text-xs font-black text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{batch.batch_date}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                                <p>Vía: {batch.shipping_method || 'No especificada'}</p>
                                                <p>Costo Envío: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">${Number(batch.shipping_cost).toFixed(2)}</span></p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                                    Ver productos &rarr;
                                                </div>
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => { setEditingBatchObj(batch); setEditBatchObjFormData({ batch_name: batch.batch_name, batch_date: batch.batch_date, shipping_method: batch.shipping_method || '', shipping_cost: batch.shipping_cost || 0 }); }} className="p-1.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20 rounded-lg transition-colors" title="Editar Lote">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => setDeletingBatchObj(batch)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-lg transition-colors" title="Eliminar Lote">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Editar Lote (Objeto) */}
            {editingBatchObj && (
                <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg">Editar Lote</h3>
                            <button onClick={() => setEditingBatchObj(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Lote *</label>
                                <input type="text" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchObjFormData.batch_name} onChange={e => setEditBatchObjFormData({...editBatchObjFormData, batch_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha *</label>
                                <input type="date" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchObjFormData.batch_date} onChange={e => setEditBatchObjFormData({...editBatchObjFormData, batch_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Vía de Envío (Opcional)</label>
                                <input type="text" placeholder="Ej: DHL, Marítimo..." className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchObjFormData.shipping_method} onChange={e => setEditBatchObjFormData({...editBatchObjFormData, shipping_method: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Costo de Envío ($)</label>
                                <input type="number" step="0.01" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchObjFormData.shipping_cost} onChange={e => setEditBatchObjFormData({...editBatchObjFormData, shipping_cost: parseFloat(e.target.value) || 0})} />
                            </div>
                            <button onClick={handleSaveBatchEditObj} disabled={isProcessingBatchAction || !editBatchObjFormData.batch_name || !editBatchObjFormData.batch_date} className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all active:scale-95 mt-2">
                                {isProcessingBatchAction ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Eliminar Lote */}
            {deletingBatchObj && (
                <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="text-rose-600 dark:text-rose-400" size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Eliminar Lote</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            ¿Estás seguro que deseas eliminar el lote <strong>{deletingBatchObj.batch_name}</strong>? Se borrará de tu historial. Esta acción no revertirá el stock de los productos.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeletingBatchObj(null)} disabled={isProcessingBatchAction} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleDeleteBatchObj} disabled={isProcessingBatchAction} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors">
                                {isProcessingBatchAction ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Editar Batch Item */}
            {editingBatchItem && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg">Modificar Producto del Lote</h3>
                            <button onClick={() => setEditingBatchItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Al modificar la cantidad aquí, se ajustará automáticamente el stock global. <br/>
                            <strong>Producto:</strong> {editingBatchItem.inventory_item?.name}
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Cantidad Original Registrada</label>
                                <input type="number" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchFormData.quantity} onChange={e => setEditBatchFormData({...editBatchFormData, quantity: parseInt(e.target.value) || 0})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Costo Unitario ($)</label>
                                <input type="number" step="0.01" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchFormData.unit_price} onChange={e => setEditBatchFormData({...editBatchFormData, unit_price: parseFloat(e.target.value) || 0})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Precio de Venta ($)</label>
                                <input type="number" step="0.01" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" value={editBatchFormData.sale_price} onChange={e => setEditBatchFormData({...editBatchFormData, sale_price: parseFloat(e.target.value) || 0})} />
                            </div>
                            <button 
                                onClick={handleSaveBatchItemEdit}
                                disabled={isUpdatingBatch}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-2"
                            >
                                {isUpdatingBatch ? 'Actualizando...' : 'Guardar y Actualizar Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function StatCard({ title, value, color }: { title: string; value: number; color: 'blue' | 'emerald' | 'slate' | 'amber' }) {
    const variants = {
        blue: "bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-500/5 dark:border-blue-500/10 dark:text-blue-400",
        emerald: "bg-emerald-50/50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/10 dark:text-emerald-400",
        slate: "bg-slate-50/50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300",
        amber: "bg-amber-50/50 border-amber-100 text-amber-700 dark:bg-amber-500/5 dark:border-amber-500/10 dark:text-amber-400",
    };
    return (
        <div className={`p-6 rounded-2xl border ${variants[color]} transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
            <p className="text-3xl font-black">${Number(value).toFixed(2)}</p>
        </div>
    );
}