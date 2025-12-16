import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Landing({ onLoginClick }) {
    return (
        <div className="min-h-screen bg-base text-text-main font-body flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-base shadow-neu-extruded opacity-50 blur-3xl animate-float pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-base shadow-neu-inset opacity-50 blur-3xl pointer-events-none" />

            {/* Main Content */}
            <div className="z-10 w-full max-w-4xl text-center space-y-12">

                {/* Header */}
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-block p-4 rounded-full bg-base shadow-neu-extruded mb-4 animate-float">
                        <span className="text-4xl">⚽</span>
                    </div>
                    <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-text-main">
                        GoalGPT <span className="text-accent">Pro</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-text-muted font-medium max-w-2xl mx-auto">
                        Next-gen AI football analysis. <br />
                        Unfair advantage molded in <span className="text-accent font-bold">silicon</span>.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <NeuCard className="group">
                        <div className="h-12 w-12 rounded-2xl bg-base shadow-neu-inset-deep flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform text-accent">
                            📡
                        </div>
                        <h3 className="text-xl font-bold mb-2">Live Sniper</h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                            Real-time signals detected by our bot in 85+ leagues. Catch the momentum shift instantly.
                        </p>
                    </NeuCard>

                    <NeuCard className="group">
                        <div className="h-12 w-12 rounded-2xl bg-base shadow-neu-inset-deep flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform text-accent">
                            🤖
                        </div>
                        <h3 className="text-xl font-bold mb-2">AI Analysis</h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                            Deep learning models analyze form, H2H, and probability to predict outcomes.
                        </p>
                    </NeuCard>

                    <NeuCard className="group">
                        <div className="h-12 w-12 rounded-2xl bg-base shadow-neu-inset-deep flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform text-accent">
                            💎
                        </div>
                        <h3 className="text-xl font-bold mb-2">Premium Value</h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                            Bankroll management, exclusive high-confidence picks, and daily strategies.
                        </p>
                    </NeuCard>
                </div>

                {/* CTA */}
                <div className="pt-8">
                    <NeuButton onClick={onLoginClick} variant="primary" className="px-12 py-5 text-lg rounded-3xl w-full md:w-auto mx-auto transform hover:scale-105">
                        Get Started Now
                    </NeuButton>
                    <p className="mt-4 text-sm text-text-muted">No credit card required for free tier.</p>
                </div>
            </div>
        </div>
    );
}
