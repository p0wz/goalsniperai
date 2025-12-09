import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Input, FormGroup, Label } from '../components/ui';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const passwordStrength = () => {
        if (password.length === 0) return { level: 0, text: '', color: '' };
        if (password.length < 6) return { level: 1, text: 'Zayıf', color: 'bg-red-500' };
        if (password.length < 8) return { level: 2, text: 'Orta', color: 'bg-orange-500' };
        if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) return { level: 4, text: 'Güçlü', color: 'bg-green-500' };
        return { level: 3, text: 'İyi', color: 'bg-accent' };
    };

    const strength = passwordStrength();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include'
            });

            const data = await res.json();

            if (data.success) {
                // Token is securely stored in httpOnly cookie by backend
                navigate('/dashboard');
            } else {
                setError(data.error || 'Kayıt başarısız');
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
                        <span className="section-badge-text">Hemen başlayın</span>
                    </div>

                    <h1 className="font-display text-5xl leading-tight mb-4">
                        <span className="gradient-text">Ücretsiz</span> hesap oluşturun
                    </h1>

                    <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                        Kredi kartı gerektirmez. Anında erişim sağlayın.
                    </p>

                    <div className="space-y-4">
                        <Feature icon="✓" text="Günlük 3 ücretsiz sinyal" />
                        <Feature icon="✓" text="IY 0.5 stratejisi" />
                        <Feature icon="✓" text="Temel istatistikler" />
                    </div>
                </motion.div>

                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute bottom-[20%] right-[10%] bg-card border border-border rounded-xl p-4 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">🚀</div>
                        <div>
                            <div className="text-sm font-semibold">Ücretsiz</div>
                            <div className="text-xs text-muted-foreground">Başlangıç</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-muted/30 border-l border-border relative">
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

                    <h2 className="font-display text-3xl mb-2">Hesap oluştur</h2>
                    <p className="text-muted-foreground mb-8">Ücretsiz başlayın</p>

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
                            <Label htmlFor="name">Ad Soyad</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </FormGroup>

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
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded ${level <= strength.level ? strength.color : 'bg-border'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{strength.text}</span>
                                </div>
                            )}
                        </FormGroup>

                        <Button type="submit" className="w-full mt-2" disabled={loading}>
                            {loading ? 'Kayıt yapılıyor...' : 'Kayıt ol'}
                        </Button>
                    </form>

                    <p className="text-center text-muted-foreground mt-6 text-sm">
                        Zaten hesabınız var mı?{' '}
                        <Link to="/login" className="text-accent hover:underline font-medium">
                            Giriş yapın
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

function Feature({ icon, text }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-accent font-bold">{icon}</span>
            <span className="text-foreground">{text}</span>
        </div>
    );
}
