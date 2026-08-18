import { useState, useCallback, useEffect } from 'react';
import { apiOrders } from '../services/api';
import { OrderWithPayments } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderWithPayments[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiOrders.getOrders(user.id);
            // Aseguramos conversión de tipos
            const formattedOrders = data.map((order: any) => ({
                ...order,
                purchase_price: parseFloat(order.purchase_price?.toString() || '0'),
                sale_price: parseFloat(order.sale_price?.toString() || '0'),
                profit: parseFloat(order.profit?.toString() || '0'),
                merchandise_status: order.merchandise_status || 'por_comprar',
                payments: order.payments || []
            })) as OrderWithPayments[];
            setOrders(formattedOrders);
        } catch (err: any) {
            console.error("Error cargando órdenes:", err);
            setError(err.message || 'Error al cargar los encargos.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const deleteOrder = async (id: string) => {
        try {
            await apiOrders.deleteOrder(id);
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (err: any) {
            console.error("Error eliminando encargo:", err);
            throw err;
        }
    };

    return {
        orders,
        loading,
        error,
        loadOrders,
        deleteOrder
    };
}
