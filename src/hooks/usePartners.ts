import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiPartners } from '../services/api';
import { Partner, PartnerTransaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface PartnerWithStats extends Partner {
    netInvestment: number;
    profitAmount: number;
    totalBalance: number;
}

export function usePartners() {
    const { user } = useAuth();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [transactions, setTransactions] = useState<PartnerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [fetchedPartners, fetchedTransactions] = await Promise.all([
                apiPartners.getPartners(user.id),
                apiPartners.getPartnerTransactions(user.id)
            ]);
            setPartners(fetchedPartners);
            setTransactions(fetchedTransactions);
            setError(null);
        } catch (err: any) {
            console.error("Error loading partners:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const partnersWithStats = useMemo(() => {
        return partners.map(partner => {
            const partnerTx = transactions.filter(t => t.partner_id === partner.id);
            const totalInversion = partnerTx.filter(t => t.type === 'inversion').reduce((sum, t) => sum + Number(t.amount), 0);
            const totalRetiros = partnerTx.filter(t => t.type === 'retiro').reduce((sum, t) => sum + Number(t.amount), 0);
            
            const netInvestment = totalInversion - totalRetiros;
            // The profit is calculated dynamically based on net investment and profit percentage
            const profitAmount = netInvestment > 0 ? netInvestment * (Number(partner.profit_percentage) / 100) : 0;
            const totalBalance = netInvestment + profitAmount;

            return {
                ...partner,
                netInvestment,
                profitAmount,
                totalBalance
            };
        });
    }, [partners, transactions]);

    const addPartner = async (partnerData: Omit<Partner, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        if (!user) throw new Error("No user authenticated");
        try {
            await apiPartners.addPartner({ ...partnerData, user_id: user.id });
            await loadData();
        } catch (err: any) {
            console.error("Error adding partner:", err);
            throw err;
        }
    };

    const updatePartner = async (id: string, partnerData: Partial<Partner>) => {
        try {
            await apiPartners.updatePartner(id, partnerData);
            await loadData();
        } catch (err: any) {
            console.error("Error updating partner:", err);
            throw err;
        }
    };

    const deletePartner = async (id: string) => {
        try {
            await apiPartners.deletePartner(id);
            await loadData();
        } catch (err: any) {
            console.error("Error deleting partner:", err);
            throw err;
        }
    };

    const addTransaction = async (partnerId: string, type: 'inversion' | 'retiro', amount: number, description: string) => {
        if (!user) throw new Error("No user authenticated");
        try {
            await apiPartners.addPartnerTransaction({
                partner_id: partnerId,
                user_id: user.id,
                type,
                amount,
                description
            });
            await loadData();
        } catch (err: any) {
            console.error("Error adding partner transaction:", err);
            throw err;
        }
    };

    return {
        partners: partnersWithStats,
        transactions,
        loading,
        error,
        addPartner,
        updatePartner,
        deletePartner,
        addTransaction,
        refresh: loadData
    };
}
