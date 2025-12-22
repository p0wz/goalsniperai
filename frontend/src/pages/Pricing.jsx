import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Pricing() {
    const navigate = useNavigate();

    const plans = [
        {
            name: 'Free',
            price: 0,
            description: 'Perfect to get started',
            features: [
                'Telegram channel access',
                'Daily free tips',
                'Community support'
            ],
            missing: ['SENTIO AI Chat', 'Custom coupon suggestions', 'Detailed statistics'],
            cta: 'Start Free',
            variant: 'secondary'
        },
        {
            name: 'PRO',
            price: 15,
            yearlyPrice: 120,
            description: 'Full SENTIO experience',
            features: [
                'Telegram channel access',
                'Daily free tips',
                'Unlimited SENTIO AI Chat',
                'Custom coupon suggestions',
                'Detailed statistics',
                'Priority support'
            ],
            missing: [],
            cta: 'Upgrade to PRO',
            variant: 'primary',
            popular: true
        }
    ];

    return (
        <div className="min-h-screen bg-base py-16 px-6">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main">
                        Choose Your Plan
                    </h1>
                    <p className="text-text-muted max-w-xl mx-auto">
                        Select the plan that fits your needs and start smart betting with SENTIO AI.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {plans.map((plan, i) => (
                        <div key={i} className={`relative ${plan.popular ? 'md:-translate-y-2' : ''}`}>
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold z-20">
                                    RECOMMENDED
                                </div>
                            )}
                            <NeuCard className={`h-full flex flex-col ${plan.popular ? 'border-2 border-cyan-500/30' : ''}`} padding="p-8">
                                <div className="mb-6">
                                    <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-cyan-400' : 'text-text-main'}`}>
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm text-text-muted">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black text-text-main">${plan.price}</span>
                                        <span className="text-text-muted mb-1">/month</span>
                                    </div>
                                    {plan.yearlyPrice && (
                                        <div className="text-sm text-text-muted mt-1">
                                            or ${plan.yearlyPrice}/year (save 33%)
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3 mb-8">
                                    {plan.features.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                                            <span className="text-text-muted">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.missing.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <X size={18} className="text-text-muted/30 shrink-0" />
                                            <span className="text-text-muted/40 line-through">{feature}</span>
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
                    <p className="text-text-muted text-sm">
                        All plans activate instantly. Cancel anytime.
                    </p>
                    <p className="text-text-muted/60 text-xs">
                        Questions? <a href="https://t.me/goalsniperai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Contact us on Telegram</a>
                    </p>
                </div>

            </div>
        </div>
    );
}
