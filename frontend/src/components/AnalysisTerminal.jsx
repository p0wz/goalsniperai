import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

export default function AnalysisTerminal({ onComplete }) {
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentMatch, setCurrentMatch] = useState('');
    const terminalRef = useRef(null);

    const startAnalysis = async (limit = 50) => {
        setLogs([]);
        setProgress(0);
        setIsRunning(true);

        try {
            const eventSource = new EventSource(`${API_URL}/api/daily-analysis/stream?limit=${limit}`, {
                withCredentials: true
            });

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'progress') {
                    setProgress(data.percent);
                    setCurrentMatch(data.match || '');
                } else if (data.type === 'done') {
                    setIsRunning(false);
                    eventSource.close();
                    if (onComplete) onComplete(data.results);
                } else {
                    setLogs(prev => [...prev, data]);
                }
            };

            eventSource.onerror = () => {
                setIsRunning(false);
                eventSource.close();
                setLogs(prev => [...prev, { type: 'error', message: 'Bağlantı kesildi', time: new Date().toISOString() }]);
            };
        } catch (error) {
            setIsRunning(false);
            setLogs(prev => [...prev, { type: 'error', message: error.message, time: new Date().toISOString() }]);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogColor = (type) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'success': return 'text-green-400';
            case 'info': return 'text-cyan-400';
            default: return 'text-gray-300';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/95 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        >
            {/* Terminal Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-3 text-xs text-gray-400 font-mono">daily_analyst.exe</span>
                </div>
                <div className="text-xs text-gray-500">
                    {isRunning ? `%${progress} tamamlandı` : 'Hazır'}
                </div>
            </div>

            {/* Progress Bar */}
            <AnimatePresence>
                {isRunning && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 4 }}
                        exit={{ height: 0 }}
                        className="bg-gray-900 overflow-hidden"
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Terminal Body */}
            <div
                ref={terminalRef}
                className="h-[300px] overflow-y-auto p-4 font-mono text-sm scrollbar-hide"
            >
                {logs.length === 0 && !isRunning && (
                    <div className="text-gray-500 text-center py-8">
                        <div className="text-4xl mb-4">🤖</div>
                        <p>Analiz başlatmak için butona tıklayın</p>
                    </div>
                )}

                {logs.map((log, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2 mb-1"
                    >
                        <span className="text-gray-600 shrink-0">
                            [{new Date(log.time).toLocaleTimeString('tr-TR')}]
                        </span>
                        <span className={`${getLogColor(log.type)}`}>
                            {log.message}
                        </span>
                    </motion.div>
                ))}

                {/* Blinking Cursor */}
                {isRunning && (
                    <div className="flex items-center gap-1 mt-2">
                        <span className="text-cyan-400">▶</span>
                        <span className="text-gray-400">{currentMatch || 'İşleniyor...'}</span>
                        <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-2 h-4 bg-cyan-400 inline-block"
                        />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-900/50 p-4 border-t border-white/10 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                    {logs.filter(l => l.type === 'success').length} sinyal bulundu
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => startAnalysis(1)}
                        disabled={isRunning}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isRunning
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                            }`}
                    >
                        🧪 Test (1 Maç)
                    </button>
                    <button
                        onClick={() => startAnalysis(50)}
                        disabled={isRunning}
                        className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${isRunning
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                            }`}
                    >
                        {isRunning ? (
                            <span className="flex items-center gap-2">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >⚙️</motion.span>
                                Analiz Ediliyor...
                            </span>
                        ) : (
                            '🚀 Tam Analiz (50)'
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
