import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, MessageCircle, ArrowLeft, Shield } from 'lucide-react';

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background bg-pattern">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <h1 className="text-2xl font-bold text-foreground">Hakkımızda</h1>
                </div>

                {/* Main Card */}
                <div className="glass-card-premium rounded-3xl p-8 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                            <Zap className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Goalify AI</h2>
                            <p className="text-muted-foreground text-sm">AI Destekli Tahmin Platformu</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            <strong className="text-foreground">Goalify AI</strong>, yapay zeka destekli
                            profesyonel spor tahmin platformudur. Günlük maç analizleri ve istatistiksel
                            öngörüler sunar.
                        </p>
                        <p>
                            <strong className="text-primary">SENTIO</strong> asistanımız, günlük maç
                            istatistiklerini analiz eder ve kullanıcı sorularına detaylı yanıtlar verir.
                            Form, H2H geçmişi ve ev/deplasman performanslarını değerlendirir.
                        </p>
                        <p>
                            Amacımız, duygusal kararlar yerine veri odaklı analizlerle size yardımcı olmaktır.
                            SENTIO sonuç garantisi vermez - ancak daha bilinçli kararlar vermenize yardımcı olur.
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div className="glass-card rounded-2xl p-6 card-hover">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">Veri Odaklı</h3>
                        <p className="text-muted-foreground text-sm">
                            Tahminlerimiz gerçek maç istatistiklerine dayanır.
                            Duygusal değil, veye dayalı analizler.
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-6 card-hover">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                            <MessageCircle className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">Kolay Kullanım</h3>
                        <p className="text-muted-foreground text-sm">
                            SENTIO ile doğal dilde sohbet edin.
                            Karmaşık istatistikleri anlamanız gerekmez.
                        </p>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="glass-card rounded-2xl p-6 border border-muted/20">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h4 className="font-medium text-foreground mb-1">Önemli Uyarı</h4>
                            <p className="text-muted-foreground text-sm">
                                Tahminlerimiz yalnızca bilgilendirme amaçlıdır ve kesin sonuç garantisi vermez.
                                Kararlarınızı kendiniz verin ve sorumlu davranın.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Back Button */}
                <div className="text-center mt-8">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        </div>
    );
}
