import { Link } from 'react-router-dom';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">⚽</span>
                            <span className="text-xl font-bold text-gradient">GoalSniper Pro</span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm max-w-md">
                            Yapay zeka destekli canlı maç analizi ve gol sinyalleri.
                            Gerçek zamanlı istatistikler ve akıllı algoritmalarla bahis stratejinizi güçlendirin.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                            <li><Link to="/" className="hover:text-white transition-colors">Ana Sayfa</Link></li>
                            <li><Link to="/pricing" className="hover:text-white transition-colors">Fiyatlandırma</Link></li>
                            <li><Link to="/login" className="hover:text-white transition-colors">Giriş Yap</Link></li>
                            <li><Link to="/register" className="hover:text-white transition-colors">Kayıt Ol</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold mb-4">Yasal</h4>
                        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                            <li><a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">KVKK</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-12 pt-8 border-t border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-[var(--text-muted)]">
                        © {currentYear} GoalSniper Pro. Tüm hakları saklıdır.
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                        ⚠️ Bahis kayıp riski taşır. 18 yaş üzeri. Sorumlu oynayın.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
