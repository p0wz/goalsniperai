import { useState } from 'react';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';
import NeuInput from '../components/ui/NeuInput';

export default function Checkout({ plan, onBack, onComplete }) {
    const [loading, setLoading] = useState(false);

    const handlePay = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            onComplete();
        }, 2000);
    };

    if (!plan) return null;

    return (
        <div className="min-h-screen bg-base py-12 px-6 flex items-center justify-center font-body text-text-main">
            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12">

                {/* Summary Section */}
                <div className="space-y-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors font-bold text-sm">
                        <ArrowLeft size={16} /> Back to Pricing
                    </button>

                    <div>
                        <h1 className="text-3xl font-extrabold mb-2">Secure Checkout</h1>
                        <p className="text-text-muted">Complete your upgrade to unlock professional power.</p>
                    </div>

                    <NeuCard className="bg-base shadow-neu-inset" padding="p-6">
                        <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                        <div className="flex justify-between items-center py-4 border-b border-text-muted/10">
                            <span className="font-medium text-text-muted">{plan.name} Plan</span>
                            <span className="font-bold">${plan.price}</span>
                        </div>
                        <div className="flex justify-between items-center py-4">
                            <span className="font-bold text-lg">Total Today</span>
                            <span className="font-black text-2xl text-accent">${plan.price}</span>
                        </div>
                    </NeuCard>

                    <div className="flex items-center gap-3 text-sm text-text-muted bg-green-500/5 p-4 rounded-xl border border-green-500/10">
                        <Lock size={16} className="text-green-500" />
                        <span>Encrypted 256-bit SSL connection. Your data is safe.</span>
                    </div>
                </div>

                {/* Payment Form */}
                <NeuCard className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <CreditCard size={120} />
                    </div>

                    <form onSubmit={handlePay} className="space-y-6 relative z-10">
                        <h3 className="text-xl font-bold mb-6">Payment Details</h3>

                        <div className="space-y-4">
                            <NeuInput
                                label="Cardholder Name"
                                placeholder="John Doe"
                            />

                            <NeuInput
                                label="Card Number"
                                placeholder="0000 0000 0000 0000"
                                icon={<CreditCard size={18} />}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <NeuInput
                                    label="Expiry Date"
                                    placeholder="MM/YY"
                                />
                                <NeuInput
                                    label="CVC"
                                    placeholder="123"
                                    type="password"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <NeuButton
                                type="submit"
                                variant="primary"
                                className="w-full py-4 text-lg"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : `Pay $${plan.price}`}
                            </NeuButton>
                            <p className="text-center text-xs text-text-muted mt-4">
                                By confirming, you accept the Terms of Service.
                            </p>
                        </div>
                    </form>
                </NeuCard>

            </div>
        </div>
    );
}
