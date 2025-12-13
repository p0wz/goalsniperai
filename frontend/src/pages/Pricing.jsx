import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';
import { Card, Button, Badge } from '../components/ui';

const Pricing = () => {
    const [billing, setBilling] = useState('monthly');

    const plans = [
        {
            name: 'Free',
            price: { monthly: 0, yearly: 0 },
            description: 'Başlamak için ideal',
            features: [
                'Günde 3 sinyal',
                'Temel istatistikler',
                'Email destek'
            ],
            notIncluded: [
                'Kupon oluşturucu',
                'Sinyal geçmişi',
                'API erişimi',
                'Öncelikli destek'
            ],
            cta: 'Ücretsiz Başla',
            popular: false
        },
        {
            name: 'Pro',
            price: { monthly: 99, yearly: 79 },
            description: 'Ciddi analistler için',
            features: [
                'Günde 25 sinyal',
                'Kupon oluşturucu',
                'Sinyal geçmişi',
                'Detaylı istatistikler',
                'Öncelikli destek'
            ],
            notIncluded: [
                'API erişimi',
                'Sınırsız sinyal'
            ],
            cta: 'Pro\'ya Başla',
            popular: true
        },
        {
            name: 'Premium',
            price: { monthly: 199, yearly: 159 },
            description: 'Profesyoneller için',
            features: [
                'Sınırsız sinyal',
                'Kupon oluşturucu',
                'Sinyal geçmişi',
                'Detaylı istatistikler',
                'API erişimi',
                '7/24 öncelikli destek',
                'Erken erişim özellikleri'
            ],
            notIncluded: [],
            cta: 'Premium\'a Başla',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="pt-24 pb-20 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Sana Uygun <span className="text-gradient">Planı Seç</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
                            İhtiyacına göre planını seç. İstediğin zaman yükselt veya iptal et.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-[var(--bg-secondary)]">
                            <button
                                onClick={() => setBilling('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-[var(--accent-green)] text-black' : 'text-[var(--text-secondary)]'
                                    }`}
                            >
                                Aylık
                            </button>
                            <button
                                onClick={() => setBilling('yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-[var(--accent-green)] text-black' : 'text-[var(--text-secondary)]'
                                    }`}
                            >
                                Yıllık
                                <Badge variant="success" className="ml-2">-20%</Badge>
                            </button>
                        </div>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={`relative ${plan.popular ? 'border-[var(--accent-green)] ring-2 ring-[var(--accent-green)]/20' : ''}`}
                                hover={false}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge variant="success">En Popüler</Badge>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">{plan.description}</p>
                                </div>

                                <div className="text-center mb-6">
                                    <span className="text-4xl font-bold">
                                        {plan.price[billing]}₺
                                    </span>
                                    <span className="text-[var(--text-secondary)]">/ay</span>
                                    {billing === 'yearly' && plan.price.monthly > 0 && (
                                        <p className="text-xs text-[var(--text-muted)] line-through">
                                            {plan.price.monthly}₺/ay
                                        </p>
                                    )}
                                </div>

                                <Link to="/register">
                                    <Button
                                        variant={plan.popular ? 'primary' : 'secondary'}
                                        className="w-full mb-6"
                                    >
                                        {plan.cta}
                                    </Button>
                                </Link>

                                <div className="space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="text-[var(--accent-green)]">✓</span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                    {plan.notIncluded.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                            <span>✕</span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* FAQ */}
                    <div className="mt-20">
                        <h2 className="text-2xl font-bold text-center mb-8">Sık Sorulan Sorular</h2>
                        <div className="max-w-3xl mx-auto space-y-4">
                            <Card hover={false}>
                                <h4 className="font-semibold mb-2">Ücretsiz plan ne kadar süre geçerli?</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Ücretsiz plan süresiz! İstediğin kadar kullanabilirsin, günlük sinyal limiti var.
                                </p>
                            </Card>
                            <Card hover={false}>
                                <h4 className="font-semibold mb-2">Planımı nasıl yükseltirim?</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Profil sayfasından veya bu sayfadan istediğin plana geçebilirsin. Ödemen anında aktif olur.
                                </p>
                            </Card>
                            <Card hover={false}>
                                <h4 className="font-semibold mb-2">İptal edebilir miyim?</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Evet, istediğin zaman iptal edebilirsin. Dönem sonuna kadar premium özellikler aktif kalır.
                                </p>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;
