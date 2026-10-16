import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TextField, Button, Box, Alert, IconButton, InputAdornment, CircularProgress } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DescriptionIcon from '@mui/icons-material/Description';
import ClinicLogo from '../components/ClinicLogo';

const FEATURES = [
    { icon: <CalendarMonthIcon />, title: 'Agenda inteligente', text: 'Citas, horarios y confirmaciones en un solo lugar.' },
    { icon: <WhatsAppIcon />, title: 'Bot de WhatsApp', text: 'Tus pacientes agendan solos, las 24 horas.' },
    { icon: <DescriptionIcon />, title: 'Historia clínica digital', text: 'Recetas, órdenes y boletas listas en PDF.' },
];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Iniciar sesión · Clínica Salud';
    }, []);

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

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        setLoading(false);

        if (error) {
            setErrorMsg('Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.');
            return;
        }

        // Si es exitoso
        setIsExiting(true);
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 300);
    };

    return (
        <div className={`min-h-screen flex bg-[var(--c-bg)] transition-opacity duration-300 ease-in-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            {/* Panel de marca (solo escritorio) */}
            <aside className="hidden lg:flex relative w-[46%] flex-col justify-between overflow-hidden p-12 text-white bg-[var(--c-primary-text)]">
                {/* Formas decorativas */}
                <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10" />
                <div className="absolute -bottom-40 -left-24 w-[32rem] h-[32rem] rounded-full bg-white/5" />
                <div className="absolute top-1/2 right-10 w-40 h-40 rounded-full border-[24px] border-white/10" />

                <div className="relative flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-white/40 shadow-lg">
                        <ClinicLogo className="w-full h-full" />
                    </div>
                    <span className="text-lg font-bold tracking-wide">Clínica Salud</span>
                </div>

                <div className="relative max-w-md">
                    <h1 className="text-4xl font-extrabold leading-tight mb-4">
                        La gestión de tu clínica, simple y en un solo lugar.
                    </h1>
                    <p className="text-white/80 text-base mb-10">
                        Pacientes, citas, historia clínica y atención por WhatsApp desde un mismo panel.
                    </p>
                    <ul className="space-y-5">
                        {FEATURES.map((f) => (
                            <li key={f.title} className="flex items-start gap-4">
                                <span className="shrink-0 w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">{f.icon}</span>
                                <span>
                                    <span className="block font-bold">{f.title}</span>
                                    <span className="block text-sm text-white/75">{f.text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-white/60">Desarrollado por <span className="font-bold text-white/90">OPERIUM</span> · 2026 · Piura, Perú</p>
            </aside>

            {/* Formulario */}
            <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg mb-5 lg:hidden">
                            <ClinicLogo className="w-full h-full" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--c-primary-text)] mb-2">Panel administrativo</p>
                        <h2 className="text-3xl font-extrabold text-slate-900">Bienvenido/a</h2>
                        <p className="text-sm text-slate-500 mt-2">Ingresa tus credenciales para acceder al sistema.</p>
                    </div>

                    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: { xs: 3, sm: 4 }, bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0px 12px 40px rgba(32, 28, 20, 0.08)' }}>
                        {errorMsg && (
                            <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ borderRadius: 2 }}>
                                {errorMsg}
                            </Alert>
                        )}
                        <TextField
                            fullWidth
                            type="email"
                            label="Correo electrónico"
                            required
                            autoFocus
                            autoComplete="email"
                            placeholder="usuario@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            label="Contraseña"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                onClick={() => setShowPassword((v) => !v)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={loading}
                            size="large"
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                            sx={{ py: 1.4, fontSize: '1rem' }}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </Button>
                    </Box>

                    <p className="lg:hidden text-center text-xs text-slate-400 mt-8">
                        Desarrollado por <span className="font-bold text-slate-500">OPERIUM</span> · 2026 · Piura, Perú
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;
