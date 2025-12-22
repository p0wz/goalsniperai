import { Link } from 'react-router-dom';
import NeuCard from '../../components/ui/NeuCard';
import NeuButton from '../../components/ui/NeuButton';
import { Sparkles, MessageCircle, Trophy, Zap, Lock, ExternalLink } from 'lucide-react';

export default function FreeDashboard({ user }) {
    const TELEGRAM_LINK = "https://t.me/goalsniperai"; // Telegram kanalı linki

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 animate-in fade-in duration-500">

            {/* Welcome Header */}
            <header className="text-center">
                <h1 className="text-3xl font-black text-text-main mb-2">
                    Merhaba, {user?.name?.split(' ')[0] || 'Kullanıcı'}! 👋
                </h1>
                <p className="text-text-muted">
                    Ücretsiz hesabınızla sınırlı özelliklere erişebilirsiniz.
                </p>
            </header>

            {/* PRO Upgrade Card */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <NeuCard className="relative overflow-hidden border-2 border-cyan-500/30" padding="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-lg">
                            🤖
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                                <Sparkles className="text-yellow-400" size={24} />
                                SENTIO AI ile Tanışın
                            </h2>
                            <p className="text-white/70 mb-4">
                                Yapay zeka destekli bahis danışmanınız. PRO üyelikle sınırsız sohbet,
                                günlük tahminler ve özel kupon önerileri alın.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                <div className="flex items-center gap-1 text-sm text-cyan-300">
                                    <MessageCircle size={16} /> Sınırsız Sohbet
                                </div>
                                <div className="flex items-center gap-1 text-sm text-cyan-300">
                                    <Trophy size={16} /> Günlük Tahminler
                                </div>
                                <div className="flex items-center gap-1 text-sm text-cyan-300">
                                    <Zap size={16} /> Anlık Analiz
                                </div>
                            </div>
                        </div>
                        <Link to="/pricing">
                            <NeuButton className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                PRO'ya Yükselt 🚀
                            </NeuButton>
                        </Link>
                    </div>
                </NeuCard>
            </div>

            {/* Locked Feature Preview */}
            <div className="relative">
                <NeuCard className="opacity-60 pointer-events-none" padding="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/50 to-blue-600/50 flex items-center justify-center text-2xl">
                            🤖
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">SENTIO AI Chat</h3>
                            <p className="text-sm text-text-muted">Yapay zeka bahis danışmanı</p>
                        </div>
                    </div>
                    <div className="h-40 bg-base/50 rounded-xl flex items-center justify-center">
                        <div className="text-center text-text-muted">
                            <div className="text-4xl mb-2">💬</div>
                            <p>Chat önizlemesi...</p>
                        </div>
                    </div>
                </NeuCard>
                <div className="absolute inset-0 bg-base/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                    <Lock size={48} className="text-text-muted mb-4" />
                    <p className="font-bold text-lg">PRO Üyelik Gerekli</p>
                    <p className="text-sm text-text-muted mb-4">Bu özelliği kullanmak için üyeliğinizi yükseltin</p>
                    <Link to="/pricing">
                        <NeuButton variant="primary" className="px-6 py-2">
                            Planları İncele
                        </NeuButton>
                    </Link>
                </div>
            </div>

            {/* Telegram Section */}
            <NeuCard className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20" padding="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg">
                        📢
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold text-white mb-2">
                            Ücretsiz Telegram Kanalımız
                        </h3>
                        <p className="text-white/70">
                            Günlük ücretsiz tahminler, bahis ipuçları ve özel fırsatlar için
                            Telegram kanalımıza katılın!
                        </p>
                    </div>
                    <a
                        href={TELEGRAM_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <ExternalLink size={18} />
                        Kanala Katıl
                    </a>
                </div>
            </NeuCard>

            {/* Features Comparison */}
            <NeuCard padding="p-6">
                <h3 className="text-lg font-bold mb-4 text-center">Özellik Karşılaştırması</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-text-muted/20">
                                <th className="text-left py-3 px-4">Özellik</th>
                                <th className="text-center py-3 px-4">Ücretsiz</th>
                                <th className="text-center py-3 px-4 text-cyan-400">PRO</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-text-muted/10">
                                <td className="py-3 px-4">Telegram Kanalı</td>
                                <td className="text-center py-3 px-4 text-green-500">✓</td>
                                <td className="text-center py-3 px-4 text-green-500">✓</td>
                            </tr>
                            <tr className="border-b border-text-muted/10">
                                <td className="py-3 px-4">SENTIO AI Chat</td>
                                <td className="text-center py-3 px-4 text-red-500">✗</td>
                                <td className="text-center py-3 px-4 text-green-500">✓ Sınırsız</td>
                            </tr>
                            <tr className="border-b border-text-muted/10">
                                <td className="py-3 px-4">AI Kupon Önerileri</td>
                                <td className="text-center py-3 px-4 text-red-500">✗</td>
                                <td className="text-center py-3 px-4 text-green-500">✓</td>
                            </tr>
                            <tr className="border-b border-text-muted/10">
                                <td className="py-3 px-4">Detaylı İstatistikler</td>
                                <td className="text-center py-3 px-4 text-red-500">✗</td>
                                <td className="text-center py-3 px-4 text-green-500">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4">Öncelikli Destek</td>
                                <td className="text-center py-3 px-4 text-red-500">✗</td>
                                <td className="text-center py-3 px-4 text-green-500">✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </NeuCard>

        </div>
    );
}
