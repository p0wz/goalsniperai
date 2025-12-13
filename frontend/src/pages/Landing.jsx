import { Link } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';
import { Button, Card, Badge } from '../components/ui';

const Landing = () => {
    const features = [
        {
            icon: '⚡',
            title: 'Canlı Sinyaller',
            description: 'Gerçek zamanlı maç analizi ve gol sinyalleri. Dakika dakika güncellenen istatistikler.'
        },
        {
            icon: '🤖',
            title: 'AI Destekli',
            description: 'Google Gemini AI ile güçlendirilmiş akıllı analiz sistemi.'
        },
        {
            icon: '📊',
            title: 'Form Analizi',
            description: 'Takımların ev/deplasman formları, HT/FT gol oranları detaylı analiz.'
        },
        {
            icon: '🎯',
            title: 'Momentum Algılama',
            description: 'Korner, şut, xG artışı gibi momentum tetikleyicileri ile doğru zamanlama.'
        },
        {
            icon: '🎫',
            title: 'Kupon Oluşturucu',
            description: 'Sinyalleri birleştir, oran hesapla, kuponunu kaydet ve paylaş.'
        },
        {
            icon: '📈',
            title: 'Win Rate Takibi',
            description: 'Tüm sinyal geçmişi, kazanç oranları ve detaylı istatistikler.'
        }
    ];

    const stats = [
        { value: '72%', label: 'Win Rate' },
        { value: '500+', label: 'Günlük Sinyal' },
        { value: '10K+', label: 'Aktif Kullanıcı' },
        { value: '50+', label: 'Desteklenen Lig' }
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-24 pb-20 px-4 relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-green)]/5 via-transparent to-transparent" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-green)]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-blue)]/10 rounded-full blur-3xl" />

                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <Badge variant="success" className="mb-6">
                        🔥 v3.0 Yayında - AI Destekli Analiz
                    </Badge>

                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        Canlı Maç Sinyalleri ile
                        <br />
                        <span className="text-gradient">Gol Anını Yakala</span>
                    </h1>

                    <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
                        Yapay zeka destekli momentum analizi ile maçlarda gol olasılığı yüksek anları tespit et.
                        Gerçek zamanlı istatistikler, akıllı algoritmalar.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link to="/register">
                            <Button variant="primary" size="lg">
                                🚀 Ücretsiz Başla
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button variant="secondary" size="lg">
                                Fiyatları Gör
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                        {stats.map((stat, i) => (
                            <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 backdrop-blur border border-[var(--border-color)]">
                                <p className="text-2xl md:text-3xl font-bold text-[var(--accent-green)]">{stat.value}</p>
                                <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 bg-[var(--bg-secondary)]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Neden <span className="text-gradient">GoalSniper Pro</span>?
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
                            En gelişmiş canlı maç analiz platformu. Her özellik, daha doğru sinyaller için tasarlandı.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <Card key={i} className="text-center">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Nasıl Çalışır?</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center text-3xl mx-auto mb-4">
                                1️⃣
                            </div>
                            <h3 className="font-semibold mb-2">Kayıt Ol</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Ücretsiz hesap oluştur, hemen başla</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-blue)]/20 flex items-center justify-center text-3xl mx-auto mb-4">
                                2️⃣
                            </div>
                            <h3 className="font-semibold mb-2">Sinyalleri Takip Et</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Canlı maçlarda AI destekli sinyaller al</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-gold)]/20 flex items-center justify-center text-3xl mx-auto mb-4">
                                3️⃣
                            </div>
                            <h3 className="font-semibold mb-2">Kazan</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Kupon oluştur, analizleri kullan</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-r from-[var(--accent-green)]/10 to-[var(--accent-blue)]/10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Bugün Başla, <span className="text-gradient">Fırsatı Kaçırma!</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Ücretsiz plan ile günde 3 sinyal al. Pro'ya yükselt, limitleri kaldır.
                    </p>
                    <Link to="/register">
                        <Button variant="primary" size="lg">
                            🚀 Hemen Kayıt Ol - Ücretsiz
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
