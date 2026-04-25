import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, 
    Wallet, 
    TrendingUp, 
    Search, 
    AlertCircle,
    ChevronRight,
    Download // Icono para el botón
} from 'lucide-react';

// Importaciones para PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryItem {
    id: string;
    name: string;
    sku: string | null;
    supplier: string | null;
    stock_quantity: number;
    unit_price: number;
    sale_price: number;
}

export default function Reportes() {
    const { user } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadReportData = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const { data, error: supabaseError } = await supabase
                    .from('inventory_items')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name');
                
                if (supabaseError) throw supabaseError;
                setItems(data || []);
            } catch (err: any) {
                setError(err.message || "Error al cargar datos");
            } finally {
                setLoading(false);
            }
        };
        loadReportData();
    }, [user]);

    const reportData = useMemo(() => {
        return items
            .filter(i => 
                i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(item => ({
                ...item,
                totalInvestment: (item.stock_quantity || 0) * (item.unit_price || 0),
                totalPotentialProfit: (item.stock_quantity || 0) * ((item.sale_price || 0) - (item.unit_price || 0))
            }));
    }, [items, searchTerm]);

    const globals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            investment: acc.investment + curr.totalInvestment,
            profit: acc.profit + curr.totalPotentialProfit
        }), { investment: 0, profit: 0 });
    }, [reportData]);

    // FUNCIÓN PARA GENERAR EL PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        // Título y encabezado del PDF
        doc.setFontSize(18);
        doc.text('Reporte de Inventario - Sentinel', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de generación: ${date}`, 14, 28);
        doc.text(`Usuario: ${user?.email}`, 14, 33);

        // Resumen financiero en el PDF
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Inversión Total: $${globals.investment.toFixed(2)}`, 14, 45);
        doc.text(`Ganancia Estimada: $${globals.profit.toFixed(2)}`, 14, 50);

        // Configuración de la tabla
        const tableColumn = ["SKU", "Producto", "Stock", "Costo", "Venta", "Inv. Total", "Ganancia"];
        const tableRows = reportData.map(item => [
            item.sku || 'N/A',
            item.name,
            item.stock_quantity,
            `$${item.unit_price.toFixed(2)}`,
            `$${item.sale_price.toFixed(2)}`,
            `$${item.totalInvestment.toFixed(2)}`,
            `$${item.totalPotentialProfit.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] }, // Color verde esmeralda
            styles: { fontSize: 8 },
            columnStyles: {
                0: { fontStyle: 'italic' },
                6: { fontStyle: 'bold' }
            }
        });

        doc.save(`Reporte_Inventario_${date.replace(/\//g, '-')}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-slate-600 font-medium text-sm">Preparando documento...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-2 md:p-6 space-y-4 font-sans max-w-7xl mx-auto">
            
            {/* Header / Toolbar estilo Excel */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-2 rounded-lg shadow-md">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 leading-tight">Hoja de Balance</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Inventario Real-Time</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Filtrar celdas..." 
                                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* BOTÓN DE DESCARGA PDF */}
                        <button 
                            onClick={exportToPDF}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm text-sm font-bold active:scale-95"
                        >
                            <Download size={16} />
                            <span>PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Cards de Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Inversión Total</p>
                        <h3 className="text-2xl font-black text-slate-800">${globals.investment.toFixed(2)}</h3>
                    </div>
                    <Wallet className="text-slate-100 absolute -right-2 -bottom-2" size={80} />
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="z-10">
                        <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 text-xs">Ganancia Est.</p>
                        <h3 className="text-2xl font-black text-emerald-600">${globals.profit.toFixed(2)}</h3>
                    </div>
                    <TrendingUp className="text-emerald-50 absolute -right-2 -bottom-2" size={80} />
                </div>
            </div>

            {/* Tabla Responsive Excel Style */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700">SKU</th>
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700">Producto</th>
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700 text-center">Stock</th>
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700">Costo</th>
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700">Venta</th>
                                <th className="p-3 text-[11px] font-bold uppercase border-r border-slate-700">Inv. Total</th>
                                <th className="p-3 text-[11px] font-bold uppercase bg-emerald-700">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {reportData.map((item, idx) => (
                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-emerald-50/50 transition-colors`}>
                                    <td className="p-3 font-mono text-[11px] text-slate-400 border-r border-slate-100">{item.sku || '---'}</td>
                                    <td className="p-3 border-r border-slate-100">
                                        <div className="font-bold text-slate-800 uppercase text-xs">{item.name}</div>
                                        <div className="text-[9px] text-slate-400">{item.supplier || 'GENÉRICO'}</div>
                                    </td>
                                    <td className="p-3 text-center border-r border-slate-100 font-bold text-slate-600">{item.stock_quantity}</td>
                                    <td className="p-3 border-r border-slate-100 text-slate-500">${item.unit_price.toFixed(2)}</td>
                                    <td className="p-3 border-r border-slate-100 text-slate-700 font-medium">${item.sale_price.toFixed(2)}</td>
                                    <td className="p-3 border-r border-slate-100 font-bold text-slate-900">${item.totalInvestment.toFixed(2)}</td>
                                    <td className="p-3 font-black text-emerald-600 bg-emerald-50/20">${item.totalPotentialProfit.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white border-t-2 border-slate-800">
                            <tr className="font-black">
                                <td colSpan={5} className="p-4 text-right text-[10px] uppercase tracking-widest text-slate-400">Totales Finales:</td>
                                <td className="p-4 border-r border-slate-700 text-lg">${globals.investment.toFixed(2)}</td>
                                <td className="p-4 bg-emerald-800 text-lg">${globals.profit.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="md:hidden bg-slate-100 p-2 text-center border-t border-slate-200">
                    <p className="text-[9px] text-slate-500 uppercase flex items-center justify-center gap-1">
                        Desliza horizontalmente para ver balances <ChevronRight size={10}/>
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-red-700 text-xs font-bold uppercase">{error}</p>
                </div>
            )}
        </div>
    );
}