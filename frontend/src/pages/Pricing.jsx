import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Pricing() {
    const navigate = useNavigate();

    const plans = [
        {
            name: 'Ücretsiz',
            price: 0,
            description: 'Başlangıç için ideal',
            features: [
                'Telegram kanalına erişim',
                'Günlük ücretsiz tahminler',
                'Topluluk desteği'
            ],
            missing: ['SENTIO AI Chat', 'Özel kupon önerileri', 'Detaylı istatistikler'],
            cta: 'Ücretsiz Başla',
            variant: 'secondary'
        },
        {
            name: 'PRO',
            price: 199,
            yearlyPrice: 1499,
            description: 'Tam SENTIO deneyimi',
            features: [
                'Telegram kanalına erişim',
                'Günlük ücretsiz tahminler',
                'Sınırsız SENTIO AI Chat',
                'Özel kupon önerileri',
                'Detaylı istatistikler',
                'Öncelikli destek'
            ],
            missing: [],
            cta: 'PRO\'ya Yükselt',
            variant: 'primary',
            popular: true
        }
    ];

    return (
        <div className="min-h-screen bg-base py-16 px-6">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        Planını Seç
                    </h1>
                    <p className="text-white/60 max-w-xl mx-auto">
                        İhtiyacına uygun planı seç ve SENTIO AI ile akıllı bahis yapmaya başla.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {plans.map((plan, i) => (
                        <div key={i} className={`relative ${plan.popular ? 'md:-translate-y-2' : ''}`}>
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold z-20">
                                    ÖNERİLEN
                                </div>
                            )}
                            <NeuCard className={`h-full flex flex-col ${plan.popular ? 'border-2 border-cyan-500/30' : ''}`} padding="p-8">
                                <div className="mb-6">
                                    <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-cyan-400' : 'text-white'}`}>
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm text-white/50">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black text-white">₺{plan.price}</span>
                                        <span className="text-white/50 mb-1">/ay</span>
                                    </div>
                                    {plan.yearlyPrice && (
                                        <div className="text-sm text-white/40 mt-1">
                                            veya yıllık ₺{plan.yearlyPrice} (%37 indirim)
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3 mb-8">
                                    {plan.features.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                                            <span className="text-white/80">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.missing.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <X size={18} className="text-white/30 shrink-0" />
                                            <span className="text-white/40 line-through">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <NeuButton
                                    variant={plan.variant}
                                    className={`w-full py-3 ${plan.popular ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-0' : ''}`}
                                    onClick={() => plan.price === 0 ? navigate('/register') : navigate('/checkout')}
                                >
                                    {plan.cta}
                                </NeuButton>
                            </NeuCard>
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div className="text-center space-y-4">
                    <p className="text-white/50 text-sm">
                        Tüm planlar anında aktifleşir. İstediğiniz zaman iptal edebilirsiniz.
                    </p>
                    <p className="text-white/40 text-xs">
                        Sorularınız mı var? <a href="https://t.me/goalsniperai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Telegram'dan bize ulaşın</a>
                    </p>
                </div>

            </div>
        </div>
    );
}
