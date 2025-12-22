import { useState } from 'react';
import { Link } from 'react-router-dom';
import NeuInput from '../../components/ui/NeuInput';
import NeuButton from '../../components/ui/NeuButton';
import NeuCard from '../../components/ui/NeuCard';

export default function RegisterView({ onRegister, error }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!name || !email || !password) {
            setLocalError('Tüm alanları doldurun');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            setLocalError('Şifre en az 6 karakter olmalı');
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
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-base shadow-neu-extruded opacity-40 blur-2xl animate-float pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-base shadow-neu-inset opacity-30 blur-3xl pointer-events-none" />

            <NeuCard className="w-full max-w-md bg-base z-10" padding="p-10">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🚀</div>
                    <h1 className="text-3xl font-extrabold text-text-main mb-2">Kayıt Ol</h1>
                    <p className="text-text-muted">SENTIO AI ile tanışmaya hazır mısın?</p>
                </div>

                {(error || localError) && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold text-center border border-red-500/30">
                        {localError || error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <NeuInput
                        label="Ad Soyad"
                        placeholder="Ahmet Yılmaz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        required
                    />

                    <NeuInput
                        label="E-posta Adresi"
                        placeholder="ornek@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                    />

                    <NeuInput
                        label="Şifre"
                        placeholder="En az 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        required
                    />

                    <NeuInput
                        label="Şifre Tekrar"
                        placeholder="Şifrenizi tekrar girin"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        required
                    />

                    <div className="pt-4">
                        <NeuButton
                            type="submit"
                            variant="primary"
                            className="w-full py-4 text-lg"
                            disabled={loading}
                        >
                            {loading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
                        </NeuButton>
                    </div>
                </form>

                <div className="mt-6 text-center text-xs text-text-muted">
                    Kayıt olarak <a href="#" className="text-accent hover:underline">Kullanım Şartları</a> ve <a href="#" className="text-accent hover:underline">Gizlilik Politikası</a>'nı kabul etmiş olursun.
                </div>
            </NeuCard>

            <div className="mt-8 text-text-muted text-sm font-medium">
                Zaten hesabın var mı? <Link to="/login" className="text-accent font-bold cursor-pointer hover:underline">Giriş Yap</Link>
            </div>
        </div>
    );
}
