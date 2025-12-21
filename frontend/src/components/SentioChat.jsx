import { useState, useRef, useEffect } from 'react';
import { sentioService } from '../services/api';

export default function SentioChat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Merhaba! Ben SENTIO. Bugünün maçları hakkında sorularını yanıtlayabilirim. 🎯\n\nÖrnek sorular:\n• Günün en güvenli maçları neler?\n• İtalya maçlarından hangisi kazandırır?\n• 2.5 üst için hangi maçlar uygun?' }
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

    return (
        <div className="bg-card border border-cyan-500/20 rounded-xl shadow-lg overflow-hidden flex flex-col h-[500px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    💬 SENTIO AI Chat
                </h3>
                <p className="text-xs opacity-80">Günün maçları hakkında soru sor</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-cyan-600 text-white rounded-br-none'
                                    : 'bg-card border border-border text-foreground rounded-bl-none'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-xl px-4 py-2 text-muted-foreground text-sm animate-pulse">
                            ⏳ Düşünüyorum...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-card flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Bir soru sor..."
                    className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    disabled={loading}
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                    {loading ? '⏳' : '📤'}
                </button>
            </div>
        </div>
    );
}
