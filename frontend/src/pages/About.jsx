import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function About({ onBack }) {
    return (
        <div className="min-h-screen bg-base py-20 px-6 font-body text-text-main">
            <div className="max-w-4xl mx-auto space-y-12">

                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold">About SENTIO</h1>
                    <p className="text-xl text-text-muted">Democratizing sports intelligence through AI.</p>
                </div>

                <NeuCard className="space-y-6 text-lg leading-relaxed text-text-muted">
                    <p>
                        <strong className="text-text-main">SENTIO Pro</strong> was born from a simple frustration: Bookmakers have all the data, and bettors have... gut feelings.
                    </p>
                    <p>
                        We set out to level the playing field. By ingesting real-time data from thousands of matches and training deep learning models on historical outcomes, we created a system that identifies
                        <span className="text-accent font-bold"> probability mismatches</span> in real-time.
                    </p>
                    <p>
                        Our mission is not to encourage gambling, but to provide <strong>investment-grade intelligence</strong> for those who treat sports markets as an asset class.
                    </p>
                </NeuCard>

                <div className="grid md:grid-cols-2 gap-8">
                    <NeuCard>
                        <h3 className="font-bold text-xl mb-2 text-text-main">Transparency First</h3>
                        <p className="text-text-muted text-sm">
                            We track every single signal sent. Our win rates are public, verifiable, and brutally honest. We don't hide losses; we learn from them.
                        </p>
                    </NeuCard>
                    <NeuCard>
                        <h3 className="font-bold text-xl mb-2 text-text-main">Machine &gt; Man</h3>
                        <p className="text-text-muted text-sm">
                            Humans get emotional. Humans chase losses. Our AI executes cold, calculated logic based purely on math and expected value (EV).
                        </p>
                    </NeuCard>
                </div>

                <div className="text-center pt-8">
                    <NeuButton onClick={onBack} variant="secondary">Back to Home</NeuButton>
                </div>

            </div>
        </div>
    );
}
