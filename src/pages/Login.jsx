import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TextField, Button, Box } from '@mui/material';

import ClinicLogo from '../components/ClinicLogo';
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showError, setShowError] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const navigate = useNavigate();

    // Verificación inicial: Comprobar si hay sesión para evitar doble login
    useEffect(() => {
        let isMounted = true;
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && isMounted) {
                setIsExiting(true);
                setTimeout(() => navigate('/', { replace: true }), 300);
            }
        };
        checkSession();
        return () => { isMounted = false; };
    }, [navigate]);

    const displayError = (text) => {
        setErrorMsg(text);
        setShowError(true);
        setTimeout(() => setShowError(false), 3500);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        setLoading(false);

        if (error) {
            displayError('Error: Correo o contraseña incorrectos.');
            return;
        }

        // Si es exitoso
        setIsExiting(true);
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 300);
    };

    return (
        <div className={`min-h-screen relative flex items-center justify-center p-4 bg-white overflow-hidden transition-opacity duration-300 ease-in-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            {/* Fondo decorativo con patrón continuo */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: "url('/login-pattern.png')",
                    backgroundRepeat: "repeat",
                    backgroundSize: "600px",
                    opacity: 0.9
                }}
            >
                {/* Gotas de color suavizadas de fondo */}
                {/* Gotas de color suavizadas de fondo - Tema dorado */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--c-primary)]/20 rounded-full mix-blend-multiply blur-3xl opacity-40"></div>
                <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-[var(--c-primary-border)]/30 rounded-full mix-blend-multiply blur-3xl opacity-40"></div>
                {/* Acento cálido */}
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[var(--c-primary-soft)]/30 rounded-full mix-blend-multiply blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Capa de desenfoque blanco semi-transparente sobre el fondo */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-white/30 backdrop-blur-[3px]"></div>

            {/* Notificación Flotante (Toast Error) */}
            <div
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-xl shadow-red-500/10 transition-all duration-400 ease-out ${showError ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                    }`}
            >
                <svg className="w-5 h-5 text-red-500 mr-3 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span className="text-sm font-medium text-red-600">
                    {errorMsg || 'Credenciales incorrectas'}
                </span>
            </div>

            {/* Contenedor Principal (Glassmorphism Premium) */}
            {/* Contenedor Principal (Glassmorphism Premium) */}
            <div className="relative z-10 w-full sm:w-[80vw] md:w-[30vw] min-w-[340px] h-[80vh] flex flex-col justify-center overflow-y-auto p-8 sm:p-10 bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-[var(--c-primary)]/10 rounded-3xl text-center text-slate-800">
                <div className="flex justify-center mb-6 shrink-0">
                    <div className="w-[20vh] h-[20vh] min-w-[80px] min-h-[80px] rounded-full border-4 border-white overflow-hidden shadow-lg bg-white/40 flex items-center justify-center">
                        <ClinicLogo className="w-full h-full object-cover" />
                    </div>
                </div>

                <div className="w-full mb-3 shrink-0 flex flex-col items-center">
                    <svg viewBox="0 0 310 16" className="w-full h-auto text-slate-800">
                        <text x="155" y="13" textAnchor="middle" fill="currentColor" className="font-bold tracking-tight" fontSize="13">PANEL ADMINISTRATIVO</text>
                    </svg>
                    <svg viewBox="0 0 310 26" className="w-full h-auto mt-1 text-slate-800">
                        <text x="155" y="22" textAnchor="middle" fill="currentColor" className="font-black tracking-tight" fontSize="23">CLÍNICA SALUD</text>
                    </svg>
                </div>
                <p className="text-sm text-slate-500 mb-6 font-medium shrink-0">Bienvenido/a, ingresa tus credenciales para acceder al sistema</p>

                <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
                    <TextField
                        fullWidth
                        type="email"
                        label="Correo electrónico"
                        required
                        autoComplete="email"
                        placeholder="usuario@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Contraseña"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <Box mt={1}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={loading}
                            size="large"
                        >
                            {loading ? 'Autenticando...' : 'Acceder'}
                        </Button>
                    </Box>
                </form>

                <div className="mt-8 pt-4 border-t border-slate-100/60">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        Creado y administrado por <span className="font-bold text-slate-500">PUREPOWER©.</span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold tracking-tight">
                        2026 - Piura, Perú.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
