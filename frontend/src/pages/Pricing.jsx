import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar, Footer } from '../components/layout';
import { Button, Card, Badge } from '../components/ui';

const fadeInUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
};

export default function Pricing() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <section className="pt-32 pb-20 px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="text-center max-w-xl mx-auto mb-16"
                    >
                        <motion.div variants={fadeInUp} className="flex justify-center">
                            <Badge>Fiyatlandırma</Badge>
                        </motion.div>
                        <motion.h1 variants={fadeInUp} className="font-display text-4xl lg:text-5xl mt-4">
                            Basit ve <span className="gradient-text">şeffaf</span>
                        </motion.h1>
                        <motion.p variants={fadeInUp} className="text-muted-foreground mt-4 text-lg">
                            Gizli ücret yok. İstediğiniz zaman iptal edin.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20"
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
                                { text: 'Yapay zeka analizi', included: false },
                            ]}
                            buttonText="Pro'ya geçin"
                            buttonVariant="primary"
                        />
                        <PricingCard
                            name="Premium"
                            price="199₺"
                            period="aylık"
                            features={[
                                { text: 'Tüm Pro özellikleri', included: true },
                                { text: 'Gemini AI analizi', included: true },
                                { text: 'Öncelikli sinyaller', included: true },
                                { text: 'Detaylı AI raporları', included: true },
                                { text: 'Öncelikli destek', included: true },
                            ]}
                            buttonText="Premium al"
                            buttonVariant="secondary"
                        />
                    </motion.div>

                    {/* FAQ */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="max-w-2xl mx-auto"
                    >
                        <motion.h2 variants={fadeInUp} className="font-display text-2xl text-center mb-8">
                            Sıkça Sorulan Sorular
                        </motion.h2>

                        <div className="space-y-4">
                            <FAQItem
                                question="Sinyaller ne kadar güvenilir?"
                                answer="Sistem gerçek zamanlı maç verilerini analiz eder. Tarihsel veriler %85+ başarı oranı göstermektedir."
                            />
                            <FAQItem
                                question="Planlar arasında geçiş yapabilir miyim?"
                                answer="Evet, istediğiniz zaman yükseltme veya düşürme yapabilirsiniz."
                            />
                            <FAQItem
                                question="Ödeme yöntemleri nelerdir?"
                                answer="Kredi kartı, banka kartı ve havale ile ödeme yapabilirsiniz."
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
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

function FAQItem({ question, answer }) {
    return (
        <motion.div variants={fadeInUp}>
            <Card hover={false} className="p-6">
                <h3 className="font-semibold mb-2">{question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
            </Card>
        </motion.div>
    );
}
