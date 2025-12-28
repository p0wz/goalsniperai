import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, Shield, Zap, ArrowRight, Check, TrendingUp, Star, Crown } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();

    const features = [
        {
            icon: Sparkles,
            title: "AI Destekli Analiz",
            description: "Yapay zeka ile maç analizleri ve tahminler. Güncel verilerle desteklenen öngörüler.",
            color: "primary"
        },
        {
            icon: TrendingUp,
            title: "Günlük Tahminler",
            description: "Her gün güncellenen profesyonel tahminler. Form, istatistik ve performans analizleri.",
            color: "accent"
        },
        {
            icon: Shield,
            title: "Veri Odaklı",
            description: "Gerçek istatistiklere dayalı öngörüler. H2H geçmişi, lig ortalamaları analiz edilir.",
            color: "win"
        }
    ];

    const stats = [
        { value: "78%", label: "Başarı Oranı", icon: Trophy },
        { value: "500+", label: "Günlük Kullanıcı", icon: Star },
        { value: "1000+", label: "Analiz Edilen Maç", icon: Zap }
    ];

    const proFeatures = [
        "Sınırsız günlük tahmin",
        "AI destekli detaylı analizler",
        "Özel Telegram grubu erişimi",
        "Anlık bildirimler",
        "7/24 destek",
        "Erken erişim öngörüleri"
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            </div>

            {/* Hero Section */}
            <section className="relative pt-20 pb-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-slide-up" style={{ animationDelay: '0ms' }}>
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-semibold">AI Tahmin Platformu</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight animate-slide-up" style={{ animationDelay: '100ms' }}>
                        Profesyonel <span className="text-gradient">Spor Tahminleri</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                        SENTIO AI ile günlük maç analizleri ve tahminler.
                        Yapay zeka destekli öngörülerle bir adım önde olun.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <button
                            onClick={() => navigate('/register')}
                            className="px-8 py-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg glow-primary flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            Ücretsiz Başla
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-lg hover:bg-secondary/80 transition-colors"
                        >
                            Giriş Yap
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card-premium rounded-3xl p-8">
                        <div className="grid grid-cols-3 gap-8">
                            {stats.map((stat, idx) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={idx} className="text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                                            <Icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Neden Goalify?</h2>
                        <p className="text-muted-foreground">Akıllı tahmin platformunun avantajları</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <div key={idx} className="glass-card-premium rounded-2xl p-6 card-hover">
                                    <div className={`w-14 h-14 rounded-xl bg-${feature.color}/10 flex items-center justify-center mb-4`}>
                                        <Icon className={`w-7 h-7 text-${feature.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PRO Plan Section */}
            <section className="py-16 px-4">
                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            PRO <span className="text-gradient">Üyelik</span>
                        </h2>
                        <p className="text-muted-foreground">Tüm özelliklere sınırsız erişim</p>
                    </div>

                    <div className="glass-card-premium rounded-3xl p-8 border-2 border-primary/30 glow-primary">
                        {/* Badge */}
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-accent text-accent-foreground">
                                <Crown className="w-4 h-4" />
                                <span className="text-sm font-bold">EN AVANTAJLI</span>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="text-center mb-8">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-bold text-foreground">₺99</span>
                                <span className="text-muted-foreground">/ay</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">7 gün ücretsiz deneme</p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mb-8">
                            {proFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                    <span className="text-foreground">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => navigate('/pricing')}
                            className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg glow-primary hover:opacity-90 transition-opacity"
                        >
                            PRO'ya Yükselt
                        </button>

                        <p className="text-center text-xs text-muted-foreground mt-4">
                            İstediğiniz zaman iptal edebilirsiniz
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="rounded-3xl p-8 md:p-12 gradient-premium relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJNMCAyMGgyME0yMCAwdjIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-30" />

                        <div className="relative text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-6">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Hemen Başla</h2>
                            <p className="text-white/80 mb-8 max-w-md mx-auto">
                                SENTIO AI ile günlük tahminlere erişin. Ücretsiz kayıt olun ve profesyonel analizleri keşfedin.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => navigate('/register')}
                                    className="px-8 py-4 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors"
                                >
                                    Ücretsiz Kayıt Ol
                                </button>
                                <a
                                    href="https://t.me/goalsniperai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    📢 Telegram Kanalı
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer spacing */}
            <div className="h-16" />
        </div>
    );
}
