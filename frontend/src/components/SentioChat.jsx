import { useState, useRef, useEffect } from 'react';
import { sentioService } from '../services/api';

export default function SentioChat() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hey there! I'm SENTIO, your AI betting advisor. 🎯\n\nAsk me anything about today's matches:\n\n• \"What are the safest matches today?\"\n• \"Any Over 2.5 recommendations?\"\n• \"Build me a low-risk coupon\""
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
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + (res.error || 'An error occurred.') }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Connection error: ' + e.message }]);
        }

        setLoading(false);
    };

    const quickQuestions = [
        "Safe banker picks",
        "Over 2.5 tips",
        "Build me a coupon"
    ];

    return (
        <div className="relative rounded-2xl overflow-hidden h-[600px] flex flex-col border border-gray-800/50">
            {/* Dark Background */}
            <div className="absolute inset-0 bg-[#0a0a0f] z-0" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-transparent to-purple-950/10 z-0" />

            {/* Subtle Grid Pattern */}
            <div
                className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Header */}
            <div className="relative z-10 px-5 py-4 border-b border-gray-800/80 bg-[#0d0d14]/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0d0d14]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                            SENTIO
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium tracking-wide">
                                ONLINE
                            </span>
                        </h3>
                        <p className="text-xs text-gray-500">AI Betting Advisor</p>
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                        Gemini Pro
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-violet-600 to-purple-700'
                                : 'bg-gradient-to-br from-cyan-600 to-blue-700'
                            }`}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>

                        {/* Message Bubble */}
                        <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-violet-600/90 to-purple-600/90 text-gray-100 rounded-tr-sm'
                                    : 'bg-gray-900/80 text-gray-200 border border-gray-800/80 rounded-tl-sm'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm bg-gradient-to-br from-cyan-600 to-blue-700">
                            🤖
                        </div>
                        <div className="bg-gray-900/80 border border-gray-800/80 rounded-xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                            onClick={() => setInput(q)}
                            className="px-3 py-1.5 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="relative z-10 p-4 border-t border-gray-800/80 bg-[#0d0d14]/80 backdrop-blur-sm">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about today's matches..."
                            className="w-full px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-sm"
                            disabled={loading}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="w-11 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-105 active:scale-95"
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
