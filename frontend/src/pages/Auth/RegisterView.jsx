import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight } from 'lucide-react';

export default function RegisterView({ onRegister, error }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!name || !email || !password) {
            setLocalError('Lütfen tüm alanları doldurun');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            setLocalError('Şifre en az 6 karakter olmalıdır');
            return;
        }

        setLoading(true);
        try {
            await onRegister(name, email, password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary glow-primary mb-4">
                        <Zap className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">GoalSniper</h1>
                    <p className="text-muted-foreground mt-2">Profesyonel tahmin platformu</p>
                </div>

                {/* Auth Card */}
                <div className="glass-card rounded-3xl p-8">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-8 p-1 bg-secondary/50 rounded-xl">
                        <Link
                            to="/login"
                            className="flex-1 py-3 rounded-lg font-medium text-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Giriş Yap
                        </Link>
                        <div className="flex-1 py-3 rounded-lg font-medium text-center bg-primary text-primary-foreground">
                            Kayıt Ol
                        </div>
                    </div>

                    {(error || localError) && (
                        <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium text-center border border-destructive/30">
                            {localError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Ad Soyad"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-12 pr-4 h-14 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="email"
                                placeholder="E-posta adresi"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 h-14 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Şifre (en az 6 karakter)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 h-14 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Şifre tekrar"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 h-14 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl text-lg glow-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-muted-foreground text-sm">veya</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-3">
                        <button className="h-12 bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-center gap-2 text-foreground hover:bg-secondary transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
                        <button className="h-12 bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-center gap-2 text-foreground hover:bg-secondary transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            GitHub
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-muted-foreground text-sm mt-6">
                    Kayıt olarak{" "}
                    <button className="text-primary hover:underline">Kullanım Şartları</button>
                    {" "}ve{" "}
                    <button className="text-primary hover:underline">Gizlilik Politikası</button>
                    'nı kabul etmiş olursunuz.
                </p>
            </div>
        </div>
    );
}
