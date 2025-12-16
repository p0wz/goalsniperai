/**
 * GoalGPT Pro - Curated Picks Routes
 * Public/Protected endpoints for fetching daily picks
 */

const express = require('express');
const router = express.Router();
const { getDailyPicks } = require('../database');
const { requireAuth, requirePremium } = require('../auth'); // Pro users only? Or Free too? User said "Pro users for picks", but maybe free can see teaser? Let's check plan.
// User said: "pro kullanıcılar içn dashboardda günün tahminleri ve günün parlay'i olacak"
// So it implies restricted access.

router.get('/daily', requireAuth, requirePremium, async (req, res) => {
    try {
        const picks = await getDailyPicks();
        res.json({
            success: true,
            data: picks
        });
    } catch (e) {
        console.error('Fetch Picks Error:', e);
        res.status(500).json({ success: false, error: 'Failed to fetch picks' });
    }
});

module.exports = router;
