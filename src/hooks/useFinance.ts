import { useState, useCallback, useEffect } from 'react';
import { apiFinance } from '../services/api';
import { FinancialTransaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useFinance() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTransactions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiFinance.getTransactions(user.id);
            // Filtramos montos <= 0
            const validTransactions = data.filter(t => parseFloat(t.amount.toString()) > 0);
            setTransactions(validTransactions);
        } catch (err: any) {
            console.error("Error cargando transacciones:", err);
            setError(err.message || 'Error al cargar las transacciones financieras.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const addTransaction = async (type: 'inversion' | 'retiro', amount: number, description: string) => {
        if (!user) throw new Error("No user authenticated");
        try {
            await apiFinance.addTransaction({
                user_id: user.id,
                type,
                amount,
                description
            });
            await loadTransactions();
        } catch (err: any) {
            console.error("Error añadiendo transacción:", err);
            throw err;
        }
    };

    return {
        transactions,
        loading,
        error,
        loadTransactions,
        addTransaction
    };
}
