import { useState, useRef, useEffect } from 'react';
import { sentioService } from '../services/api';

export default function SentioChat() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Merhaba! Ben SENTIO, yapay zeka destekli bahis danışmanınız. 🎯\n\nBugünün maçları hakkında sorularını yanıtlayabilirim:\n\n• "Günün en güvenli maçları neler?"\n• "Hangi maçlarda gol beklentisi yüksek?"\n• "Over 2.5 için öneriler var mı?"'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const res = await sentioService.chat(userMessage);
            if (res.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + (res.error || 'Bir hata oluştu.') }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Bağlantı hatası: ' + e.message }]);
        }

        setLoading(false);
    };

    const quickQuestions = [
        "Günün banko maçları",
        "Over 2.5 önerileri",
        "En güvenli bahisler"
    ];

    return (
        <div className="relative rounded-2xl overflow-hidden h-[550px] flex flex-col shadow-2xl">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-cyan-900/50 to-slate-900 z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent z-0" />

            {/* Header */}
            <div className="relative z-10 px-5 py-4 border-b border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="text-2xl">🤖</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            SENTIO AI
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-normal">
                                Online
                            </span>
                        </h3>
                        <p className="text-xs text-white/50">Llama 4 Scout • Bahis Analisti</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                            }`}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>

                        {/* Message Bubble */}
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-sm'
                                    : 'bg-white/10 backdrop-blur-md text-white/90 border border-white/10 rounded-tl-sm'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm bg-gradient-to-br from-cyan-500 to-blue-600">
                            🤖
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
                <div className="relative z-10 px-4 pb-2 flex gap-2 flex-wrap">
                    {quickQuestions.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setInput(q);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="relative z-10 p-4 border-t border-white/10 backdrop-blur-sm">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Maçlar hakkında bir soru sor..."
                            className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            disabled={loading}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
                    >
                        {loading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
