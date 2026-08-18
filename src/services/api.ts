import { supabase, Order, Payment, FinancialTransaction, InventoryItem, Partner, PartnerTransaction, Customer } from '../lib/supabase';

// -----------------------------------------
// CUSTOMERS & SETTINGS
// -----------------------------------------
export const apiCustomers = {
    async getCustomers(userId: string) {
        const { data, error } = await supabase.from('customers').select('*').eq('user_id', userId);
        if (error) throw error;
        return data as Customer[];
    },
    async getCustomerByPhone(userId: string, phone: string) {
        const { data, error } = await supabase.from('customers').select('*').eq('user_id', userId).eq('phone', phone).maybeSingle();
        if (error) throw error;
        return data as Customer | null;
    },
    async getOrCreateCustomer(userId: string, name: string, phone: string) {
        if (!phone.trim()) return null;
        let customer = await this.getCustomerByPhone(userId, phone);
        if (!customer) {
            const { data, error } = await supabase.from('customers').insert([{ user_id: userId, name, phone }]).select().single();
            if (error) throw error;
            customer = data as Customer;
        } else if (customer.name !== name) {
            // Update name if different
            const { data, error } = await supabase.from('customers').update({ name }).eq('id', customer.id).select().single();
            if (error) throw error;
            customer = data as Customer;
        }
        return customer;
    },
    async updateCustomerPhone(customerId: string, phone: string) {
        const { error } = await supabase.from('customers').update({ phone }).eq('id', customerId);
        if (error) throw error;
    }
};

export const apiSettings = {
    async getSetting(userId: string, key: string, defaultValue: string = '') {
        const { data, error } = await supabase.from('settings').select('setting_value').eq('user_id', userId).eq('setting_key', key).maybeSingle();
        if (error) throw error;
        return data ? data.setting_value : defaultValue;
    },
    async saveSetting(userId: string, key: string, value: string) {
        // Upsert setting
        const { error } = await supabase.from('settings').upsert({ user_id: userId, setting_key: key, setting_value: value }, { onConflict: 'user_id,setting_key' });
        if (error) throw error;
    }
};

// -----------------------------------------
// ORDERS & PAYMENTS
// -----------------------------------------
export const apiOrders = {
    async getOrders(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*, payments(*)')
            .eq('user_id', userId)
            .order('order_date', { ascending: false });
        if (error) throw error;
        return data;
    },
    async createOrder(orderData: Partial<Order>) {
        if (orderData.customer_phone && orderData.user_id && orderData.customer_name) {
            const customer = await apiCustomers.getOrCreateCustomer(orderData.user_id, orderData.customer_name, orderData.customer_phone);
            if (customer) {
                orderData.customer_id = customer.id;
            }
        }
        const { data, error } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;
        return data;
    },
    async updateOrder(id: string, orderData: Partial<Order>) {
        const { data, error } = await supabase.from('orders').update(orderData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },
    async deleteOrder(id: string) {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
    },
    async addPayment(paymentData: Partial<Payment>) {
        const { data, error } = await supabase.from('payments').insert([paymentData]).select().single();
        if (error) throw error;
        return data;
    },
    async updateOrderStatus(id: string, status: 'pendiente' | 'pagado') {
        const { error } = await supabase.from('orders').update({ status }).eq('id', id);
        if (error) throw error;
    },
    async applyDelayPenalty(order: Order, payments: Payment[], percentage: number = 5) {
        const paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
        const currentDebt = parseFloat(order.sale_price.toString()) - paidAmount;
        if (currentDebt <= 0) return order;

        const penalty = parseFloat((currentDebt * (percentage / 100)).toFixed(2));
        const newSalePrice = parseFloat(order.sale_price.toString()) + penalty;

        const { data, error } = await supabase.from('orders')
            .update({ sale_price: newSalePrice })
            .eq('id', order.id)
            .select()
            .single();
        if (error) throw error;
        return data as Order;
    },
    async addMerchandiseToOrder(orderId: string, cartItems: {itemId: string, quantity: number, salePrice: number}[]) {
        // Fetch current order
        const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (orderError || !order) throw new Error("Encargo no encontrado");

        let totalPurchasePriceAdded = 0;
        let totalSalePriceAdded = 0;
        let productDescriptions = [];

        for (const cartItem of cartItems) {
            // Fetch item
            const { data: item, error: fetchError } = await supabase.from('inventory_items').select('*').eq('id', cartItem.itemId).single();
            if (fetchError || !item) throw new Error("Producto no encontrado");

            if (item.stock_quantity < cartItem.quantity) throw new Error(`Stock insuficiente para ${item.name}`);

            const purchasePrice = item.unit_price;
            totalPurchasePriceAdded += purchasePrice * cartItem.quantity;
            totalSalePriceAdded += cartItem.salePrice * cartItem.quantity;
            productDescriptions.push(`${cartItem.quantity}x ${item.name}`);

            // Deduct stock
            const { error: invError } = await supabase.from('inventory_items')
                .update({ stock_quantity: item.stock_quantity - cartItem.quantity })
                .eq('id', item.id);
            if (invError) throw invError;
        }

        const newPurchasePrice = parseFloat(order.purchase_price.toString()) + totalPurchasePriceAdded;
        const newSalePrice = parseFloat(order.sale_price.toString()) + totalSalePriceAdded;
        
        let newDescription = order.product_description;
        if (newDescription) {
            newDescription += `, + ${productDescriptions.join(', ')}`;
        } else {
            newDescription = productDescriptions.join(', ');
        }

        const { data, error } = await supabase.from('orders')
            .update({ 
                purchase_price: newPurchasePrice,
                sale_price: newSalePrice,
                product_description: newDescription
            })
            .eq('id', orderId)
            .select()
            .single();
            
        if (error) throw error;
        return data as Order;
    }
};

// -----------------------------------------
// INVENTORY
// -----------------------------------------
export const apiInventory = {
    async getInventory(userId: string) {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('user_id', userId)
            .order('name');
        if (error) throw error;
        return data as InventoryItem[];
    },
    async createItem(itemData: Partial<InventoryItem>) {
        const { data, error } = await supabase.from('inventory_items').insert([itemData]).select().single();
        if (error) throw error;
        return data;
    },
    async updateItem(id: string, itemData: Partial<InventoryItem>) {
        const { data, error } = await supabase.from('inventory_items').update(itemData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },
    async deductStock(cartItems: {itemId: string, quantity: number}[]) {
        for (const cartItem of cartItems) {
            // Fetch current item to ensure stock isn't negative
            const { data: item, error: fetchError } = await supabase.from('inventory_items').select('*').eq('id', cartItem.itemId).single();
            if (fetchError || !item) throw new Error("Producto no encontrado");
            if (item.stock_quantity < cartItem.quantity) throw new Error(`Stock insuficiente para ${item.name}`);

            const { error: invError } = await supabase.from('inventory_items')
                .update({ stock_quantity: item.stock_quantity - cartItem.quantity })
                .eq('id', cartItem.itemId);
            if (invError) throw invError;
        }
    },
    async deleteItem(id: string) {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) throw error;
    },
    async processQuickSale(userId: string, cartItems: {itemId: string, quantity: number, salePrice: number}[], customerName: string = 'Venta Rápida POS', customerPhone?: string) {
        let totalPurchasePrice = 0;
        let totalSalePrice = 0;
        let totalProfit = 0;
        let productDescriptions = [];

        for (const cartItem of cartItems) {
            // Fetch item
            const { data: item, error: fetchError } = await supabase.from('inventory_items').select('*').eq('id', cartItem.itemId).single();
            if (fetchError || !item) throw new Error("Producto no encontrado");

            if (item.stock_quantity < cartItem.quantity) throw new Error(`Stock insuficiente para ${item.name}`);

            const purchasePrice = item.unit_price;
            const profit = (cartItem.salePrice - purchasePrice) * cartItem.quantity;
            
            totalPurchasePrice += purchasePrice * cartItem.quantity;
            totalSalePrice += cartItem.salePrice * cartItem.quantity;
            totalProfit += profit;
            productDescriptions.push(`${item.name} (x${cartItem.quantity})`);

            // Deduct stock
            const { error: invError } = await supabase.from('inventory_items')
                .update({ stock_quantity: item.stock_quantity - cartItem.quantity })
                .eq('id', cartItem.itemId);
            if (invError) throw invError;
        }

        // Resolve customer
        let customerId = null;
        if (customerPhone) {
            const customer = await apiCustomers.getOrCreateCustomer(userId, customerName, customerPhone);
            if (customer) customerId = customer.id;
        }

        // 1. Create order
        const { data: order, error: orderError } = await supabase.from('orders').insert([{
            user_id: userId,
            customer_name: customerName,
            customer_id: customerId,
            customer_phone: customerPhone || null,
            product_description: productDescriptions.join(', '),
            purchase_price: totalPurchasePrice,
            sale_price: totalSalePrice,
            order_date: new Date().toISOString(),
            status: 'pagado',
            merchandise_status: 'comprada'
        }]).select().single();
        if (orderError) throw orderError;

        // 2. Add payment
        const { error: paymentError } = await supabase.from('payments').insert([{
            order_id: order.id,
            user_id: userId,
            amount: totalSalePrice,
            payment_date: new Date().toISOString(),
            reference_number: 'POS-' + Date.now()
        }]);
        if (paymentError) throw paymentError;
    },
    async registerBatch(
        userId: string,
        batchData: { batchName: string, batchDate: string, shippingCost: number, shippingMethod: string },
        items: any[]
    ) {
        // 1. Crear el Lote (Batch) en `inventory_batches`
        const { data: batch, error: batchError } = await supabase.from('inventory_batches').insert([{
            user_id: userId,
            batch_name: batchData.batchName,
            batch_date: batchData.batchDate,
            shipping_cost: batchData.shippingCost,
            shipping_method: batchData.shippingMethod
        }]).select().single();
        
        if (batchError || !batch) throw new Error("Error creando el lote: " + (batchError?.message || ""));

        const batchId = batch.id;

        // 2. Save items (update stock for existing, insert for new) and link to batch
        for (const item of items) {
            const { isNew, tempId, ...cleanItem } = item;
            let finalItemId = cleanItem.id;
            
            if (isNew) {
                // Remove id entirely to avoid null constraint errors in Supabase
                const { id, ...itemToInsert } = cleanItem;
                const { data: insertedItem, error: insertError } = await supabase.from('inventory_items').insert([{ ...itemToInsert, user_id: userId }]).select().single();
                if (insertError || !insertedItem) throw insertError || new Error("Error inserting new item");
                finalItemId = insertedItem.id;
            } else {
                // If it's an existing item, we add to the existing stock_quantity
                const { data: existingItem, error: fetchError } = await supabase.from('inventory_items').select('stock_quantity').eq('id', cleanItem.id).single();
                if (fetchError || !existingItem) throw new Error("Error fetching existing item: " + cleanItem.name);
                
                const newStock = existingItem.stock_quantity + (cleanItem.stock_quantity || 0);
                
                const { id, ...itemToUpdate } = cleanItem;
                const { error } = await supabase.from('inventory_items').update({ ...itemToUpdate, stock_quantity: newStock }).eq('id', id);
                if (error) throw error;
            }

            // Crear el registro en `inventory_batch_items`
            const { error: batchItemError } = await supabase.from('inventory_batch_items').insert([{
                batch_id: batchId,
                inventory_item_id: finalItemId,
                quantity: cleanItem.stock_quantity || 0,
                unit_price: cleanItem.unit_price || 0,
                sale_price: cleanItem.sale_price || 0,
                is_new_product: isNew
            }]);
            if (batchItemError) throw new Error("Error guardando el ítem del lote: " + batchItemError.message);
        }

        // 3. Register shipping cost if > 0
        if (batchData.shippingCost > 0) {
            const description = `Pago envio de mercancia - Lote: ${batchData.batchName || 'S/N'} - Vía: ${batchData.shippingMethod || 'N/A'}`;
            const { error } = await supabase.from('financial_transactions').insert([{
                user_id: userId,
                amount: batchData.shippingCost,
                description,
                type: 'inversion',
                transaction_date: batchData.batchDate || new Date().toISOString()
            }]);
            if (error) throw error;
        }
    },
    async getBatches(userId: string) {
        const { data, error } = await supabase
            .from('inventory_batches')
            .select('*')
            .eq('user_id', userId)
            .order('batch_date', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    async deleteBatch(batchId: string) {
        const { error } = await supabase
            .from('inventory_batches')
            .delete()
            .eq('id', batchId);
        if (error) throw error;
    },
    async updateBatch(batchId: string, updates: { batch_name: string, batch_date: string, shipping_method: string, shipping_cost: number }) {
        const { error } = await supabase
            .from('inventory_batches')
            .update(updates)
            .eq('id', batchId);
        if (error) throw error;
    },
    async getBatchItems(batchId: string) {
        const { data, error } = await supabase
            .from('inventory_batch_items')
            .select(`
                *,
                inventory_item:inventory_item_id (*)
            `)
            .eq('batch_id', batchId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },
    async updateBatchItem(batchItemId: string, globalItemId: string, newQuantity: number, newUnitPrice: number, newSalePrice: number) {
        // 1. Obtener el batch item actual para calcular la diferencia de stock
        const { data: currentBatchItem, error: fetchBatchError } = await supabase
            .from('inventory_batch_items')
            .select('quantity, unit_price, sale_price')
            .eq('id', batchItemId)
            .single();
        if (fetchBatchError || !currentBatchItem) throw new Error("No se pudo obtener el ítem del lote actual");

        const qtyDiff = newQuantity - currentBatchItem.quantity;

        // 2. Actualizar el batch item
        const { error: updateBatchError } = await supabase
            .from('inventory_batch_items')
            .update({ 
                quantity: newQuantity, 
                unit_price: newUnitPrice, 
                sale_price: newSalePrice 
            })
            .eq('id', batchItemId);
        if (updateBatchError) throw updateBatchError;

        // 3. Obtener el item global actual
        const { data: globalItem, error: fetchGlobalError } = await supabase
            .from('inventory_items')
            .select('stock_quantity')
            .eq('id', globalItemId)
            .single();
        if (fetchGlobalError || !globalItem) throw new Error("No se pudo obtener el ítem global");

        // 4. Actualizar el item global (stock y precios nuevos)
        // NOTA: Podríamos elegir si el cambio de precio en el lote afecta el precio global. Asumiremos que sí por practicidad.
        const { error: updateGlobalError } = await supabase
            .from('inventory_items')
            .update({
                stock_quantity: globalItem.stock_quantity + qtyDiff,
                unit_price: newUnitPrice,
                sale_price: newSalePrice
            })
            .eq('id', globalItemId);
        if (updateGlobalError) throw updateGlobalError;
    }
};

// -----------------------------------------
// FINANCIAL TRANSACTIONS
// -----------------------------------------
export const apiFinance = {
    async getTransactions(userId: string) {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false });
        if (error) throw error;
        return data as FinancialTransaction[];
    },
    async addTransaction(transactionData: Partial<FinancialTransaction>) {
        const { data, error } = await supabase.from('financial_transactions').insert([transactionData]).select().single();
        if (error) throw error;
        return data;
    }
};

// -----------------------------------------
// PARTNERS (SOCIOS)
// -----------------------------------------
export const apiPartners = {
    async getPartners(userId: string) {
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Partner[];
    },
    async addPartner(partnerData: Partial<Partner>) {
        const { data, error } = await supabase.from('partners').insert([partnerData]).select().single();
        if (error) throw error;
        return data as Partner;
    },
    async updatePartner(partnerId: string, partnerData: Partial<Partner>) {
        const { data, error } = await supabase.from('partners').update(partnerData).eq('id', partnerId).select().single();
        if (error) throw error;
        return data as Partner;
    },
    async deletePartner(partnerId: string) {
        const { error } = await supabase.from('partners').delete().eq('id', partnerId);
        if (error) throw error;
        return true;
    },
    
    // Transacciones de Socios
    async getPartnerTransactions(userId: string) {
        const { data, error } = await supabase
            .from('partner_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false });
        if (error) throw error;
        return data as PartnerTransaction[];
    },
    async addPartnerTransaction(transactionData: Partial<PartnerTransaction>) {
        const { data, error } = await supabase.from('partner_transactions').insert([transactionData]).select().single();
        if (error) throw error;
        return data as PartnerTransaction;
    }
};
