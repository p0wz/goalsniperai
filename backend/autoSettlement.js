/**
 * Auto-Settlement System
 * Automatically settles bets 3 hours after match start
 */

const axios = require('axios');
require('dotenv').config();

const approvedBets = require('./approvedBets');
const trainingPool = require('./trainingPool');
const vectorDB = require('./vectorDB');

// Flashscore API Config
const FLASHSCORE_API = {
    baseURL: 'https://flashscore4.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
    }
};

// Settlement delay: 3 hours after match start
const SETTLEMENT_DELAY_HOURS = 3;

// Scheduler interval: every 15 minutes
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000;

let isRunning = false;

// ============================================
// 🎯 Prediction Evaluation Logic
// ============================================

function evaluatePrediction(market, prediction, homeGoals, awayGoals, halfTimeHome = null, halfTimeAway = null) {
    const totalGoals = homeGoals + awayGoals;
    const marketLower = (market || '').toLowerCase().trim();
    const predLower = (prediction || '').toLowerCase().trim();

    // ============================================
    // OVER/UNDER TOTAL GOALS
    // ============================================
    if (marketLower.includes('over 0.5') || predLower.includes('over 0.5')) {
        return totalGoals >= 1;
    }
    if (marketLower.includes('over 1.5') || predLower.includes('over 1.5')) {
        return totalGoals >= 2;
    }
    if (marketLower.includes('over 2.5') || predLower.includes('over 2.5')) {
        return totalGoals >= 3;
    }
    if (marketLower.includes('over 3.5') || predLower.includes('over 3.5')) {
        return totalGoals >= 4;
    }
    if (marketLower.includes('over 4.5') || predLower.includes('over 4.5')) {
        return totalGoals >= 5;
    }

    if (marketLower.includes('under 0.5') || predLower.includes('under 0.5')) {
        return totalGoals === 0;
    }
    if (marketLower.includes('under 1.5') || predLower.includes('under 1.5')) {
        return totalGoals <= 1;
    }
    if (marketLower.includes('under 2.5') || predLower.includes('under 2.5')) {
        return totalGoals <= 2;
    }
    if (marketLower.includes('under 3.5') || predLower.includes('under 3.5')) {
        return totalGoals <= 3;
    }
    if (marketLower.includes('under 4.5') || predLower.includes('under 4.5')) {
        return totalGoals <= 4;
    }

    // ============================================
    // BTTS (Both Teams To Score)
    // ============================================
    if (marketLower.includes('btts yes') || predLower.includes('btts yes') ||
        marketLower.includes('btts: yes') || predLower === 'gg' ||
        marketLower.includes('btts (both')) {
        return homeGoals >= 1 && awayGoals >= 1;
    }
    if (marketLower.includes('btts no') || predLower.includes('btts no') ||
        marketLower.includes('btts: no') || predLower === 'ng') {
        return homeGoals === 0 || awayGoals === 0;
    }

    // ============================================
    // 1X2 (Match Result)
    // ============================================
    if (marketLower.includes('home win') || predLower === '1' || predLower === 'home') {
        return homeGoals > awayGoals;
    }
    if (marketLower.includes('away win') || predLower === '2' || predLower === 'away') {
        return awayGoals > homeGoals;
    }
    if (marketLower.includes('draw') || predLower === 'x' || predLower === 'draw') {
        return homeGoals === awayGoals;
    }

    // ============================================
    // DOUBLE CHANCE
    // ============================================
    if (marketLower.includes('1x') || predLower.includes('1x') ||
        marketLower.includes('home or draw') || predLower.includes('home or draw') ||
        marketLower.includes('1x double')) {
        return homeGoals >= awayGoals; // Home win OR Draw
    }
    if (marketLower.includes('x2') || predLower.includes('x2') ||
        marketLower.includes('draw or away') || predLower.includes('draw or away')) {
        return awayGoals >= homeGoals; // Away win OR Draw
    }
    if (marketLower.includes('12') || predLower.includes('12') ||
        marketLower.includes('home or away') || predLower.includes('home or away')) {
        return homeGoals !== awayGoals; // No draw
    }

    // ============================================
    // HOME TEAM GOALS (Ev Sahibi Gol)
    // ============================================
    if (marketLower.includes('home team over 1.5') || marketLower.includes('ev 1.5') ||
        marketLower.includes('home over 1.5') || predLower.includes('home over 1.5')) {
        return homeGoals >= 2;
    }
    if (marketLower.includes('home team over 0.5') || marketLower.includes('ev 0.5') ||
        marketLower.includes('home over 0.5') || predLower.includes('home over 0.5')) {
        return homeGoals >= 1;
    }
    if (marketLower.includes('home team over 2.5') ||
        marketLower.includes('home over 2.5') || predLower.includes('home over 2.5')) {
        return homeGoals >= 3;
    }

    // ============================================
    // AWAY TEAM GOALS (Deplasman Gol)
    // ============================================
    if (marketLower.includes('dep 0.5') || marketLower.includes('away over 0.5') ||
        marketLower.includes('away team over 0.5') || predLower.includes('away over 0.5')) {
        return awayGoals >= 1;
    }
    if (marketLower.includes('dep 1.5') || marketLower.includes('away over 1.5') ||
        marketLower.includes('away team over 1.5') || predLower.includes('away over 1.5')) {
        return awayGoals >= 2;
    }

    // ============================================
    // FIRST HALF GOALS (İlk Yarı)
    // ============================================
    if (marketLower.includes('first half over 0.5') || marketLower.includes('1y 0.5') ||
        marketLower.includes('ht over 0.5') || predLower.includes('first half over')) {
        // If we have HT data, use it; otherwise assume FT has some goals
        if (halfTimeHome !== null && halfTimeAway !== null) {
            return (halfTimeHome + halfTimeAway) >= 1;
        }
        // Fallback: if match has goals, likely had HT goal too (conservative)
        return totalGoals >= 1;
    }
    if (marketLower.includes('first half over 1.5') || marketLower.includes('1y 1.5') ||
        marketLower.includes('ht over 1.5')) {
        if (halfTimeHome !== null && halfTimeAway !== null) {
            return (halfTimeHome + halfTimeAway) >= 2;
        }
        return totalGoals >= 2;
    }

    // ============================================
    // COMBO: MS1 & 1.5 Üst (Home Win + Over 1.5)
    // ============================================
    if (marketLower.includes('ms1 & 1.5') || marketLower.includes('ms1 and 1.5') ||
        marketLower.includes('home win and over 1.5') || predLower.includes('ms1 & 1.5')) {
        return homeGoals > awayGoals && totalGoals >= 2;
    }
    if (marketLower.includes('ms2 & 1.5') || marketLower.includes('ms2 and 1.5') ||
        marketLower.includes('away win and over 1.5') || predLower.includes('ms2 & 1.5')) {
        return awayGoals > homeGoals && totalGoals >= 2;
    }

    // ============================================
    // HANDICAP Markets (-1.5)
    // ============================================
    if (marketLower.includes('hnd. ms1 (-1.5)') || marketLower.includes('handicap home -1.5') ||
        marketLower.includes('home -1.5') || predLower.includes('home -1.5')) {
        // Home team wins by 2+ goals
        return (homeGoals - awayGoals) >= 2;
    }
    if (marketLower.includes('hnd. ms2 (-1.5)') || marketLower.includes('handicap away -1.5') ||
        marketLower.includes('away -1.5') || predLower.includes('away -1.5')) {
        // Away team wins by 2+ goals
        return (awayGoals - homeGoals) >= 2;
    }

    // Other handicap variations
    if (marketLower.includes('home -2.5') || predLower.includes('home -2.5')) {
        return (homeGoals - awayGoals) >= 3;
    }
    if (marketLower.includes('away -2.5') || predLower.includes('away -2.5')) {
        return (awayGoals - homeGoals) >= 3;
    }

    // ============================================
    // EXACT GOALS
    // ============================================
    if (marketLower.includes('exact 0') || predLower.includes('exact 0')) {
        return totalGoals === 0;
    }
    if (marketLower.includes('exact 1') || predLower.includes('exact 1')) {
        return totalGoals === 1;
    }
    if (marketLower.includes('exact 2') || predLower.includes('exact 2')) {
        return totalGoals === 2;
    }
    if (marketLower.includes('exact 3') || predLower.includes('exact 3')) {
        return totalGoals === 3;
    }

    // Unknown market - log and skip
    console.log(`[AutoSettlement] ⚠️ Unknown market: ${market} / ${prediction}`);
    return null;
}

// ============================================
// 📡 Fetch Match Result from Flashscore
// ============================================

async function fetchMatchResult(eventId) {
    if (!eventId) {
        return { success: false, error: 'No eventId' };
    }

    try {
        const url = `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/details/${eventId}`;
        const response = await axios.get(url, {
            headers: FLASHSCORE_API.headers,
            timeout: 10000
        });

        const data = response.data;

        // Parse score from response
        // Flashscore returns various formats, we need to handle them
        let homeGoals = null;
        let awayGoals = null;
        let matchStatus = null;

        // Try to extract score from data
        if (data.homeScore !== undefined && data.awayScore !== undefined) {
            homeGoals = parseInt(data.homeScore) || 0;
            awayGoals = parseInt(data.awayScore) || 0;
        } else if (data.score) {
            // Format: "2-1" or "2 - 1"
            const scoreParts = data.score.replace(/\s/g, '').split('-');
            if (scoreParts.length === 2) {
                homeGoals = parseInt(scoreParts[0]) || 0;
                awayGoals = parseInt(scoreParts[1]) || 0;
            }
        } else if (data.result) {
            const resultParts = String(data.result).replace(/\s/g, '').split('-');
            if (resultParts.length === 2) {
                homeGoals = parseInt(resultParts[0]) || 0;
                awayGoals = parseInt(resultParts[1]) || 0;
            }
        }

        // Check if match is finished
        matchStatus = data.status || data.matchStatus || data.eventStatus;
        const isFinished = matchStatus && (
            matchStatus.toLowerCase().includes('finished') ||
            matchStatus.toLowerCase().includes('ended') ||
            matchStatus.toLowerCase().includes('ft') ||
            matchStatus === 'FINISHED'
        );

        if (homeGoals !== null && awayGoals !== null) {
            return {
                success: true,
                homeGoals,
                awayGoals,
                finalScore: `${homeGoals}-${awayGoals}`,
                isFinished,
                matchStatus
            };
        }

        return { success: false, error: 'Could not parse score', data };

    } catch (e) {
        console.error(`[AutoSettlement] API Error for ${eventId}:`, e.message);
        return { success: false, error: e.message };
    }
}

// ============================================
// ⏱️ Check if Bet is Ready for Settlement
// ============================================

function isReadyForSettlement(bet) {
    // Try Unix timestamp first (if matchTime is a number or numeric string)
    if (bet.matchTime && !isNaN(parseFloat(bet.matchTime))) {
        const matchTimestamp = parseFloat(bet.matchTime) * 1000; // Convert to milliseconds
        const settlementTime = matchTimestamp + (SETTLEMENT_DELAY_HOURS * 60 * 60 * 1000);
        return Date.now() >= settlementTime;
    }

    if (!bet.matchDate || !bet.matchTime) {
        // If no time info, check if approved more than 4 hours ago
        const approvedAt = new Date(bet.approvedAt);
        const hoursAgo = (Date.now() - approvedAt.getTime()) / (1000 * 60 * 60);
        return hoursAgo >= 4;
    }

    // Parse match datetime (HH:MM format)
    const [year, month, day] = bet.matchDate.split('-').map(Number);
    const timeParts = bet.matchTime.split(':');
    if (timeParts.length < 2) {
        // Invalid time format, fall back to approval time
        const approvedAt = new Date(bet.approvedAt);
        const hoursAgo = (Date.now() - approvedAt.getTime()) / (1000 * 60 * 60);
        return hoursAgo >= 4;
    }

    const [hours, minutes] = timeParts.map(Number);
    const matchDateTime = new Date(year, month - 1, day, hours, minutes);
    const settlementTime = new Date(matchDateTime.getTime() + (SETTLEMENT_DELAY_HOURS * 60 * 60 * 1000));

    return Date.now() >= settlementTime.getTime();
}

// ============================================
// 🔄 Run Settlement Check
// ============================================

async function runSettlementCheck() {
    if (isRunning) {
        console.log('[AutoSettlement] Already running, skipping...');
        return;
    }

    isRunning = true;
    console.log('[AutoSettlement] 🔄 Running settlement check...');

    try {
        const pendingBets = await approvedBets.getPendingBets();
        console.log(`[AutoSettlement] Found ${pendingBets?.length || 0} pending bets`);

        let settled = 0;
        let skipped = 0;
        let errors = 0;

        for (const bet of pendingBets) {
            console.log(`[AutoSettlement] Processing: ${bet.match} | eventId: ${bet.eventId} | date: ${bet.matchDate} ${bet.matchTime}`);

            // Check if ready for settlement
            if (!isReadyForSettlement(bet)) {
                console.log(`[AutoSettlement] ⏳ Not ready: ${bet.match} (waiting for 3h after match)`);
                skipped++;
                continue;
            }

            console.log(`[AutoSettlement] ✓ Ready for settlement, fetching result...`);

            // Fetch match result
            const result = await fetchMatchResult(bet.eventId);
            console.log(`[AutoSettlement] API Result:`, JSON.stringify(result).substring(0, 200));

            if (!result.success) {
                console.log(`[AutoSettlement] ❌ Could not get result for ${bet.match}: ${result.error}`);
                errors++;
                continue;
            }

            // Evaluate prediction
            const isWon = evaluatePrediction(bet.market, bet.prediction, result.homeGoals, result.awayGoals);

            if (isWon === null) {
                console.log(`[AutoSettlement] ⚠️ Skipping unknown market: ${bet.match} - ${bet.market}`);
                errors++;
                continue;
            }

            const status = isWon ? 'WON' : 'LOST';

            // Settle the bet
            await approvedBets.settleBet(bet.id, status, result.finalScore);

            // Add to training pool
            const settledBetData = {
                ...bet,
                result: status,
                finalScore: result.finalScore,
                homeGoals: result.homeGoals,
                awayGoals: result.awayGoals
            };
            await trainingPool.addEntry(settledBetData);

            // Store in Vector DB for similarity search
            vectorDB.storeMatch(settledBetData).catch(e => {
                console.log('[AutoSettlement] VectorDB store skipped:', e.message);
            });

            console.log(`[AutoSettlement] ⚖️ ${bet.match} | ${bet.market} | ${result.finalScore} → ${status}`);
            settled++;

            // Small delay to avoid API rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`[AutoSettlement] ✅ Complete: ${settled} settled, ${skipped} not ready, ${errors} errors`);

    } catch (e) {
        console.error('[AutoSettlement] Error:', e.message);
    }

    isRunning = false;
}

// ============================================
// 🚀 Start Scheduler
// ============================================

function startScheduler() {
    console.log('[AutoSettlement] 🚀 Scheduler started (every 15 minutes)');

    // Run immediately on start
    setTimeout(() => {
        runSettlementCheck();
    }, 5000);

    // Then run every 15 minutes
    setInterval(() => {
        runSettlementCheck();
    }, SCHEDULER_INTERVAL_MS);
}

// ============================================
// 🛠️ Manual Settlement Trigger (for testing)
// ============================================

async function manualRun() {
    console.log('[AutoSettlement] 🔧 Manual run triggered');
    await runSettlementCheck();
}

module.exports = {
    startScheduler,
    runSettlementCheck,
    manualRun,
    evaluatePrediction,
    fetchMatchResult
};
