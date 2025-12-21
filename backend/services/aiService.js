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
Model: DeepSeek R1 (Reasoner)
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
Model: DeepSeek R1 (Reasoner)

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
        if (DEEPSEEK_API_KEY) {
            try {
                // User explicitly requested DeepSeek V3
                const url = 'https://api.deepseek.com/chat/completions';

                const response = await axios.post(url, {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'You are a professional sports betting analyst. Return valid JSON only when requested.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 2048,
                    stream: false
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                    }
                });

                const text = response.data?.choices?.[0]?.message?.content;
                if (!text) throw new Error("Empty response from DeepSeek");
                return text;

            } catch (e) {
                console.error(`DeepSeek API Error:`, e.response?.data || e.message);
            }
        } else {
            console.error("DEEPSEEK_API_KEY is missing! Please add it to .env file.");
        }

        // Fallback or Error
        return "AI Service Unavailable (Check DEEPSEEK_API_KEY)";
    }
};

module.exports = aiService;
