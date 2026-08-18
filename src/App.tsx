import { useState, createContext, useContext, useEffect} from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AppLayout } from './components/Layout/AppLayout';
import { UIProvider } from './contexts/UIContext';

type Theme = 'light' | 'dark';
interface ThemeContextProps {
    theme: Theme;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
    theme: 'light',
    toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme') as Theme;
        }
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            return newTheme;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

function AuthWrapper() {
    const { user } = useAuth();
    if (!user) {
        return <Login />;
    }
    return <AppLayout />;
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <UIProvider>
                    <AuthWrapper />
                </UIProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;