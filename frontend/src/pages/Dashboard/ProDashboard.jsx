import SentioChat from '../../components/SentioChat';

export default function ProDashboard({ user }) {
    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <header className="text-center mb-8">
                <h1 className="text-3xl font-black text-text-main mb-2 flex items-center justify-center gap-3">
                    🤖 SENTIO AI
                </h1>
                <p className="text-text-muted">
                    Hey {user?.name?.split(' ')[0] || 'champion'}! Chat with me for today's betting insights.
                </p>
            </header>

            {/* SENTIO Chat - Full Width */}
            <div className="max-w-3xl mx-auto">
                <SentioChat />
            </div>

            {/* Tips/Info Section */}
            <div className="max-w-3xl mx-auto mt-8 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <h3 className="font-medium text-cyan-400 mb-3 flex items-center gap-2">
                    💡 What can you ask SENTIO?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-muted">
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        <span>"Which are the safest matches today?"</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        <span>"Any Over 2.5 recommendations?"</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        <span>"Build me a low-risk coupon"</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        <span>"Suggest a bet with 3+ odds"</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
