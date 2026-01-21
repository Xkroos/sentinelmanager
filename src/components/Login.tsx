import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Importamos iconos para un estilo más limpio
import { LogIn, Mail, Lock } from 'lucide-react';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = isSignUp
            ? await signUp(email, password)
            : await signIn(email, password);

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        // Fondo: Degradado oscuro y elegante
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center p-4">
            
            {/* Contenedor del Formulario: Tarjeta oscura y elevada */}
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-10 w-full max-w-sm border border-gray-700">
                
                {/* Encabezado e Icono */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="p-3 bg-indigo-600 rounded-full mb-3">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white text-center">
                        Sentinel Manager
                    </h2>
                </div>
                
                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Input: Email */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                            Email
                        </label>
                        <Mail className="absolute left-3 top-1/2 transform translate-y-[-10%] text-gray-500 w-4 h-4" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500 transition-colors"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    
                    {/* Input: Contraseña */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                            Contraseña
                        </label>
                        <Lock className="absolute left-3 top-1/2 transform translate-y-[-10%] text-gray-500 w-4 h-4" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    {/* Mensaje de Error */}
                    {error && (
                        <div className="text-red-300 text-sm bg-red-900/40 border border-red-700 p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    {/* Botón de Submit (con color de acento) */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/30"
                    >
                        {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
                    </button>
                    
                </form>
                
                {/* Toggle entre Login y Sign Up */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-gray-400 hover:text-indigo-400 text-sm transition-colors"
                    >
                        {/*isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'*/}
                    </button>
                </div>
            </div>
        </div>
    );
}