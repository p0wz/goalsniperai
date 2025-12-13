import { useState } from 'react';
import { DashboardLayout } from '../components/layout';
import { Card, Button, Input, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const getPlanInfo = () => {
        switch (user?.plan) {
            case 'premium':
                return { name: 'Premium', color: 'var(--accent-purple)', features: ['Sınırsız Sinyal', 'API Erişimi', 'Öncelikli Destek'] };
            case 'pro':
                return { name: 'Pro', color: 'var(--accent-gold)', features: ['Günde 25 Sinyal', 'Kupon Oluşturucu', 'Geçmiş Analizi'] };
            default:
                return { name: 'Free', color: 'var(--text-muted)', features: ['Günde 3 Sinyal', 'Temel Özellikler'] };
        }
    };

    const planInfo = getPlanInfo();

    return (
        <DashboardLayout title="Profil">
            <div className="max-w-4xl">
                {/* Profile Header */}
                <Card className="!p-6 mb-6" hover={false}>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-blue)] flex items-center justify-center text-3xl font-bold text-white">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{user?.name}</h2>
                            <p className="text-[var(--text-secondary)]">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={user?.plan === 'premium' ? 'premium' : user?.plan === 'pro' ? 'warning' : 'default'}>
                                    {planInfo.name}
                                </Badge>
                                <span className="text-xs text-[var(--text-muted)]">
                                    Üyelik: {new Date(user?.created_at).toLocaleDateString('tr-TR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Profil Bilgileri
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Güvenlik
                    </button>
                    <button
                        onClick={() => setActiveTab('plan')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'plan' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Plan
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <Card hover={false}>
                        <h3 className="text-lg font-semibold mb-6">Profil Bilgileri</h3>
                        <form className="space-y-4">
                            <Input
                                label="Ad Soyad"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                            <Input
                                label="Email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled
                            />
                            <Button variant="primary">Kaydet</Button>
                        </form>
                    </Card>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <Card hover={false}>
                        <h3 className="text-lg font-semibold mb-6">Şifre Değiştir</h3>
                        <form className="space-y-4">
                            <Input
                                label="Mevcut Şifre"
                                name="currentPassword"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                            />
                            <Input
                                label="Yeni Şifre"
                                name="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={handleChange}
                            />
                            <Input
                                label="Yeni Şifre Tekrar"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <Button variant="primary">Şifreyi Güncelle</Button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                            <h4 className="font-semibold text-[var(--accent-red)] mb-2">Tehlikeli Bölge</h4>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Hesabınızı silmek geri alınamaz bir işlemdir.
                            </p>
                            <Button variant="danger">Hesabı Sil</Button>
                        </div>
                    </Card>
                )}

                {/* Plan Tab */}
                {activeTab === 'plan' && (
                    <Card hover={false}>
                        <h3 className="text-lg font-semibold mb-6">Mevcut Plan</h3>

                        <div className="p-6 rounded-xl border-2 mb-6" style={{ borderColor: planInfo.color, backgroundColor: `${planInfo.color}15` }}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xl font-bold" style={{ color: planInfo.color }}>{planInfo.name}</h4>
                                {user?.plan !== 'premium' && (
                                    <Badge variant="info">Aktif</Badge>
                                )}
                            </div>
                            <ul className="space-y-2">
                                {planInfo.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <span className="text-[var(--accent-green)]">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {user?.plan !== 'premium' && (
                            <Button variant="primary" className="w-full">
                                🚀 Pro'ya Yükselt
                            </Button>
                        )}
                    </Card>
                )}

                {/* Logout */}
                <div className="mt-6">
                    <Button variant="ghost" onClick={logout} className="text-[var(--accent-red)]">
                        🚪 Çıkış Yap
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Profile;
