import SentioChat from '../../components/SentioChat';
import { Sparkles, TrendingUp, Trophy, Flame, Crown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProDashboard({ user }) {
    const navigate = useNavigate();
    const isPro = user?.role === 'pro' || user?.role === 'admin' || user?.plan === 'pro';

    const quickStats = [
        { label: "Başarı", value: "78%", change: "+5%", icon: Trophy, color: "text-win" },
        { label: "Bu Hafta", value: "12", change: "+3", icon: TrendingUp, color: "text-primary" },
        { label: "Seri", value: "5", change: "🔥", icon: Flame, color: "text-accent" },
    ];

    return (
        <div className="min-h-screen bg-background bg-pattern pb-8">
            {/* Header */}
            <header className="relative px-5 pt-6 pb-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
                        <p className="text-muted-foreground text-sm font-medium">Hoş geldin,</p>
                        <h1 className="text-2xl font-bold text-foreground">
                            {user?.name?.split(' ')[0] || 'Şampiyon'} 👋
                        </h1>
                    </div>
                    {isPro ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl gradient-accent shadow-glow-accent animate-slide-up" style={{ animationDelay: '100ms' }}>
                            <Crown className="w-4 h-4 text-accent-foreground" />
                            <span className="text-sm font-bold text-accent-foreground">PRO</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl gradient-primary shadow-glow-primary animate-slide-up"
                            style={{ animationDelay: '100ms' }}
                        >
                            <Crown className="w-4 h-4 text-primary-foreground" />
                            <span className="text-sm font-bold text-primary-foreground">PRO'ya Geç</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Quick Stats */}
            <div className="px-5 mb-6">
                <div className="max-w-3xl mx-auto glass-card-premium rounded-3xl p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="flex items-center justify-between">
                        {quickStats.map((stat, idx) => {
                            const Icon = stat.icon;
                            return (
                                <div key={idx} className="text-center flex-1">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-secondary mb-2">
                                        <Icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                                        <span className="text-xs text-win font-medium">{stat.change}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* SENTIO Chat */}
            <div className="px-5 mb-6">
                <div className="max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <SentioChat />
                </div>
            </div>

            {/* Tips Section */}
            <div className="px-5">
                <div className="max-w-3xl mx-auto glass-card rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '250ms' }}>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        SENTIO'ya ne sorabilirsin?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>"Bugün en güvenli maçlar hangileri?"</span>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>"Ev sahibi avantajlı maçlar var mı?"</span>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>"Lig ortalaması yüksek maçlar?"</span>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>"Form durumu en iyi takımlar?"</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* VIP Banner (for non-pro users) */}
            {!isPro && (
                <div className="px-5 mt-6">
                    <div className="max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <button
                            onClick={() => navigate('/pricing')}
                            className="w-full rounded-3xl p-5 relative overflow-hidden gradient-premium shadow-glow-primary"
                        >
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJNMCAyMGgyME0yMCAwdjIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-30" />
                            <div className="relative flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Sparkles className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-white text-lg">PRO'ya Yükselt</p>
                                    <p className="text-sm text-white/80">AI destekli tahminler ve detaylı analizler</p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-white" />
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
