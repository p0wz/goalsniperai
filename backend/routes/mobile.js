/**
 * GoalSniper Mobile API Routes
 * Endpoints specifically for the mobile application
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../auth');
const approvedBets = require('../approvedBets');
const { getUserById } = require('../database');

// ============================================
// 📱 Mobile Picks (from Approved Bets)
// ============================================

// Get today's picks for mobile app (public for logged-in users)
router.get('/picks', requireAuth, async (req, res) => {
    try {
        const allBets = await approvedBets.getAllBets();

        // ONLY show manually selected Mobile picks
        const mobilePicks = allBets.filter(bet => bet.isMobile);

        // Format for mobile
        const picks = mobilePicks.map(bet => ({
            id: bet.id,
            match: bet.match,
            homeTeam: bet.homeTeam,
            awayTeam: bet.awayTeam,
            league: bet.league,
            matchTime: bet.matchTime,
            market: bet.market,
            odds: bet.odds,
            confidence: bet.confidence,
            status: bet.status,
            resultScore: bet.resultScore,
            approvedAt: bet.approvedAt,
            isMobile: true
        }));

        res.json({
            success: true,
            picks,
            count: picks.length
        });
    } catch (error) {
        console.error('[Mobile] Picks error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 📊 Mobile Stats
// ============================================

router.get('/stats', requireAuth, async (req, res) => {
    try {
        const allBets = await approvedBets.getAllBets();

        // Calculate stats
        const won = allBets.filter(b => b.status === 'WON').length;
        const lost = allBets.filter(b => b.status === 'LOST').length;
        const pending = allBets.filter(b => b.status === 'PENDING').length;
        const total = won + lost;
        const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

        // Weekly performance (last 7 days)
        const now = new Date();
        const weeklyData = [];
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayBets = allBets.filter(b => {
                if (!b.settledAt) return false;
                return b.settledAt.split('T')[0] === dateStr;
            });

            const dayWon = dayBets.filter(b => b.status === 'WON').length;
            const dayTotal = dayBets.length;
            const dayRate = dayTotal > 0 ? Math.round((dayWon / dayTotal) * 100) : 0;

            weeklyData.push({
                day: dayNames[date.getDay()],
                rate: dayRate,
                won: dayWon,
                total: dayTotal
            });
        }

        // Calculate streak
        const settledBets = allBets
            .filter(b => b.status === 'WON' || b.status === 'LOST')
            .sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt));

        let streak = 0;
        let streakType = null;
        for (const bet of settledBets) {
            if (streakType === null) {
                streakType = bet.status;
                streak = 1;
            } else if (bet.status === streakType) {
                streak++;
            } else {
                break;
            }
        }

        res.json({
            success: true,
            stats: {
                won,
                lost,
                pending,
                total: allBets.length,
                winRate,
                streak: streakType === 'WON' ? streak : -streak,
                weeklyData
            }
        });
    } catch (error) {
        console.error('[Mobile] Stats error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 👤 User Profile
// ============================================

router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email.split('@')[0],
                role: user.role,
                plan: user.plan,
                planExpiresAt: user.plan_expires_at,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('[Mobile] Profile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🔄 Admin: Reset Daily Picks
// ============================================

router.post('/admin/reset-picks', requireAdmin, async (req, res) => {
    try {
        // Delete all pending bets (current day's picks)
        const result = await approvedBets.clearPendingBets();

        console.log('[Mobile] Daily picks reset by admin');
        res.json({
            success: true,
            message: 'Daily picks reset successfully',
            deleted: result.deleted || 0
        });
    } catch (error) {
        console.error('[Mobile] Reset picks error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🛠️ Admin: Get All Functions Status
// ============================================

router.get('/admin/status', requireAdmin, async (req, res) => {
    try {
        const allBets = await approvedBets.getAllBets();
        const pendingCount = allBets.filter(b => b.status === 'PENDING').length;
        const wonCount = allBets.filter(b => b.status === 'WON').length;
        const lostCount = allBets.filter(b => b.status === 'LOST').length;

        res.json({
            success: true,
            status: {
                pendingBets: pendingCount,
                wonBets: wonCount,
                lostBets: lostCount,
                totalBets: allBets.length,
                winRate: (wonCount + lostCount) > 0
                    ? Math.round((wonCount / (wonCount + lostCount)) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('[Mobile] Admin status error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
