import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar, Footer } from '../components/layout';
import { Button, Input, Card } from '../components/ui';

const Login = () => {
    const { login, error } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setFormError('Tüm alanları doldurun');
            return;
        }

        setLoading(true);
        const result = await login(formData.email, formData.password);
        setLoading(false);

        if (!result.success) {
            setFormError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-16 px-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="text-4xl">⚽</span>
                            <span className="text-2xl font-bold text-gradient">GoalSniper Pro</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Tekrar Hoş Geldin!</h1>
                        <p className="text-[var(--text-secondary)]">Hesabına giriş yap</p>
                    </div>

                    {/* Form Card */}
                    <Card hover={false} className="animate-fadeIn">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {(formError || error) && (
                                <div className="p-3 rounded-lg bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/30">
                                    <p className="text-sm text-[var(--accent-red)]">{formError || error}</p>
                                </div>
                            )}

                            {/* Email */}
                            <Input
                                label="Email"
                                type="email"
                                name="email"
                                placeholder="ornek@email.com"
                                value={formData.email}
                                onChange={handleChange}
                                icon="📧"
                            />

                            {/* Password */}
                            <Input
                                label="Şifre"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                icon="🔒"
                            />

                            {/* Forgot Password */}
                            <div className="text-right">
                                <a href="#" className="text-sm text-[var(--accent-blue)] hover:underline">
                                    Şifremi Unuttum
                                </a>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                loading={loading}
                            >
                                Giriş Yap
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--border-color)]" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">veya</span>
                            </div>
                        </div>

                        {/* Register Link */}
                        <p className="text-center text-sm text-[var(--text-secondary)]">
                            Hesabın yok mu?{' '}
                            <Link to="/register" className="text-[var(--accent-green)] font-semibold hover:underline">
                                Kayıt Ol
                            </Link>
                        </p>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Login;
