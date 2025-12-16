import NeuCard from '../../components/ui/NeuCard';
import NeuButton from '../../components/ui/NeuButton';

export default function Profile({ user, onLogout }) {
    const isPro = user?.role === 'pro' || user?.role === 'admin';

    return (
        <div className="min-h-screen bg-base text-text-main font-body p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">My Profile</h1>
                        <p className="text-text-muted">Manage your account and subscription.</p>
                    </div>
                    <NeuButton onClick={onLogout} variant="danger" className="px-6 py-3">
                        Log Out
                    </NeuButton>
                </div>

                {/* Membership Status Card */}
                <NeuCard className="bg-base relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center gap-8 z-10 relative">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-base shadow-neu-inset-deep flex items-center justify-center text-4xl border-4 border-base">
                                {isPro ? '👑' : '👤'}
                            </div>
                            {isPro && <div className="absolute -bottom-2 -right-2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow-neu-extruded">PRO</div>}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-2xl font-bold mb-1">{user?.name || 'User'}</h3>
                            <p className="text-text-muted mb-4">{user?.email}</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-base shadow-neu-inset-sm">
                                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-accent' : 'bg-gray-400'}`}></div>
                                <span className="text-sm font-bold uppercase tracking-wider">{user?.role || 'Free'} Plan</span>
                            </div>
                        </div>

                        {!isPro && (
                            <div className="w-full md:w-auto">
                                <NeuButton variant="primary" className="w-full px-8 py-4 text-lg">
                                    Upgrade to PRO 🚀
                                </NeuButton>
                            </div>
                        )}
                    </div>
                </NeuCard>

                {/* Advanced Membership Plans (If Free) */}
                {!isPro && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-center">Upgrade Your Arsenal</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Pro Plan */}
                            <NeuCard className="group hover:-translate-y-2 transition-transform duration-500 relative overflow-hidden border-2 border-transparent hover:border-accent/10">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black pointer-events-none">PRO</div>
                                <h3 className="text-3xl font-extrabold text-accent mb-2">PRO</h3>
                                <div className="text-4xl font-bold mb-6">$29<span className="text-lg text-text-muted font-normal">/mo</span></div>

                                <ul className="space-y-4 mb-8 text-text-muted">
                                    <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Unlimited Live Signals</li>
                                    <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Daily AI Analysis</li>
                                    <li className="flex items-center gap-3"><span className="text-green-500">✓</span> 850+ Leagues</li>
                                </ul>

                                <NeuButton variant="primary" className="w-full py-4">Select Plan</NeuButton>
                            </NeuCard>

                            {/* Elite Plan */}
                            <NeuCard className="group hover:-translate-y-2 transition-transform duration-500 border-2 border-transparent hover:border-yellow-500/10">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black pointer-events-none">MAX</div>
                                <h3 className="text-3xl font-extrabold text-yellow-500 mb-2">ELITE</h3>
                                <div className="text-4xl font-bold mb-6">$99<span className="text-lg text-text-muted font-normal">/mo</span></div>

                                <ul className="space-y-4 mb-8 text-text-muted">
                                    <li className="flex items-center gap-3"><span className="text-yellow-500">★</span> Everything in PRO</li>
                                    <li className="flex items-center gap-3"><span className="text-yellow-500">★</span> 1-on-1 Consultation</li>
                                    <li className="flex items-center gap-3"><span className="text-yellow-500">★</span> Private API Access</li>
                                </ul>

                                <NeuButton variant="secondary" className="w-full py-4 text-yellow-600">Contact Sales</NeuButton>
                            </NeuCard>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
