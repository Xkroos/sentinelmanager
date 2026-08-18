import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { X, Search, ShoppingCart, Trash2 } from 'lucide-react';

import { Order } from '../lib/supabase';
import { apiOrders, apiCustomers, apiInventory } from '../services/api';
import { InventorySelectorModal, CartItem } from './InventorySelectorModal';

interface OrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editOrder?: Order | null;
}

export function OrderForm({ onClose, onSuccess, editOrder }: OrderFormProps) {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [formData, setFormData] = useState({
    order_date: editOrder?.order_date || new Date().toISOString().split('T')[0],
    customer_name: editOrder?.customer_name || '',
    product_description: editOrder?.product_description || '',
    purchase_price: editOrder?.purchase_price && editOrder.purchase_price > 0 ? editOrder.purchase_price : '',
    sale_price: editOrder?.sale_price && editOrder.sale_price > 0 ? editOrder.sale_price : '',
    status: editOrder?.status || 'pendiente',
    merchandise_status: editOrder?.merchandise_status || 'por_comprar',
  });
  const [loading, setLoading] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedCartItems, setSelectedCartItems] = useState<CartItem[]>([]);

  const [customerPhone, setCustomerPhone] = useState(editOrder?.customer_phone || '');

  const handlePhoneBlur = async () => {
    if (customerPhone.trim() && user) {
      try {
        const customer = await apiCustomers.getCustomerByPhone(user.id, customerPhone.trim());
        if (customer) {
          setFormData(prev => ({ ...prev, customer_name: customer.name }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const cartPurchasePrice = selectedCartItems.reduce((acc, c) => acc + (c.item.unit_price * c.quantity), 0);
      const cartSalePrice = selectedCartItems.reduce((acc, c) => acc + (c.item.sale_price * c.quantity), 0);
      const cartDescription = selectedCartItems.map(c => `${c.quantity}x ${c.item.name}`).join(', ');

      const finalPurchasePrice = (typeof formData.purchase_price === 'number' ? formData.purchase_price : parseFloat(formData.purchase_price as string) || 0) + cartPurchasePrice;
      const finalSalePrice = (typeof formData.sale_price === 'number' ? formData.sale_price : parseFloat(formData.sale_price as string) || 0) + cartSalePrice;
      const finalDescription = [formData.product_description, cartDescription].filter(Boolean).join(', + ');

      if (editOrder) {
        let customerId = editOrder.customer_id;
        const phone = customerPhone.trim();
        if (phone) {
          const customer = await apiCustomers.getOrCreateCustomer(user.id, formData.customer_name, phone);
          if (customer) customerId = customer.id;
        }

        await apiOrders.updateOrder(editOrder.id, {
          ...formData,
          product_description: finalDescription,
          purchase_price: finalPurchasePrice,
          sale_price: finalSalePrice,
          customer_phone: phone || undefined,
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
      } else {
        await apiOrders.createOrder({
          ...formData,
          product_description: finalDescription,
          purchase_price: finalPurchasePrice,
          sale_price: finalSalePrice,
          customer_phone: customerPhone.trim() || undefined,
          user_id: user.id,
        });
      }

      if (selectedCartItems.length > 0) {
        const deductPayload = selectedCartItems.map(c => ({
            itemId: c.item.id,
            quantity: c.quantity
        }));
        await apiInventory.deductStock(deductPayload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      showToast('Error al guardar el encargo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cartPurchasePrice = selectedCartItems.reduce((acc, c) => acc + (c.item.unit_price * c.quantity), 0);
  const cartSalePrice = selectedCartItems.reduce((acc, c) => acc + (c.item.sale_price * c.quantity), 0);

  const profit = ((typeof formData.sale_price === 'number' ? formData.sale_price : parseFloat(formData.sale_price as string) || 0) + cartSalePrice) -
                 ((typeof formData.purchase_price === 'number' ? formData.purchase_price : parseFloat(formData.purchase_price as string) || 0) + cartPurchasePrice);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {editOrder ? 'Editar Encargo' : 'Nuevo Encargo'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) =>
                  setFormData({ ...formData, order_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Teléfono del Cliente (WhatsApp)
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="Ej. +584123456789"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción Manual
            </label>
            <textarea
              value={formData.product_description}
              onChange={(e) =>
                setFormData({ ...formData, product_description: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              rows={3}
              placeholder="Ej. Diseño personalizado..."
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ShoppingCart size={16} /> Productos del Inventario
              </h3>
              <button
                type="button"
                onClick={() => setShowInventory(true)}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center gap-1"
              >
                <Search size={14} /> Añadir
              </button>
            </div>
            
            {selectedCartItems.length > 0 && (
              <div className="space-y-2 mt-2">
                {selectedCartItems.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
                    <span className="font-medium text-slate-700">{c.quantity}x {c.item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">${(c.item.sale_price * c.quantity).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCartItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Costo Adicional Manual ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                placeholder="Ingrese el monto"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchase_price: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Precio Manual a Cobrar ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sale_price}
                placeholder="Ingrese el monto"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sale_price: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-slate-700">
              Ganancia: ${profit.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado de Pago
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'pendiente' | 'pagado' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado de Mercancía
              </label>
              <select
                value={formData.merchandise_status}
                onChange={(e) =>
                  setFormData({ ...formData, merchandise_status: e.target.value as 'comprada' | 'por_comprar' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              >
                <option value="por_comprar">Por Comprar</option>
                <option value="comprada">Comprada</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : editOrder ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      {showInventory && (
        <InventorySelectorModal
          onClose={() => setShowInventory(false)}
          onConfirm={(items) => {
            // Unir items existentes con los nuevos, sumando cantidad si ya existen
            setSelectedCartItems(prev => {
              const newItems = [...prev];
              items.forEach(newItem => {
                const existing = newItems.find(i => i.item.id === newItem.item.id);
                if (existing) {
                  existing.quantity += newItem.quantity;
                } else {
                  newItems.push({ ...newItem });
                }
              });
              return newItems;
            });
          }}
        />
      )}
    </div>
  );
}
