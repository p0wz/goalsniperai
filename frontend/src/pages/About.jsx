import { useNavigate } from 'react-router-dom';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-base py-16 px-6">
            <div className="max-w-3xl mx-auto space-y-12">

                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main">About Us</h1>
                    <p className="text-text-muted">Learn about SENTIO AI and GoalSniper</p>
                </div>

                <NeuCard padding="p-8" className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl">
                            🤖
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main">SENTIO AI</h2>
                            <p className="text-text-muted text-sm">AI Betting Advisor</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-text-muted leading-relaxed">
                        <p>
                            <strong className="text-text-main">GoalSniper</strong> is an AI-powered platform
                            designed to help you make more informed betting decisions.
                        </p>
                        <p>
                            <strong className="text-cyan-400">SENTIO</strong> is our AI assistant that analyzes
                            daily match statistics and provides detailed answers to user questions. It evaluates
                            form, H2H history, and home/away performance data.
                        </p>
                        <p>
                            Our goal is to help you make data-driven decisions instead of emotional ones.
                            SENTIO doesn't guarantee results - it helps you make smarter choices.
                        </p>
                    </div>
                </NeuCard>

                <div className="grid md:grid-cols-2 gap-6">
                    <NeuCard padding="p-6">
                        <h3 className="font-bold text-lg text-text-main mb-3">📊 Data-Driven</h3>
                        <p className="text-text-muted text-sm">
                            Our predictions are based on real match statistics.
                            No gut feelings - just solid data.
                        </p>
                    </NeuCard>
                    <NeuCard padding="p-6">
                        <h3 className="font-bold text-lg text-text-main mb-3">💬 Easy to Use</h3>
                        <p className="text-text-muted text-sm">
                            Chat with SENTIO in natural language.
                            No need to understand complex statistics.
                        </p>
                    </NeuCard>
                </div>

                <div className="text-center space-y-4">
                    <p className="text-text-muted/60 text-sm">
                        ⚠️ Betting involves financial risk. Only wager amounts you can afford to lose.
                    </p>
                    <NeuButton onClick={() => navigate('/')} variant="secondary">
                        Back to Home
                    </NeuButton>
                </div>

            </div>
        </div>
    );
}
