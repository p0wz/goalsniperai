import { useNavigate } from 'react-router-dom';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-base py-16 px-6">
            <div className="max-w-3xl mx-auto space-y-12">

                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Hakkımızda</h1>
                    <p className="text-white/60">SENTIO AI ve GoalSniper hakkında</p>
                </div>

                <NeuCard padding="p-8" className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl">
                            🤖
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">SENTIO AI</h2>
                            <p className="text-white/50 text-sm">Yapay Zeka Bahis Danışmanı</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-white/70 leading-relaxed">
                        <p>
                            <strong className="text-white">GoalSniper</strong>, futbol bahislerinde daha bilinçli kararlar
                            almanıza yardımcı olmak için geliştirilmiş bir yapay zeka platformudur.
                        </p>
                        <p>
                            <strong className="text-cyan-400">SENTIO</strong>, günlük maç istatistiklerini analiz eden ve
                            kullanıcıların sorularına detaylı yanıtlar veren AI asistanımızdır. Form durumu,
                            H2H geçmişi ve ev/deplasman performansları gibi verileri değerlendirir.
                        </p>
                        <p>
                            Amacımız, bahis yaparken duygusal kararlar yerine veri odaklı düşünmenizi sağlamaktır.
                            SENTIO size kesin sonuç garantisi vermez - ancak daha bilinçli seçimler yapmanıza
                            yardımcı olur.
                        </p>
                    </div>
                </NeuCard>

                <div className="grid md:grid-cols-2 gap-6">
                    <NeuCard padding="p-6">
                        <h3 className="font-bold text-lg text-white mb-3">📊 Veri Odaklı</h3>
                        <p className="text-white/60 text-sm">
                            Tahminlerimiz gerçek maç istatistiklerine dayanır.
                            İçgüdü değil, somut veriler konuşur.
                        </p>
                    </NeuCard>
                    <NeuCard padding="p-6">
                        <h3 className="font-bold text-lg text-white mb-3">💬 Kolay Kullanım</h3>
                        <p className="text-white/60 text-sm">
                            SENTIO ile doğal dilde sohbet edin.
                            Karmaşık istatistikleri anlamanıza gerek yok.
                        </p>
                    </NeuCard>
                </div>

                <div className="text-center space-y-4">
                    <p className="text-white/40 text-sm">
                        ⚠️ Bahis finansal risk içerir. Sadece kaybetmeyi göze alabileceğiniz miktarları kullanın.
                    </p>
                    <NeuButton onClick={() => navigate('/')} variant="secondary">
                        Ana Sayfaya Dön
                    </NeuButton>
                </div>

            </div>
        </div>
    );
}
