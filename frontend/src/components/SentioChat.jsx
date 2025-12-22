import { useState, useRef, useEffect } from 'react';
import { Heart, Trash2, X } from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function SentioChat() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hey there! I'm SENTIO, your AI betting advisor. 🎯\n\nAsk me anything about today's matches:\n\n• \"What are the safest matches today?\"\n• \"Any Over 2.5 recommendations?\"\n• \"Build me a low-risk coupon\""
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const messagesEndRef = useRef(null);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sentio_favorites');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load favorites:', e);
            }
        }
    }, []);

    // Save favorites to localStorage
    useEffect(() => {
        localStorage.setItem('sentio_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingText]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);
        setStreamingText('');

        try {
            // Get conversation history for context (last 5 exchanges)
            const history = messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            // Use streaming endpoint
            const response = await fetch(`${API_URL}/sentio/chat-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ message: userMessage, history })
            });

            if (!response.ok) {
                throw new Error('Failed to connect to SENTIO');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) {
                                fullText += data.chunk;
                                setStreamingText(fullText);
                            }
                            if (data.done) {
                                setMessages(prev => [...prev, { role: 'assistant', content: data.fullText || fullText }]);
                                setStreamingText('');
                            }
                            if (data.error) {
                                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + data.error }]);
                                setStreamingText('');
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // If stream ended without done signal
            if (fullText && !messages.find(m => m.content === fullText)) {
                setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
                setStreamingText('');
            }

        } catch (e) {
            console.error('SENTIO Error:', e);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Connection error: ' + e.message }]);
            setStreamingText('');
        }

        setLoading(false);
    };

    const addToFavorites = (content) => {
        const newFav = {
            id: Date.now(),
            content: content,
            timestamp: new Date().toISOString()
        };
        setFavorites(prev => [newFav, ...prev]);
    };

    const removeFromFavorites = (id) => {
        setFavorites(prev => prev.filter(f => f.id !== id));
    };

    const isFavorited = (content) => {
        return favorites.some(f => f.content === content);
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
                    <button
                        onClick={() => setShowFavorites(!showFavorites)}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${showFavorites ? 'bg-pink-500/20 text-pink-400' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                            }`}
                    >
                        <Heart size={14} fill={showFavorites ? 'currentColor' : 'none'} />
                        {favorites.length}
                    </button>
                </div>
            </div>

            {/* Favorites Panel */}
            {showFavorites && (
                <div className="relative z-20 bg-[#0d0d14] border-b border-gray-800/80 max-h-60 overflow-y-auto">
                    <div className="p-3 border-b border-gray-800/50 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-300">Saved Predictions ({favorites.length})</span>
                        <button onClick={() => setShowFavorites(false)} className="text-gray-500 hover:text-gray-300">
                            <X size={18} />
                        </button>
                    </div>
                    {favorites.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                            No saved predictions yet. Click the ❤️ on any prediction to save it.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800/50">
                            {favorites.map(fav => (
                                <div key={fav.id} className="p-3 hover:bg-gray-900/50">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{fav.content}</p>
                                        <button
                                            onClick={() => removeFromFavorites(fav.id)}
                                            className="text-gray-600 hover:text-red-400 shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{new Date(fav.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                            {/* Favorite button for assistant messages */}
                            {msg.role === 'assistant' && i > 0 && (
                                <button
                                    onClick={() => isFavorited(msg.content) ? null : addToFavorites(msg.content)}
                                    className={`mt-2 flex items-center gap-1 text-xs transition-all ${isFavorited(msg.content)
                                            ? 'text-pink-400'
                                            : 'text-gray-500 hover:text-pink-400'
                                        }`}
                                >
                                    <Heart size={12} fill={isFavorited(msg.content) ? 'currentColor' : 'none'} />
                                    {isFavorited(msg.content) ? 'Saved' : 'Save'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Streaming Message */}
                {streamingText && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm bg-gradient-to-br from-cyan-600 to-blue-700">
                            🤖
                        </div>
                        <div className="max-w-[80%] rounded-xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-gray-900/80 text-gray-200 border border-gray-800/80">
                            <div className="whitespace-pre-wrap">{streamingText}</div>
                            <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
                        </div>
                    </div>
                )}

                {/* Typing Indicator (when loading but no streaming text yet) */}
                {loading && !streamingText && (
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
