import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Pricing({ onChoosePlan }) {
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

    const plans = [
        {
            name: 'Rookie',
            price: 0,
            description: 'Essential tools for casual bettors.',
            features: [
                '3 Daily Signals',
                'Major Leagues (Top 5)',
                'Basic Stats',
                'Community Access'
            ],
            missing: ['Live Sniper Bot', 'AI Probabilities', 'Daily Curated Picks', 'Daily Parlay'],
            cta: 'Start Free',
            variant: 'secondary'
        },
        {
            name: 'Pro Analyst',
            price: billingCycle === 'monthly' ? 29 : 290,
            originalPrice: billingCycle === 'monthly' ? null : 348,
            description: 'Complete arsenal for serious profit.',
            features: [
                'Unlimited Live Signals',
                'All 850+ Leagues',
                'Live Sniper Bot Access',
                '🎯 Daily Curated Picks',
                '🚀 Daily High-Odds Parlay',
                'AI Analysis & Value Detection'
            ],
            missing: [],
            cta: 'Upgrade to Pro',
            variant: 'primary',
            popular: true
        }
    ];

    return (
        <div className="min-h-screen bg-base py-20 px-6 font-body text-text-main">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* Header */}
                <div className="text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                        Invest in Your <span className="text-accent">Edge</span>
                    </h1>
                    <p className="text-xl text-text-muted max-w-2xl mx-auto">
                        Choose the plan that fits your volume. <br />
                        Cancel anytime. 14-day money-back guarantee on Pro plans.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-text-main' : 'text-text-muted'}`}>Monthly</span>
                        <div
                            className="w-16 h-8 rounded-full bg-base shadow-neu-inset p-1 cursor-pointer flex items-center transition-all"
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        >
                            <div className={`w-6 h-6 rounded-full bg-accent shadow-neu-extruded transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-8' : ''}`} />
                        </div>
                        <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-text-main' : 'text-text-muted'}`}>
                            Yearly <span className="text-accent text-xs">(Save 20%)</span>
                        </span>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8 items-start">
                    {plans.map((plan, i) => (
                        <div key={i} className={`relative ${plan.popular ? 'md:-translate-y-4' : ''}`}>
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-4 py-1 rounded-full text-xs font-bold shadow-neu-extruded z-20">
                                    RECOMMENDED
                                </div>
                            )}
                            <NeuCard className={`h-full flex flex-col ${plan.popular ? 'border-2 border-accent/20 relative z-10' : 'opacity-90 hover:opacity-100 transition-opacity'}`}>
                                <div className="mb-8">
                                    <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-accent' : ''}`}>{plan.name}</h3>
                                    <p className="text-sm text-text-muted h-10">{plan.description}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-end gap-1">
                                        <span className="text-5xl font-black">${plan.price}</span>
                                        <span className="text-text-muted font-bold mb-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                    </div>
                                    {plan.originalPrice && (
                                        <div className="text-sm text-text-muted line-through mt-1 pl-1">
                                            ${plan.originalPrice}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4 mb-8">
                                    {plan.features.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm font-medium">
                                            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                    {plan.missing.map((feature, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm text-text-muted/50">
                                            <X size={18} className="shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <NeuButton
                                    variant={plan.variant}
                                    className="w-full py-4 text-lg"
                                    onClick={() => onChoosePlan(plan)}
                                >
                                    {plan.cta}
                                </NeuButton>
                            </NeuCard>
                        </div>
                    ))}
                </div>

                {/* FAQ Snippet */}
                <div className="text-center pt-12">
                    <p className="text-text-muted">Questions? Check our <a href="#" className="text-accent font-bold hover:underline">FAQ</a> or talk to support.</p>
                </div>
            </div>
        </div>
    );
}
