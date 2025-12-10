import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';
import { Button, Card, Badge } from '../components/ui';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
};

export default function Landing() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center pt-[72px] px-8 lg:px-12 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-secondary/5 rounded-full blur-[120px]" />

                <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="relative z-10"
                    >
                        <motion.div variants={fadeInUp}>
                            <Badge pulse>Canlı veri akışı aktif</Badge>
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="font-display text-[2.75rem] md:text-6xl lg:text-[5.25rem] leading-[1.05] tracking-tight mt-6"
                        >
                            Futbol analizinde{' '}
                            <span className="relative">
                                <span className="gradient-text">yeni nesil</span>
                                <span className="absolute -bottom-1 md:-bottom-2 left-0 h-3 md:h-4 w-full rounded bg-gradient-to-r from-accent/15 to-accent-secondary/10" />
                            </span>
                            {' '}yaklaşım
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-lg text-muted-foreground mt-6 max-w-lg leading-relaxed"
                        >
                            Gerçek zamanlı maç verileri ve yapay zeka destekli analizlerle profesyonel düzeyde futbol tahminleri.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 mt-10">
                            <Link to="/register">
                                <Button size="lg" className="group">
                                    Ücretsiz deneyin
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="secondary" size="lg">
                                    Canlı paneli gör
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-wrap gap-12 mt-16 pt-8 border-t border-border"
                        >
                            <Stat value="2.4K+" label="Aktif kullanıcı" />
                            <Stat value="89%" label="Başarı oranı" />
                            <Stat value="50ms" label="Veri gecikmesi" />
                            <Stat value="24/7" label="İzleme" />
                        </motion.div>
                    </motion.div>

                    {/* Right: Hero Graphic */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="hidden lg:block relative"
                    >
                        <HeroGraphic />
                    </motion.div>
                </div>
            </section>

            {/* Marquee */}
            <Marquee />

            {/* Features Section */}
            <section id="features" className="py-28 lg:py-44 px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={stagger}
                        className="max-w-xl mb-16"
                    >
                        <motion.div variants={fadeInUp}>
                            <Badge>Özellikler</Badge>
                        </motion.div>
                        <motion.h2 variants={fadeInUp} className="font-display text-3xl lg:text-[3.25rem] leading-tight mt-4">
                            Profesyonel araçlar,{' '}
                            <span className="gradient-text">basit arayüz</span>
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-muted-foreground mt-4 text-lg">
                            Karmaşık verileri anlaşılır sinyallere dönüştürüyoruz.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={stagger}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        <FeatureCard
                            icon="📊"
                            title="Canlı İstatistikler"
                            description="xG, şut, korner, tehlikeli atak ve daha fazlası. Tüm veriler saniyeler içinde güncellenir."
                        />
                        <FeatureCard
                            icon="🎯"
                            title="IY 0.5 Stratejisi"
                            description="İlk yarıdaki golsüz maçlarda yüksek potansiyelli fırsatları tespit eder."
                        />
                        <FeatureCard
                            icon="🔥"
                            title="MS Gol Analizi"
                            description="Maç sonu yaklaşırken momentum ve baskı analizi ile geç gol potansiyelini değerlendirir."
                        />
                        <FeatureCard
                            icon="🧠"
                            title="Yapay Zeka"
                            description="Google Gemini AI ile her sinyal için detaylı analiz ve güven skoru."
                        />
                        <FeatureCard
                            icon="⚡"
                            title="Anlık Uyarılar"
                            description="Yüksek potansiyelli fırsatlar için anında bildirim alın."
                        />
                        <FeatureCard
                            icon="📈"
                            title="Performans Takibi"
                            description="Geçmiş sinyallerin başarı oranlarını ve istatistiklerini inceleyin."
                        />
                    </motion.div>
                </div>
            </section>

            {/* How It Works - Inverted Section */}
            <section id="how-it-works" className="section-inverted dot-pattern py-28 lg:py-44 px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={stagger}
                        className="text-center max-w-xl mx-auto mb-20"
                    >
                        <motion.div variants={fadeInUp} className="flex justify-center">
                            <div className="section-badge bg-white/5 border-white/20">
                                <span className="section-badge-dot bg-white" />
                                <span className="section-badge-text text-white/80">Nasıl Çalışır</span>
                            </div>
                        </motion.div>
                        <motion.h2 variants={fadeInUp} className="font-display text-3xl lg:text-[3.25rem] leading-tight mt-4 text-white">
                            Dört adımda profesyonel analiz
                        </motion.h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={stagger}
                        className="grid md:grid-cols-4 gap-8 relative"
                    >
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[30px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-accent via-white/20 to-white/10" />

                        <StepCard number="01" title="Veri toplama" description="Flashscore API'den saniye saniye maç verileri çekilir." />
                        <StepCard number="02" title="Filtreleme" description="Strateji kriterlerine uyan maçlar belirlenir." />
                        <StepCard number="03" title="AI analizi" description="Gemini AI ile detaylı değerlendirme yapılır." />
                        <StepCard number="04" title="Sinyal" description="Onaylanan fırsatlar anında size iletilir." />
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-28 lg:py-44 px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={stagger}
                        className="text-center max-w-xl mx-auto mb-16"
                    >
                        <motion.div variants={fadeInUp} className="flex justify-center">
                            <Badge>Kullanıcılar</Badge>
                        </motion.div>
                        <motion.h2 variants={fadeInUp} className="font-display text-3xl lg:text-[3.25rem] leading-tight mt-4">
                            Kullanıcılarımız ne diyor?
                        </motion.h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={stagger}
                        className="grid md:grid-cols-3 gap-6"
                    >
                        <TestimonialCard
                            text="Sinyallerin isabetlilik oranı gerçekten etkileyici. IY 0.5 stratejisi ile ciddi kazançlar elde ettim."
                            name="Ahmet K."
                            role="Premium Üye"
                        />
                        <TestimonialCard
                            text="Gemini AI analizi oyunun kurallarını değiştirdi. Artık rastgele bahis yapmak yerine verilere dayalı kararlar veriyorum."
                            name="Mehmet Y."
                            role="Pro Üye"
                            offset
                        />
                        <TestimonialCard
                            text="Arayüz çok kullanışlı ve sade. Karmaşık verileri anlamak için uzman olmanıza gerek yok."
                            name="Emre O."
                            role="Ücretsiz Üye"
                        />
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-28 lg:py-44 px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-muted rounded-3xl p-8 lg:p-16">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            variants={stagger}
                            className="text-center max-w-xl mx-auto mb-16"
                        >
                            <motion.div variants={fadeInUp} className="flex justify-center">
                                <Badge>Fiyatlandırma</Badge>
                            </motion.div>
                            <motion.h2 variants={fadeInUp} className="font-display text-3xl lg:text-[3.25rem] leading-tight mt-4">
                                Basit ve <span className="gradient-text">şeffaf</span>
                            </motion.h2>
                            <motion.p variants={fadeInUp} className="text-muted-foreground mt-4">
                                Gizli ücret yok. İstediğiniz zaman iptal edin.
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                            variants={stagger}
                            className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
                        >
                            <PricingCard
                                name="Başlangıç"
                                price="0₺"
                                period="Sonsuza kadar ücretsiz"
                                features={[
                                    { text: 'Günlük 3 sinyal', included: true },
                                    { text: 'IY 0.5 stratejisi', included: true },
                                    { text: 'Temel istatistikler', included: true },
                                    { text: 'MS Gol stratejisi', included: false },
                                    { text: 'Yapay zeka analizi', included: false },
                                ]}
                                buttonText="Ücretsiz başla"
                                buttonVariant="secondary"
                            />
                            <PricingCard
                                name="Pro"
                                price="99₺"
                                period="aylık"
                                featured
                                features={[
                                    { text: 'Sınırsız sinyal', included: true },
                                    { text: 'Tüm stratejiler', included: true },
                                    { text: 'Detaylı istatistikler', included: true },
                                    { text: 'Gerçek zamanlı veri', included: true },
                                    { text: 'Yapay zeka analizi', included: true },
                                ]}
                                buttonText="Pro'ya geçin"
                                buttonVariant="primary"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-28 px-8 lg:px-12 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 blur-[100px]" />
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={stagger}
                    className="relative z-10 max-w-lg mx-auto"
                >
                    <motion.h2 variants={fadeInUp} className="font-display text-4xl lg:text-5xl">
                        Hemen başlayın
                    </motion.h2>
                    <motion.p variants={fadeInUp} className="text-muted-foreground mt-4">
                        Profesyonel futbol analizine ücretsiz erişim. Kredi kartı gerektirmez.
                    </motion.p>
                    <motion.div variants={fadeInUp} className="mt-8">
                        <Link to="/register">
                            <Button size="lg" className="shadow-accent-lg">
                                Ücretsiz hesap oluştur
                            </Button>
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </div>
    );
}

// Sub-components
function Stat({ value, label }) {
    return (
        <div>
            <div className="font-display text-2xl lg:text-3xl text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
        </div>
    );
}

function HeroGraphic() {
    return (
        <div className="relative w-full aspect-square">
            {/* Rotating Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/20 animate-rotate-slow" />

            {/* Floating Cards */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[15%] left-[10%] bg-card border border-border rounded-xl p-4 shadow-lg"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">📈</div>
                    <div>
                        <div className="text-sm font-semibold">+89%</div>
                        <div className="text-xs text-muted-foreground">Başarı</div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[20%] right-[5%] bg-card border border-border rounded-xl p-4 shadow-lg"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">🎯</div>
                    <div>
                        <div className="text-sm font-semibold">12</div>
                        <div className="text-xs text-muted-foreground">Sinyal</div>
                    </div>
                </div>
            </motion.div>

            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full gradient-bg shadow-accent-lg flex items-center justify-center">
                <span className="text-5xl">⚽</span>
            </div>
        </div>
    );
}

function Marquee() {
    const items = [
        '⚡ Gerçek zamanlı veriler',
        '🧠 Gemini AI destekli',
        '📊 Detaylı istatistikler',
        '🎯 Yüksek isabet oranı',
        '🔔 Anlık bildirimler',
        '📈 Performans takibi',
    ];

    return (
        <div className="py-8 border-y border-border overflow-hidden">
            <div className="flex animate-marquee">
                {[...items, ...items].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-8 text-muted-foreground whitespace-nowrap">
                        <span>{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <motion.div variants={fadeInUp}>
            <Card className="h-full relative group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent-secondary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </Card>
        </motion.div>
    );
}

function StepCard({ number, title, description }) {
    return (
        <motion.div variants={fadeInUp} className="text-center relative z-10">
            <div className="w-14 h-14 mx-auto rounded-full bg-foreground border-2 border-white/20 flex items-center justify-center font-display text-xl text-white mb-6 hover:bg-accent hover:border-accent transition-colors cursor-default">
                {number}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-white/60 text-sm">{description}</p>
        </motion.div>
    );
}

function TestimonialCard({ text, name, role, offset = false }) {
    return (
        <motion.div variants={fadeInUp} className={offset ? 'md:-mt-8' : ''}>
            <Card className="h-full">
                <div className="w-1 h-8 gradient-bg rounded mb-4" />
                <p className="text-foreground leading-relaxed mb-6">"{text}"</p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center font-semibold text-white text-sm">
                        {name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                        <div className="font-semibold text-sm">{name}</div>
                        <div className="text-xs text-muted-foreground">{role}</div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

function PricingCard({ name, price, period, features, buttonText, buttonVariant, featured = false }) {
    return (
        <motion.div variants={fadeInUp}>
            <Card featured={featured} className={`h-full ${featured ? 'relative' : ''}`}>
                {featured && (
                    <div className="absolute -top-3 left-6 px-3 py-1 gradient-bg rounded text-xs font-bold text-white">
                        Önerilen
                    </div>
                )}
                <div className="text-sm text-muted-foreground uppercase tracking-wide">{name}</div>
                <div className="font-display text-4xl mt-2">{price}</div>
                <div className="text-sm text-muted-foreground mt-1 mb-6">{period}</div>

                <ul className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                        <li key={i} className={`flex items-center gap-3 text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                            <span className={feature.included ? 'text-accent' : 'text-muted-foreground/30'}>
                                {feature.included ? '✓' : '✕'}
                            </span>
                            {feature.text}
                        </li>
                    ))}
                </ul>

                <Link to={`/register?plan=${name.toLowerCase()}`} className="block">
                    <Button variant={buttonVariant} className="w-full">
                        {buttonText}
                    </Button>
                </Link>
            </Card>
        </motion.div>
    );
}
