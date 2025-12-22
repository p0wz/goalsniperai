import { useNavigate } from 'react-router-dom';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Profile({ user, onLogout }) {
    const navigate = useNavigate();
    const isPro = user?.role === 'pro' || user?.role === 'admin' || user?.plan === 'pro';

    return (
        <div className="min-h-screen bg-base p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Profilim</h1>
                    <NeuButton onClick={onLogout} variant="secondary" className="px-4 py-2 text-sm">
                        Çıkış Yap
                    </NeuButton>
                </div>

                {/* User Card */}
                <NeuCard padding="p-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg">
                                {isPro ? '👑' : '👤'}
                            </div>
                            {isPro && (
                                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    PRO
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-xl font-bold text-white mb-1">{user?.name || 'Kullanıcı'}</h2>
                            <p className="text-white/50 text-sm mb-3">{user?.email}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-cyan-400' : 'bg-gray-400'}`}></div>
                                <span className="text-white/70">{isPro ? 'PRO Üye' : 'Ücretsiz Üye'}</span>
                            </div>
                        </div>
                    </div>
                </NeuCard>

                {/* Subscription Info */}
                {!isPro ? (
                    <NeuCard className="border border-cyan-500/20" padding="p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-white mb-1">PRO'ya Yükselt</h3>
                                <p className="text-white/50 text-sm">Sınırsız SENTIO AI Chat ve özel kupon önerileri</p>
                            </div>
                            <NeuButton
                                onClick={() => navigate('/pricing')}
                                variant="primary"
                                className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0 px-6"
                            >
                                Planları İncele
                            </NeuButton>
                        </div>
                    </NeuCard>
                ) : (
                    <NeuCard className="border border-green-500/20" padding="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                ✓
                            </div>
                            <div>
                                <h3 className="font-bold text-white">PRO Üyelik Aktif</h3>
                                <p className="text-white/50 text-sm">Tüm özelliklere erişebilirsiniz</p>
                            </div>
                        </div>
                    </NeuCard>
                )}

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-4">
                    <NeuCard
                        className="cursor-pointer hover:bg-white/5 transition-colors text-center"
                        padding="p-4"
                        onClick={() => navigate('/dashboard')}
                    >
                        <div className="text-2xl mb-2">🤖</div>
                        <div className="text-sm font-medium text-white">Dashboard</div>
                    </NeuCard>
                    <a
                        href="https://t.me/goalsniperai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <NeuCard className="cursor-pointer hover:bg-white/5 transition-colors text-center h-full" padding="p-4">
                            <div className="text-2xl mb-2">📢</div>
                            <div className="text-sm font-medium text-white">Telegram</div>
                        </NeuCard>
                    </a>
                </div>

                {/* Account Info */}
                <NeuCard padding="p-6">
                    <h3 className="font-bold text-white mb-4">Hesap Bilgileri</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/50">Kayıt Tarihi</span>
                            <span className="text-white/70">
                                {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/50">Plan</span>
                            <span className="text-white/70">{isPro ? 'PRO' : 'Ücretsiz'}</span>
                        </div>
                    </div>
                </NeuCard>

            </div>
        </div>
    );
}
