import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

function SettingsPanel() {
    const [settings, setSettings] = useState({
        rapidApiKey: '',
        groqApiKey: '',
        telegramBotToken: '',
        telegramChatId: '',
        allowedLeagues: []
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('api');

    // Predefined leagues
    const allLeagues = [
        { id: 'EPL', name: 'ENGLAND: Premier League', enabled: true },
        { id: 'LALIGA', name: 'SPAIN: LaLiga', enabled: true },
        { id: 'BUNDESLIGA', name: 'GERMANY: Bundesliga', enabled: true },
        { id: 'SERIEA', name: 'ITALY: Serie A', enabled: true },
        { id: 'LIGUE1', name: 'FRANCE: Ligue 1', enabled: true },
        { id: 'UCL', name: 'EUROPE: Champions League', enabled: true },
        { id: 'UEL', name: 'EUROPE: Europa League', enabled: true },
        { id: 'SUPERLIG', name: 'TURKEY: Super Lig', enabled: true },
        { id: 'EREDIVISIE', name: 'NETHERLANDS: Eredivisie', enabled: true },
        { id: 'LIGA_PORTUGAL', name: 'PORTUGAL: Liga Portugal', enabled: true },
        { id: 'MLS', name: 'USA: MLS', enabled: false },
        { id: 'LIGA_MX', name: 'MEXICO: Liga MX', enabled: false },
        { id: 'BRASILEIRAO', name: 'BRAZIL: Serie A', enabled: false },
        { id: 'J_LEAGUE', name: 'JAPAN: J1 League', enabled: false },
        { id: 'K_LEAGUE', name: 'SOUTH KOREA: K League', enabled: false },
    ];

    const [leagues, setLeagues] = useState(allLeagues);

    const toggleLeague = (id) => {
        setLeagues(prev => prev.map(l =>
            l.id === id ? { ...l, enabled: !l.enabled } : l
        ));
    };

    const saveSettings = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            // In a real app, this would call an API to save settings
            await new Promise(resolve => setTimeout(resolve, 1000));
            setMessage({ type: 'success', text: 'Ayarlar kaydedildi!' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Kaydetme hatası: ' + e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const subTabs = [
        { id: 'api', label: 'API Anahtarları', icon: '🔑' },
        { id: 'telegram', label: 'Telegram', icon: '📱' },
        { id: 'leagues', label: 'Ligler', icon: '🏆' },
    ];

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-4">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === tab.id
                                ? 'bg-gray-700 text-white border border-gray-600'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* API Keys Panel */}
            {activeSubTab === 'api' && (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">🔑 API Anahtarları</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">RapidAPI Key (Flashscore)</label>
                                <input
                                    type="password"
                                    value={settings.rapidApiKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, rapidApiKey: e.target.value }))}
                                    placeholder="••••••••••••••••"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gray-500 focus:outline-none"
                                />
                                <p className="text-gray-500 text-xs mt-1">Flashscore API için RapidAPI anahtarı</p>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Groq API Key (AI)</label>
                                <input
                                    type="password"
                                    value={settings.groqApiKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, groqApiKey: e.target.value }))}
                                    placeholder="••••••••••••••••"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gray-500 focus:outline-none"
                                />
                                <p className="text-gray-500 text-xs mt-1">Llama 4 Scout AI validasyonu için</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Telegram Panel */}
            {activeSubTab === 'telegram' && (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">📱 Telegram Bildirimleri</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Bot Token</label>
                                <input
                                    type="password"
                                    value={settings.telegramBotToken}
                                    onChange={(e) => setSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gray-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Chat ID</label>
                                <input
                                    type="text"
                                    value={settings.telegramChatId}
                                    onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                                    placeholder="-1001234567890"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gray-500 focus:outline-none"
                                />
                            </div>

                            <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all">
                                🔔 Test Bildirimi Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leagues Panel */}
            {activeSubTab === 'leagues' && (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">🏆 İzin Verilen Ligler</h3>
                        <p className="text-gray-400 text-sm mb-4">Analiz edilecek ligleri seçin</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {leagues.map(league => (
                                <label
                                    key={league.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${league.enabled
                                            ? 'bg-green-500/10 border border-green-500/30'
                                            : 'bg-gray-900 border border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={league.enabled}
                                        onChange={() => toggleLeague(league.id)}
                                        className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500"
                                    />
                                    <span className={league.enabled ? 'text-white' : 'text-gray-400'}>
                                        {league.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${isSaving
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600'
                        }`}
                >
                    {isSaving ? '⏳ Kaydediliyor...' : '💾 Ayarları Kaydet'}
                </button>

                {message && (
                    <span className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {message.text}
                    </span>
                )}
            </div>
        </div>
    );
}

export default SettingsPanel;
