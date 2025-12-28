import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, Shield, ArrowLeft, Sparkles } from 'lucide-react';

export default function Pricing() {
    const navigate = useNavigate();
    const [isYearly, setIsYearly] = useState(false);

    const proFeatures = [
        { text: "Sınırsız günlük tahmin", included: true },
        { text: "AI destekli detaylı analizler", included: true },
        { text: "Özel Telegram grubu", included: true },
        { text: "Anlık bildirimler", included: true },
        { text: "7/24 öncelikli destek", included: true },
        { text: "Erken erişim öngörüleri", included: true },
    ];

    const monthlyPrice = 99;
    const yearlyPrice = monthlyPrice * 10; // 2 ay ücretsiz

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 p-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <h1 className="text-xl font-semibold text-foreground">PRO Üyelik</h1>
            </header>

            <div className="relative z-10 px-4 pb-8 max-w-lg mx-auto">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-4">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">%20 indirim - Sınırlı süre</span>
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                        PRO'ya <span className="text-gradient">Yükselt</span>
                    </h2>
                    <p className="text-muted-foreground">
                        Daha fazla tahmin, daha detaylı analizler
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <span className={`text-sm ${!isYearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        Aylık
                    </span>
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? "bg-primary" : "bg-secondary"
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${isYearly ? "translate-x-8" : "translate-x-1"
                                }`}
                        />
                    </button>
                    <span className={`text-sm ${isYearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        Yıllık <span className="text-primary">(-20%)</span>
                    </span>
                </div>

                {/* PRO Plan Card */}
                <div className="glass-card-premium rounded-3xl p-6 border-2 border-primary/30 glow-primary mb-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium mb-4">
                        <Crown className="w-3 h-3" />
                        En Popüler
                    </div>

                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                                <Crown className="w-6 h-6 text-accent-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">PRO</h3>
                                <p className="text-sm text-muted-foreground">Tam deneyim</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-foreground">
                                    ₺{isYearly ? yearlyPrice : monthlyPrice}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {isYearly ? "/yıl" : "/ay"}
                                </span>
                            </div>
                            {isYearly && (
                                <p className="text-xs text-win">2 ay ücretsiz!</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {proFeatures.map((feature, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-foreground"
                            >
                                <Check className="w-4 h-4 text-primary shrink-0" />
                                <span>{feature.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Selection indicator */}
                    <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-accent/20 text-accent mb-4">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Seçili Plan</span>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={() => navigate('/checkout')}
                    className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl text-lg glow-primary hover:opacity-90 transition-opacity"
                >
                    Şimdi Başla
                </button>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Güvenli Ödeme</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Zap className="w-4 h-4" />
                        <span>Anında Aktivasyon</span>
                    </div>
                </div>

                <p className="text-center text-muted-foreground text-xs mt-4">
                    İstediğiniz zaman iptal edebilirsiniz. İlk 7 gün ücretsiz deneme.
                </p>

                {/* Contact */}
                <p className="text-center text-muted-foreground/60 text-xs mt-6">
                    Sorularınız mı var?{" "}
                    <a
                        href="https://t.me/goalsniperai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Telegram'dan bize ulaşın
                    </a>
                </p>
            </div>
        </div>
    );
}
