import { useState, useCallback, useEffect } from 'react';
import { apiInventory } from '../services/api';
import { InventoryItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useInventory() {
    const { user } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInventory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiInventory.getInventory(user.id);
            setItems(data);
        } catch (err: any) {
            console.error("Error cargando inventario:", err);
            setError(err.message || 'Error al cargar el inventario.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    const addOrUpdateItem = async (itemData: Partial<InventoryItem>, id?: string) => {
        try {
            if (id) {
                await apiInventory.updateItem(id, itemData);
            } else {
                await apiInventory.createItem({ ...itemData, user_id: user?.id });
            }
            await loadInventory();
        } catch (err: any) {
            console.error("Error guardando item de inventario:", err);
            throw err;
        }
    };

    const deleteItem = async (id: string) => {
        try {
            await apiInventory.deleteItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error("Error eliminando item:", err);
            throw err;
        }
    };

    const processQuickSale = async (cartItems: {itemId: string, quantity: number, salePrice: number}[], customerName: string, customerPhone?: string) => {
        if (!user) throw new Error("No user authenticated");
        try {
            await apiInventory.processQuickSale(user.id, cartItems, customerName, customerPhone);
            await loadInventory();
        } catch (err: any) {
            console.error("Error procesando venta rápida:", err);
            throw err;
        }
    };

    const registerBatch = async (
        batchData: { batchName: string, batchDate: string, shippingCost: number, shippingMethod: string },
        items: (Partial<InventoryItem> & { isNew: boolean })[]
    ) => {
        if (!user) throw new Error("No user authenticated");
        try {
            await apiInventory.registerBatch(user.id, batchData, items);
            await loadInventory();
        } catch (err: any) {
            console.error("Error registrando lote:", err);
            throw err;
        }
    };

    const getBatches = async () => {
        if (!user) throw new Error("No user authenticated");
        return await apiInventory.getBatches(user.id);
    };

    const getBatchItems = async (batchId: string) => {
        return await apiInventory.getBatchItems(batchId);
    };

    const updateBatchItem = async (batchItemId: string, globalItemId: string, newQuantity: number, newUnitPrice: number, newSalePrice: number) => {
        await apiInventory.updateBatchItem(batchItemId, globalItemId, newQuantity, newUnitPrice, newSalePrice);
        await loadInventory(); // Recargar inventario global ya que cambió el stock/precio
    };

    const deleteBatch = async (batchId: string) => {
        await apiInventory.deleteBatch(batchId);
    };

    const updateBatch = async (batchId: string, updates: { batch_name: string, batch_date: string, shipping_method: string, shipping_cost: number }) => {
        await apiInventory.updateBatch(batchId, updates);
    };

    return {
        items,
        loading,
        error,
        loadInventory,
        addOrUpdateItem,
        deleteItem,
        processQuickSale,
        registerBatch,
        getBatches,
        getBatchItems,
        updateBatchItem,
        deleteBatch,
        updateBatch
    };
}
