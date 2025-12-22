import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../services/api';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';
import { CheckCircle2, Copy, Clock } from 'lucide-react';

export default function Checkout() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Select plan, 2: Wallet, 3: Wait for confirmation
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [selectedCrypto, setSelectedCrypto] = useState('USDT_TRC20');
    const [wallets, setWallets] = useState(null);
    const [prices, setPrices] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadWallets();
    }, []);

    const loadWallets = async () => {
        try {
            const res = await paymentService.getWallets();
            if (res.success) {
                setWallets(res.wallets);
                setPrices(res.prices);
            }
        } catch (e) {
            console.error('Failed to load wallets:', e);
        }
    };

    const copyAddress = (address) => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePaymentSubmit = async () => {
        setLoading(true);
        try {
            const res = await paymentService.create(selectedPlan, selectedCrypto);
            if (res.success) {
                setPayment(res.payment);
                setStep(3);
            }
        } catch (e) {
            alert('Failed to create payment request: ' + e.message);
        }
        setLoading(false);
    };

    const cryptoOptions = [
        { id: 'USDT_TRC20', name: 'USDT (TRC20)', icon: '💵', network: 'Tron' },
        { id: 'BTC', name: 'Bitcoin', icon: '₿', network: 'Bitcoin' },
        { id: 'ETH', name: 'Ethereum', icon: 'Ξ', network: 'Ethereum' }
    ];

    return (
        <div className="min-h-screen bg-base py-12 px-6">
            <div className="max-w-lg mx-auto space-y-8">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-text-main mb-2">Upgrade to PRO</h1>
                    <p className="text-text-muted text-sm">Secure crypto payment</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center gap-2">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-cyan-500 text-white' : 'bg-white/10 text-text-muted/40'
                                }`}
                        >
                            {step > s ? '✓' : s}
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Plan */}
                {step === 1 && (
                    <NeuCard padding="p-6" className="space-y-6">
                        <h2 className="font-bold text-text-main text-lg">1. Select Plan</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedPlan('monthly')}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedPlan === 'monthly'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-text-muted/20 hover:border-text-muted/40'
                                    }`}
                            >
                                <div className="text-2xl font-bold text-text-main">$15</div>
                                <div className="text-sm text-text-muted">Monthly</div>
                            </button>
                            <button
                                onClick={() => setSelectedPlan('yearly')}
                                className={`p-4 rounded-xl border-2 transition-all relative ${selectedPlan === 'yearly'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-text-muted/20 hover:border-text-muted/40'
                                    }`}
                            >
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 rounded-full text-xs text-white font-bold">
                                    33% OFF
                                </div>
                                <div className="text-2xl font-bold text-text-main">$120</div>
                                <div className="text-sm text-text-muted">Yearly</div>
                            </button>
                        </div>

                        <NeuButton
                            onClick={() => setStep(2)}
                            variant="primary"
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 border-0"
                        >
                            Continue
                        </NeuButton>
                    </NeuCard>
                )}

                {/* Step 2: Select Crypto & Show Address */}
                {step === 2 && wallets && (
                    <NeuCard padding="p-6" className="space-y-6">
                        <h2 className="font-bold text-text-main text-lg">2. Make Payment</h2>

                        {/* Crypto Selection */}
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">Select Cryptocurrency</label>
                            <div className="grid grid-cols-3 gap-2">
                                {cryptoOptions.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCrypto(c.id)}
                                        className={`p-3 rounded-lg text-center transition-all ${selectedCrypto === c.id
                                                ? 'bg-cyan-500/20 border-2 border-cyan-500'
                                                : 'bg-text-muted/5 border-2 border-transparent hover:bg-text-muted/10'
                                            }`}
                                    >
                                        <div className="text-xl">{c.icon}</div>
                                        <div className="text-xs text-text-muted">{c.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
                            <div className="text-sm text-cyan-400">Payment Amount</div>
                            <div className="text-3xl font-bold text-text-main">
                                ${prices?.[selectedPlan]?.amount || 0}
                            </div>
                            <div className="text-xs text-text-muted">
                                {selectedPlan === 'monthly' ? '1 Month' : '1 Year'} PRO Membership
                            </div>
                        </div>

                        {/* Wallet Address */}
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">
                                {cryptoOptions.find(c => c.id === selectedCrypto)?.name} Address ({cryptoOptions.find(c => c.id === selectedCrypto)?.network})
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={wallets?.[selectedCrypto] || ''}
                                    className="flex-1 p-3 rounded-lg bg-text-muted/5 border border-text-muted/20 text-text-main text-sm font-mono"
                                />
                                <button
                                    onClick={() => copyAddress(wallets?.[selectedCrypto])}
                                    className={`px-4 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-text-muted/10 text-text-main hover:bg-text-muted/20'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
                            ⚠️ Please send <strong>exactly ${prices?.[selectedPlan]?.amount}</strong>.
                            Your account will be upgraded to PRO automatically after confirmation.
                        </div>

                        <div className="flex gap-3">
                            <NeuButton onClick={() => setStep(1)} variant="secondary" className="flex-1 py-3">
                                Back
                            </NeuButton>
                            <NeuButton
                                onClick={handlePaymentSubmit}
                                variant="primary"
                                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 border-0"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'I Have Paid'}
                            </NeuButton>
                        </div>
                    </NeuCard>
                )}

                {/* Step 3: Waiting for Confirmation */}
                {step === 3 && payment && (
                    <NeuCard padding="p-8" className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Clock size={40} className="text-yellow-400 animate-pulse" />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-text-main mb-2">Payment Pending</h2>
                            <p className="text-text-muted text-sm">
                                Your payment has been received and is being verified.
                                Your account will be upgraded to PRO automatically once confirmed.
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-text-muted/5 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-muted">Payment ID</span>
                                <span className="text-text-main font-mono">{payment.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Amount</span>
                                <span className="text-text-main">${payment.amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Plan</span>
                                <span className="text-text-main">{payment.planType === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Status</span>
                                <span className="text-yellow-400 font-medium">Pending</span>
                            </div>
                        </div>

                        <p className="text-xs text-text-muted/60">
                            Usually confirmed within 1-24 hours. Contact us on Telegram for questions.
                        </p>

                        <NeuButton onClick={() => navigate('/dashboard')} variant="secondary" className="w-full py-3">
                            Back to Dashboard
                        </NeuButton>
                    </NeuCard>
                )}

            </div>
        </div>
    );
}
