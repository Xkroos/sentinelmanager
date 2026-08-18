import { useState } from 'react';
import { Sidebar, Tab } from './Sidebar';
import { TopBar } from './TopBar';

import { OrdersModule } from '../OrdersModule';
import { InventoryModule } from '../InventoryModule';
import Reportes from '../Reportes';
import { StatisticsModule } from '../StatisticsModule';
import { FinancialOperationsModule } from '../FinancialOperationsModule';
import { NotesModule } from '../NotesModule';
import { DashboardHome } from '../DashboardHome'; 
import { PartnersModule } from '../PartnersModule';
import { RemindersModule } from '../RemindersModule';

export function AppLayout() {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardHome onNavigate={setActiveTab} />;
            case 'orders': return <OrdersModule />;
            case 'reminders': return <RemindersModule />;
            case 'inventory': return <InventoryModule />;
            case 'reports': return <Reportes />;
            case 'operations': return <FinancialOperationsModule />;
            case 'statistics': return <StatisticsModule />;
            case 'notes': return <NotesModule />;
            case 'partners': return <PartnersModule />;
            default: return <DashboardHome onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 font-sans">
            <TopBar toggleSidebar={toggleSidebar} />
            
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                    isOpen={isSidebarOpen} 
                    setIsOpen={setIsSidebarOpen} 
                />
                
                <main className="flex-1 overflow-y-auto relative w-full h-[calc(100vh-4rem)]">
                    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}
