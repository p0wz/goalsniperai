import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../services/api';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';
import { CheckCircle2, Copy, Clock } from 'lucide-react';

export default function Checkout() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Plan seç, 2: Cüzdan, 3: Onay bekle
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
            alert('Ödeme talebi oluşturulamadı: ' + e.message);
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
                    <h1 className="text-2xl font-bold text-white mb-2">PRO Üyelik Satın Al</h1>
                    <p className="text-white/60 text-sm">Kripto ile güvenli ödeme</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center gap-2">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/40'
                                }`}
                        >
                            {step > s ? '✓' : s}
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Plan */}
                {step === 1 && (
                    <NeuCard padding="p-6" className="space-y-6">
                        <h2 className="font-bold text-white text-lg">1. Plan Seçin</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedPlan('monthly')}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedPlan === 'monthly'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl font-bold text-white">$15</div>
                                <div className="text-sm text-white/60">Aylık</div>
                            </button>
                            <button
                                onClick={() => setSelectedPlan('yearly')}
                                className={`p-4 rounded-xl border-2 transition-all relative ${selectedPlan === 'yearly'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 rounded-full text-xs text-white font-bold">
                                    33% OFF
                                </div>
                                <div className="text-2xl font-bold text-white">$120</div>
                                <div className="text-sm text-white/60">Yıllık</div>
                            </button>
                        </div>

                        <NeuButton
                            onClick={() => setStep(2)}
                            variant="primary"
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 border-0"
                        >
                            Devam Et
                        </NeuButton>
                    </NeuCard>
                )}

                {/* Step 2: Select Crypto & Show Address */}
                {step === 2 && wallets && (
                    <NeuCard padding="p-6" className="space-y-6">
                        <h2 className="font-bold text-white text-lg">2. Ödeme Yap</h2>

                        {/* Crypto Selection */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Kripto Seçin</label>
                            <div className="grid grid-cols-3 gap-2">
                                {cryptoOptions.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCrypto(c.id)}
                                        className={`p-3 rounded-lg text-center transition-all ${selectedCrypto === c.id
                                                ? 'bg-cyan-500/20 border-2 border-cyan-500'
                                                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-xl">{c.icon}</div>
                                        <div className="text-xs text-white/70">{c.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
                            <div className="text-sm text-cyan-400">Ödeme Tutarı</div>
                            <div className="text-3xl font-bold text-white">
                                ${prices?.[selectedPlan]?.amount || 0}
                            </div>
                            <div className="text-xs text-white/50">
                                {selectedPlan === 'monthly' ? '1 Aylık' : '1 Yıllık'} PRO Üyelik
                            </div>
                        </div>

                        {/* Wallet Address */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">
                                {cryptoOptions.find(c => c.id === selectedCrypto)?.name} Adresi ({cryptoOptions.find(c => c.id === selectedCrypto)?.network})
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={wallets?.[selectedCrypto] || ''}
                                    className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono"
                                />
                                <button
                                    onClick={() => copyAddress(wallets?.[selectedCrypto])}
                                    className={`px-4 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
                            ⚠️ Lütfen <strong>tam olarak ${prices?.[selectedPlan]?.amount}</strong> gönderin.
                            Ödeme onaylandıktan sonra hesabınız otomatik olarak PRO'ya yükseltilecek.
                        </div>

                        <div className="flex gap-3">
                            <NeuButton onClick={() => setStep(1)} variant="secondary" className="flex-1 py-3">
                                Geri
                            </NeuButton>
                            <NeuButton
                                onClick={handlePaymentSubmit}
                                variant="primary"
                                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 border-0"
                                disabled={loading}
                            >
                                {loading ? 'İşleniyor...' : 'Ödeme Yaptım'}
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
                            <h2 className="text-xl font-bold text-white mb-2">Ödeme Onay Bekliyor</h2>
                            <p className="text-white/60 text-sm">
                                Ödemeniz alındı ve kontrol ediliyor.
                                Onaylandığında hesabınız otomatik olarak PRO'ya yükseltilecek.
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-white/5 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">Ödeme ID</span>
                                <span className="text-white font-mono">{payment.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Tutar</span>
                                <span className="text-white">${payment.amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Plan</span>
                                <span className="text-white">{payment.planType === 'monthly' ? 'Aylık' : 'Yıllık'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Durum</span>
                                <span className="text-yellow-400 font-medium">Beklemede</span>
                            </div>
                        </div>

                        <p className="text-xs text-white/40">
                            Genellikle 1-24 saat içinde onaylanır. Sorularınız için Telegram'dan bize ulaşın.
                        </p>

                        <NeuButton onClick={() => navigate('/dashboard')} variant="secondary" className="w-full py-3">
                            Dashboard'a Dön
                        </NeuButton>
                    </NeuCard>
                )}

            </div>
        </div>
    );
}
