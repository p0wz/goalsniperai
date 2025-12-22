const axios = require('axios');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * AI Service for GoalSniper Pro
 * Handles strategy optimization, match validation, and banker selection.
 */
const aiService = {

    /**
     * Generate a Strategy Optimization Report based on bet history
     * @param {Array} history - Array of settled bets
     */
    async generateOptimizationReport(history) {
        if (!history || history.length < 10) {
            return "Yeterli veri yok (En az 10 sonuçlanmış bahis gerekir).";
        }

        // 1. Prepare Data Summary
        const summary = {
            total: history.length,
            won: history.filter(b => b.status === 'WON').length,
            lost: history.filter(b => b.status === 'LOST').length,
            byLeague: {},
            byMarket: {}
        };

        history.forEach(b => {
            // League Stats
            if (!summary.byLeague[b.league]) summary.byLeague[b.league] = { total: 0, won: 0 };
            summary.byLeague[b.league].total++;
            if (b.status === 'WON') summary.byLeague[b.league].won++;

            // Market Stats
            if (!summary.byMarket[b.market]) summary.byMarket[b.market] = { total: 0, won: 0 };
            summary.byMarket[b.market].total++;
            if (b.status === 'WON') summary.byMarket[b.market].won++;
        });

        const prompt = `Act as a senior betting capability analyst. I will provide you with the performance data of my betting algorithm.
Task: Analyze the results and suggest concrete "Optimization Rules" to improve Win Rate.
        
DATA SUMMARY:
Total Bets: ${summary.total} (Win Rate: ${((summary.won / summary.total) * 100).toFixed(1)}%)

LEAGUE PERFORMANCE (Worst Performing First):
${Object.entries(summary.byLeague)
                .sort((a, b) => (a[1].won / a[1].total) - (b[1].won / b[1].total))
                .slice(0, 5)
                .map(([l, s]) => `- ${l}: ${s.won}/${s.total} (${((s.won / s.total) * 100).toFixed(0)}%)`)
                .join('\n')}

MARKET PERFORMANCE:
${Object.entries(summary.byMarket)
                .map(([m, s]) => `- ${m}: ${s.won}/${s.total} (${((s.won / s.total) * 100).toFixed(0)}%)`)
                .join('\n')}

RECENT LOSSES (Analysis Context):
${history.filter(b => b.status === 'LOST').slice(0, 5).map(b => `- ${b.match} (${b.market})`).join('\n')}

OUTPUT FORMAT (Markdown):
## 🧠 Strategy Optimization Report
### 1. Critical Weaknesses
(Identify leagues or markets causing the most losses)

### 2. Suggested Filter Adjustments
(e.g., "Exclude X League", "Increase Min Odds for Y market")

### 3. Action Plan
(Bullet points of immediate actions)`;

        // ... (rest of report logic)
        return await this._callLLM(prompt, 'deep'); // Prefer 'deep' model for analysis
    },

    /**
     * Analyze a single match to find the safest "Banker" bet (Odds 1.15 - 1.50)
     * @param {Object} match - Match statistics
     */
    async analyzeMatchForBanker(match) {
        const prompt = `Act as a professional high-stakes betting consultant.
Model: Llama 4 Scout 17B
Match: ${match.event_home_team} vs ${match.event_away_team}
League: ${match.league_name}

STATISTICS:
- Home Win Rate: ${match.filterStats.homeHomeStats.winRate}% (Avg Scored: ${match.filterStats.homeHomeStats.avgScored})
- Away Loss Rate: ${match.filterStats.awayAwayStats.lossCount / 8 * 100}% (Avg Conceded: ${match.filterStats.awayAwayStats.avgConceded})
- Over 1.5 Rate: Home ${match.filterStats.homeForm.over15Rate}%, Away ${match.filterStats.awayForm.over15Rate}%
- BTTS Rate: Home ${match.filterStats.homeForm.bttsRate}%, Away ${match.filterStats.awayForm.bttsRate}%

ALLOWED MARKETS:
1. Over 2.5 Goals
2. Under 3.5 Goals
3. Match Winner (MS 1/2)
4. Match Winner & Over 1.5 Goals (MS & 1.5)
5. Both Teams to Score (BTTS / KG Var)
6. Home Over 1.5 Goals
7. Away Over 0.5 Goals

TASK:
1. Analyze ALL markets above for this match.
2. Select the SINGLE BEST "Banker" bet (Highest Confidence).
3. Constraint: Estimated Odds must be between 1.15 and 1.60. Confidence > 80%.
4. If Real Odds are missing, ESTIMATE them.

OUTPUT JSON ONLY (Single Object):
{
  "market": "Home Over 1.5 Goals", 
  "confidence": 88,
  "estimated_odds": 1.45,
  "reason": "Home team scored 2+ in last 5 home games."
}
If no market is safe enough, return null.`;

        try {
            const responseText = await this._callLLM(prompt, 'scout');
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            if (cleanText === 'null' || cleanText.includes('null')) return null;

            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);

            return null;
        } catch (e) {
            console.error("AI Analysis Failed:", e);
            return null;
        }
    },

    /**
     * Generate 3 Coupons (2 Banker, 1 High Odds) from a list of candidates
     * @param {Array} candidates - Array of approved single bets
     */
    async generateDailyCoupons(candidates) {
        if (!candidates || candidates.length < 3) return null;

        const candidatesList = candidates.map((c, i) =>
            `${i + 1}. ${c.match} (${c.league}) - Pick: ${c.ai.market} - Odds: ${c.ai.estimated_odds} - Conf: ${c.ai.confidence}%`
        ).join('\n');

        const prompt = `Act as a Master Betting Strategist.
Model: Llama 4 Scout 17B

SOURCE POOL (Best Matches of the Day):
${candidatesList}

TASK: convert this pool into 3 distinct coupons.

1. 🎟️ BANKER COUPON 1 (Safe)
   - Combine 2-3 very safest matches.
   - Total Odds ~2.00 - 3.00.

2. 🎟️ BANKER COUPON 2 (Safe)
   - Combine 2-3 DIFFERENT safe matches (try not to overlap with Coupon 1 if possible).
   - Total Odds ~2.00 - 3.00.

3. 🚀 HIGH ODDS SURPRISE (Value)
   - Combine 3-4 matches for higher return.
   - Total Odds ~5.00+.

OUTPUT JSON ONLY:
{
  "banker1": {
    "matches": [ { "id": 1, "match": "...", "pick": "...", "odds": 1.45 } ],
    "totalOdds": 2.10
  },
  "banker2": { ... },
  "highOdds": { ... }
}`;

        try {
            const responseText = await this._callLLM(prompt, 'scout');
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            return null;
        } catch (e) {
            console.error("Coupon Generation Failed:", e);
            return null;
        }
    },

    /**
     * Internal helper to call LLM
     */
    async _callLLM(prompt, mode = 'fast') {
        if (GROQ_API_KEY) {
            try {
                // User requested "Llama 4 Scout" (Mapping to Llama 3.3 70B on Groq)
                const url = 'https://api.groq.com/openai/v1/chat/completions';

                const response = await axios.post(url, {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are a professional sports betting analyst. Return valid JSON only when requested.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 4096,
                    stream: false
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GROQ_API_KEY}`
                    }
                });

                const text = response.data?.choices?.[0]?.message?.content;
                console.log("🦙 Groq Raw Response:", text ? text.substring(0, 500) + "..." : "EMPTY");

                if (!text) throw new Error("Empty response from Groq");
                return text;

            } catch (e) {
                console.error(`Groq API Error:`, e.response?.data || e.message);
                throw e;
            }
        } else {
            console.error("GROQ_API_KEY is missing! Please add it to .env file.");
            throw new Error("GROQ_API_KEY Missing");
        }
    },

    /**
     * Streaming LLM call for SENTIO Chat
     * @param {string} prompt - The prompt to send
     * @param {function} onChunk - Callback for each chunk (chunk: string)
     * @param {function} onDone - Callback when complete
     */
    async _streamLLM(prompt, onChunk, onDone) {
        if (!GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY Missing");
        }

        const https = require('https');
        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const postData = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are SENTIO, a professional sports betting analyst. Be helpful, concise, and use emojis.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2048,
            stream: true
        });

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let fullText = '';
                let buffer = '';

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                onDone(fullText);
                                resolve(fullText);
                                return;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    fullText += content;
                                    onChunk(content);
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                            }
                        }
                    }
                });

                res.on('end', () => {
                    onDone(fullText);
                    resolve(fullText);
                });

                res.on('error', (e) => {
                    reject(e);
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.write(postData);
            req.end();
        });
    },

    // ============================================
    // 💬 SENTIO Chat System
    // ============================================

    /**
     * Format matches for SENTIO memory (raw data, no market predictions)
     * @param {Array} matches - Array of match objects with stats
     */
    formatForSentioMemory(matches) {
        return matches.map(m => ({
            id: m.event_key || m.match_id,
            home: m.event_home_team,
            away: m.event_away_team,
            league: m.league_name,
            time: m.event_time,
            stats: {
                homeWinRate: m.filterStats?.homeHomeStats?.winRate || 0,
                homeAvgScored: m.filterStats?.homeHomeStats?.avgScored || 0,
                awayLossRate: m.filterStats?.awayAwayStats?.lossRate || 0,
                awayAvgConceded: m.filterStats?.awayAwayStats?.avgConceded || 0,
                over15Rate: m.filterStats?.homeForm?.over15Rate || 0,
                over25Rate: m.filterStats?.homeForm?.over25Rate || 0,
                bttsRate: m.filterStats?.homeForm?.bttsRate || 0
            },
            h2h: m.h2h || null
        }));
    },

    /**
     * SENTIO Chat - Answer user questions based on memory context
     * @param {string} userMessage - User's question
     * @param {Object} memory - SENTIO memory containing matches
     */
    async chatWithSentio(userMessage, memory) {
        if (!memory || !memory.matches || memory.matches.length === 0) {
            return "No matches have been analyzed yet. I'll be able to help once the admin approves today's matches.";
        }

        // Build context from all matches with their stats
        const matchContext = memory.matches.map((m, i) => {
            // Use the pre-generated aiPrompt if available
            if (m.aiPrompt) {
                return `--- MATCH ${i + 1} ---\n${m.aiPrompt}`;
            }
            // Fallback to basic info
            return `${i + 1}. ${m.homeTeam || m.home} vs ${m.awayTeam || m.away} (${m.league})`;
        }).join('\n\n');

        const prompt = `You are SENTIO - a professional football analyst and betting advisor.
Personality: Friendly, trustworthy, and analytical. Respond in English.

📅 TODAY'S MATCHES AND STATISTICS (${memory.date || new Date().toLocaleDateString('en-US')}):
${matchContext}

💬 USER QUESTION: "${userMessage}"

🎯 YOUR TASK:
1. Answer the user's question based on the match data above.
2. Give concrete match recommendations - mention team names.
3. Briefly explain why you recommend these matches (reference the statistics).
4. If asked about "banker" or "safe" picks, analyze the stats and present the 2-3 strongest options.
5. If asked for a coupon, list the matches and predictions clearly.

⚠️ RULES:
- Never guarantee results, only provide analysis.
- Keep your response concise and clear (max 300 words).
- Use emojis to improve readability.

RESPONSE:`;

        try {
            const response = await this._callLLM(prompt, 'sentio');
            return response;
        } catch (e) {
            console.error("SENTIO Chat Error:", e);
            return "Sorry, I'm experiencing a technical issue right now. Please try again in a few minutes. 🔧";
        }
    },

    /**
     * SENTIO Chat with Streaming - Supports conversation history
     * @param {string} userMessage - User's question
     * @param {Object} memory - SENTIO memory containing matches
     * @param {Array} history - Conversation history [{role, content}]
     * @param {function} onChunk - Callback for each chunk
     * @param {function} onDone - Callback when complete
     */
    async streamChatWithSentio(userMessage, memory, history = [], onChunk, onDone) {
        if (!memory || !memory.matches || memory.matches.length === 0) {
            const noDataMsg = "No matches have been analyzed yet. I'll be able to help once the admin approves today's matches.";
            onChunk(noDataMsg);
            onDone(noDataMsg);
            return;
        }

        // Build context from matches
        const matchContext = memory.matches.map((m, i) => {
            if (m.aiPrompt) {
                return `--- MATCH ${i + 1} ---\n${m.aiPrompt}`;
            }
            return `${i + 1}. ${m.homeTeam || m.home} vs ${m.awayTeam || m.away} (${m.league})`;
        }).join('\n\n');

        // Build conversation history context (last 5 exchanges)
        const historyContext = history.slice(-10).map(h =>
            h.role === 'user' ? `User: ${h.content}` : `SENTIO: ${h.content}`
        ).join('\n');

        const prompt = `You are SENTIO - a professional football analyst and betting advisor.
Personality: Friendly, trustworthy, and analytical. Respond in English.

📅 TODAY'S MATCHES AND STATISTICS (${memory.date || new Date().toLocaleDateString('en-US')}):
${matchContext}

${historyContext ? `📜 CONVERSATION HISTORY:\n${historyContext}\n` : ''}
💬 CURRENT USER QUESTION: "${userMessage}"

🎯 YOUR TASK:
1. Answer based on the match data and conversation context above.
2. Give concrete match recommendations with team names.
3. Briefly reference statistics when relevant.
4. For "banker"/"safe" picks, present 2-3 strongest options.
5. For coupon requests, list matches and predictions clearly.

⚠️ RULES:
- Never guarantee results, only provide analysis.
- Keep response concise (max 300 words).
- Use emojis for readability.
- Remember the conversation context for follow-up questions.

RESPONSE:`;

        try {
            await this._streamLLM(prompt, onChunk, onDone);
        } catch (e) {
            console.error("SENTIO Stream Error:", e);
            const errorMsg = "Sorry, I'm experiencing a technical issue. Please try again. 🔧";
            onChunk(errorMsg);
            onDone(errorMsg);
        }
    }
};

module.exports = aiService;

