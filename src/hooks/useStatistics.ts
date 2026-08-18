import { useCallback, useMemo } from 'react';
import { useOrders } from './useOrders';
import { useFinance } from './useFinance';
import { useInventory } from './useInventory';
import { usePartners } from './usePartners';

export function useStatistics(period: 'week' | 'month' | 'year' = 'month') {
    const { orders, loading: loadingOrders } = useOrders();
    const { transactions, loading: loadingFinance } = useFinance();
    const { items, loading: loadingInventory } = useInventory();
    const { transactions: partnerTransactions, loading: loadingPartners } = usePartners();

    const getDateRange = useCallback(() => {
        const now = new Date();
        let startDate = new Date();
        if (period === 'week') startDate.setDate(now.getDate() - 7);
        else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setFullYear(now.getFullYear() - 1);
        return startDate;
    }, [period]);

    // Financial Transactions Aggregation
    const financialExpenses = useMemo(() => {
        const startDate = getDateRange();
        return transactions.reduce((sum, item) => {
            const transDate = new Date(item.transaction_date || item.created_at);
            if (transDate >= startDate) {
                return sum + parseFloat(item.amount.toString());
            }
            return sum;
        }, 0);
    }, [transactions, getDateRange]);

    const totalInvested = useMemo(() => {
        return transactions
            .filter(t => t.type === 'inversion')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    }, [transactions]);

    const totalWithdrawn = useMemo(() => {
        return transactions
            .filter(t => t.type === 'retiro')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    }, [transactions]);


    // Orders Aggregation
    const filteredOrders = useMemo(() => {
        const startDate = getDateRange();
        return orders.filter((o) => new Date(o.order_date) >= startDate);
    }, [orders, getDateRange]);

    const stats = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            const paid = order.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
            return {
                totalRevenue: acc.totalRevenue + order.sale_price,
                totalInvestment: acc.totalInvestment + order.purchase_price,
                totalProfit: acc.totalProfit + order.profit,
                totalPaid: acc.totalPaid + paid,
            };
        }, { totalRevenue: 0, totalInvestment: 0, totalProfit: 0, totalPaid: 0 });
    }, [filteredOrders]);

    const globalStats = useMemo(() => {
        return orders.reduce((acc, order) => {
            const paid = order.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
            const remaining = order.sale_price - paid;
            return {
                totalPaid: acc.totalPaid + paid,
                totalPending: acc.totalPending + (order.status === 'pendiente' && remaining > 0 ? remaining : 0)
            };
        }, { totalPaid: 0, totalPending: 0 });
    }, [orders]);

    const economiaGlobal = useMemo(() => {
        // --- INVERSIÓN ---
        // 1. Compra de mercancía para encargos
        const costoEncargos = orders.reduce((sum, o) => sum + parseFloat(o.purchase_price?.toString() || '0'), 0);
        // 2. Compra de mercancía para inventario
        const costoInventario = items.reduce((sum, i) => sum + (i.stock_quantity * parseFloat(i.unit_price?.toString() || '0')), 0);
        // 3. Pagos operativos (Retiros de Finanzas)
        const pagosOperativos = transactions
            .filter(t => t.type === 'retiro')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        // 4. Inyecciones de Socios (Inversiones / Aportes)
        const aportesSocios = partnerTransactions
            .filter(t => t.type === 'inversion')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        // --- GANANCIA (INGRESOS) ---
        // 1. Ingresos por Encargos (Dinero recibido de pagos de encargos)

        
        // 2. Ingresos por Inventario (Pagos POS o de stock existente, de momento vamos a agrupar los pagos tipo POS aquí si se identifican así)
        // Para simplificar, como en el sistema actual POS- también se cuenta en orders,
        // vamos a separar ingresos. Si una orden es de POS, es ingresoInventario. Si no, ingresoEncargo.
        let ventasEncargos = 0;
        let ventasInventario = 0;
        
        orders.forEach(order => {
            const isPos = order.payments.some(p => p.reference_number?.startsWith('POS-'));
            const paid = order.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
            if (isPos) {
                ventasInventario += paid;
            } else {
                ventasEncargos += paid;
            }
        });

        // Adicionalmente, consideramos Retiros de Socios para el balance general (son un egreso del negocio)
        const retirosSocios = partnerTransactions
            .filter(t => t.type === 'retiro')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Además, consideremos cualquier "inversión" de finanzas que no sea de socio
        const inversionesFinanzas = transactions
            .filter(t => t.type === 'inversion')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Sumatorias Totales
        const totalInversion = costoEncargos + costoInventario + pagosOperativos + aportesSocios + inversionesFinanzas + retirosSocios;
        const totalGanancia = ventasEncargos + ventasInventario;
        const balance = totalGanancia - totalInversion;

        return {
            inversion: {
                costoEncargos,
                costoInventario,
                pagosOperativos,
                aportesSocios,
                inversionesFinanzas,
                retirosSocios,
                total: totalInversion
            },
            ganancia: {
                ventasEncargos,
                ventasInventario,
                total: totalGanancia
            },
            balance,
        };
    }, [orders, items, transactions, partnerTransactions]);

    return {
        stats,
        globalStats,
        economiaGlobal,
        financialExpenses,
        totalInvested,
        totalWithdrawn,
        loading: loadingOrders || loadingFinance || loadingInventory || loadingPartners
    };
}
