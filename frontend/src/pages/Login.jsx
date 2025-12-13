import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Input, FormGroup, Label } from '../components/ui';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await res.json();

            if (data.success) {
                // Store token and user info for client-side auth checks
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                localStorage.setItem('user', JSON.stringify(data.user));

                // Navigate to appropriate page
                navigate(data.user.role === 'admin' ? '/admin' : '/admin');
            } else {
                setError(data.error || 'Giriş başarısız');
            }
        } catch (err) {
            setError('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left: Promo */}
            <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-secondary/10 rounded-full blur-[100px]" />

                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 max-w-lg"
                >
                    <div className="section-badge mb-6">
                        <span className="section-badge-dot pulse-dot" />
                        <span className="section-badge-text">Profesyonel analiz platformu</span>
                    </div>

                    <h1 className="font-display text-5xl leading-tight mb-4">
                        Futbol analizinde <span className="gradient-text">yeni nesil</span>
                    </h1>

                    <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                        Gerçek zamanlı maç verileri ve yapay zeka destekli analizlerle profesyonel düzeyde tahminler.
                    </p>

                    <div className="flex gap-12">
                        <div>
                            <div className="font-display text-3xl">89%</div>
                            <div className="text-sm text-muted-foreground">Başarı oranı</div>
                        </div>
                        <div>
                            <div className="font-display text-3xl">2.4K+</div>
                            <div className="text-sm text-muted-foreground">Aktif kullanıcı</div>
                        </div>
                    </div>
                </motion.div>

                {/* Floating Cards */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute bottom-[20%] left-[10%] bg-card border border-border rounded-xl p-4 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">🎯</div>
                        <div>
                            <div className="text-sm font-semibold">12 Sinyal</div>
                            <div className="text-xs text-muted-foreground">Bugün</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-[25%] right-[15%] bg-card border border-border rounded-xl p-4 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">📈</div>
                        <div>
                            <div className="text-sm font-semibold">+89%</div>
                            <div className="text-xs text-muted-foreground">Başarı</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-muted/30 border-l border-border relative">
                {/* Shimmer Line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
                    <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="w-full h-full gradient-bg"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-sm"
                >
                    <Link to="/" className="flex items-center gap-3 mb-12 group">
                        <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-accent">
                            ⚽
                        </div>
                        <span className="font-display text-xl group-hover:text-accent transition-colors">
                            GoalGPT
                        </span>
                    </Link>

                    <h2 className="font-display text-3xl mb-2">Hoşgeldiniz</h2>
                    <p className="text-muted-foreground mb-8">Devam etmek için giriş yapın</p>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <FormGroup>
                            <Label htmlFor="email">E-posta</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="password">Şifre</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </FormGroup>

                        <Button type="submit" className="w-full mt-2" disabled={loading}>
                            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
                        </Button>
                    </form>

                    <p className="text-center text-muted-foreground mt-6 text-sm">
                        Hesabınız yok mu?{' '}
                        <Link to="/register" className="text-accent hover:underline font-medium">
                            Kayıt olun
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
