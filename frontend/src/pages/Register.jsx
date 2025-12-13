import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar, Footer } from '../components/layout';
import { Button, Input, Card } from '../components/ui';

const Register = () => {
    const { register, error } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError('');
    };

    const validatePassword = (password) => {
        if (password.length < 8) return 'Şifre en az 8 karakter olmalı';
        if (!/[A-Z]/.test(password)) return 'Şifre en az 1 büyük harf içermeli';
        if (!/[0-9]/.test(password)) return 'Şifre en az 1 rakam içermeli';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.password) {
            setFormError('Tüm alanları doldurun');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setFormError('Şifreler eşleşmiyor');
            return;
        }

        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setFormError(passwordError);
            return;
        }

        setLoading(true);
        const result = await register(formData.email, formData.password, formData.name);
        setLoading(false);

        if (!result.success) {
            setFormError(result.error);
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        const { password } = formData;
        if (!password) return { level: 0, text: '', color: '' };

        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 1) return { level: 25, text: 'Zayıf', color: 'var(--accent-red)' };
        if (score === 2) return { level: 50, text: 'Orta', color: 'var(--accent-gold)' };
        if (score === 3) return { level: 75, text: 'İyi', color: 'var(--accent-blue)' };
        return { level: 100, text: 'Güçlü', color: 'var(--accent-green)' };
    };

    const strength = getPasswordStrength();

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-16 px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="text-4xl">⚽</span>
                            <span className="text-2xl font-bold text-gradient">GoalSniper Pro</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Hesap Oluştur</h1>
                        <p className="text-[var(--text-secondary)]">Ücretsiz başla, istediğin zaman yükselt</p>
                    </div>

                    {/* Form Card */}
                    <Card hover={false} className="animate-fadeIn">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Error Message */}
                            {(formError || error) && (
                                <div className="p-3 rounded-lg bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/30">
                                    <p className="text-sm text-[var(--accent-red)]">{formError || error}</p>
                                </div>
                            )}

                            {/* Name */}
                            <Input
                                label="Ad Soyad"
                                type="text"
                                name="name"
                                placeholder="Ahmet Yılmaz"
                                value={formData.name}
                                onChange={handleChange}
                                icon="👤"
                            />

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
                            <div>
                                <Input
                                    label="Şifre"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    icon="🔒"
                                />
                                {/* Strength Indicator */}
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-[var(--text-muted)]">Şifre Gücü</span>
                                            <span style={{ color: strength.color }}>{strength.text}</span>
                                        </div>
                                        <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-300"
                                                style={{ width: `${strength.level}%`, backgroundColor: strength.color }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <Input
                                label="Şifre Tekrar"
                                type="password"
                                name="confirmPassword"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                icon="🔒"
                                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Şifreler eşleşmiyor' : ''}
                            />

                            {/* Terms */}
                            <p className="text-xs text-[var(--text-muted)]">
                                Kayıt olarak{' '}
                                <a href="#" className="text-[var(--accent-blue)] hover:underline">Kullanım Şartlarını</a>
                                {' '}ve{' '}
                                <a href="#" className="text-[var(--accent-blue)] hover:underline">Gizlilik Politikasını</a>
                                {' '}kabul etmiş olursunuz.
                            </p>

                            {/* Submit */}
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                loading={loading}
                            >
                                Kayıt Ol
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

                        {/* Login Link */}
                        <p className="text-center text-sm text-[var(--text-secondary)]">
                            Zaten hesabın var mı?{' '}
                            <Link to="/login" className="text-[var(--accent-green)] font-semibold hover:underline">
                                Giriş Yap
                            </Link>
                        </p>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Register;
