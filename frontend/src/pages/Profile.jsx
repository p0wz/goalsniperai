import { useNavigate } from 'react-router-dom';
import { Crown, Settings, LogOut, ChevronRight, User, Mail, Calendar, Shield, Zap } from 'lucide-react';

export default function Profile({ user, onLogout }) {
    const navigate = useNavigate();
    const isPro = user?.role === 'pro' || user?.role === 'admin' || user?.plan === 'pro';

    const quickLinks = [
        { icon: Zap, label: 'Dashboard', onClick: () => navigate('/dashboard') },
        { icon: Settings, label: 'Ayarlar', onClick: () => { } },
    ];

    return (
        <div className="min-h-screen bg-background bg-pattern">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Profil</h1>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Çıkış</span>
                    </button>
                </div>

                {/* User Card */}
                <div className="glass-card-premium rounded-3xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                                <User className="w-10 h-10 text-primary-foreground" />
                            </div>
                            {isPro && (
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg gradient-accent flex items-center justify-center shadow-glow-accent">
                                    <Crown className="w-4 h-4 text-accent-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-foreground">{user?.name || 'Kullanıcı'}</h2>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary mt-2">
                                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                <span className="text-xs text-muted-foreground">
                                    {isPro ? 'PRO Üye' : 'Ücretsiz Üye'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upgrade Banner (for non-pro) */}
                {!isPro && (
                    <button
                        onClick={() => navigate('/pricing')}
                        className="w-full glass-card rounded-2xl p-5 mb-6 flex items-center gap-4 border-2 border-primary/30 hover:border-primary/50 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Crown className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-semibold text-foreground">PRO'ya Yükselt</h3>
                            <p className="text-sm text-muted-foreground">Sınırsız AI analiz ve özel tahminler</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                )}

                {/* Pro Active Badge */}
                {isPro && (
                    <div className="glass-card rounded-2xl p-5 mb-6 border-2 border-win/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-win/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-win" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">PRO Üyelik Aktif</h3>
                                <p className="text-sm text-muted-foreground">Tüm özelliklere erişiminiz var</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Links */}
                <div className="glass-card rounded-2xl overflow-hidden mb-6">
                    {quickLinks.map((link, idx) => {
                        const Icon = link.icon;
                        return (
                            <button
                                key={idx}
                                onClick={link.onClick}
                                className={`w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors ${idx < quickLinks.length - 1 ? 'border-b border-border' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <span className="flex-1 text-left font-medium text-foreground">{link.label}</span>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                        );
                    })}
                </div>

                {/* Telegram Link */}
                <a
                    href="https://t.me/goalsniperai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass-card rounded-2xl p-4 mb-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">
                            📢
                        </div>
                        <div className="flex-1">
                            <span className="font-medium text-foreground">Telegram Kanalı</span>
                            <p className="text-xs text-muted-foreground">Günlük tahminler ve duyurular</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                </a>

                {/* Account Info */}
                <div className="glass-card rounded-2xl p-5">
                    <h3 className="font-semibold text-foreground mb-4">Hesap Bilgileri</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                                <span className="text-xs text-muted-foreground">E-posta</span>
                                <p className="text-sm text-foreground">{user?.email || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Kayıt Tarihi</span>
                                <p className="text-sm text-foreground">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Crown className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Plan</span>
                                <p className="text-sm text-foreground">{isPro ? 'PRO' : 'Ücretsiz'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
