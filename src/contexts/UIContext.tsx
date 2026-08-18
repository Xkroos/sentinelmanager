import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, Check, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  title: string;
  resolve: ((value: boolean) => void) | null;
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    title: 'Confirmación',
    resolve: null,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const showConfirm = useCallback((message: string, title = 'Confirmación') => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        title,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <Check size={22} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={22} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={22} className="text-amber-500" />;
      case 'info': return <Info size={22} className="text-blue-500" />;
    }
  };

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-white/80 dark:bg-slate-900/80 border-emerald-500/20 shadow-emerald-500/10';
      case 'error': return 'bg-white/80 dark:bg-slate-900/80 border-rose-500/20 shadow-rose-500/10';
      case 'warning': return 'bg-white/80 dark:bg-slate-900/80 border-amber-500/20 shadow-amber-500/10';
      case 'info': return 'bg-white/80 dark:bg-slate-900/80 border-blue-500/20 shadow-blue-500/10';
    }
  };

  const getToastIconBg = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10';
      case 'error': return 'bg-rose-500/10';
      case 'warning': return 'bg-amber-500/10';
      case 'info': return 'bg-blue-500/10';
    }
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 scale-in-center">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> {confirmState.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleConfirmClose(true)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Container */}
      <div className="fixed top-20 right-4 md:right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-300 w-full max-w-[340px] ${getToastColors(toast.type)}`}
          >
            <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${getToastIconBg(toast.type)}`}>
                {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 pt-0.5 pr-6">
                <h4 className="font-black text-sm text-slate-800 dark:text-white mb-0.5">{
                    toast.type === 'success' ? '¡Éxito!' :
                    toast.type === 'error' ? 'Error' :
                    toast.type === 'warning' ? 'Atención' : 'Información'
                }</h4>
                <p className="font-medium text-xs text-slate-500 dark:text-slate-400 leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-all"
            >
              <X size={14} strokeWidth={3} />
            </button>
            {/* Progress bar effect using animation */}
            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800/50 w-full">
                <div 
                    className="h-full origin-left animate-shrink"
                    style={{
                        backgroundColor: toast.type === 'success' ? '#10b981' :
                                         toast.type === 'error' ? '#f43f5e' :
                                         toast.type === 'warning' ? '#f59e0b' : '#3b82f6'
                    }}
                />
            </div>
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
