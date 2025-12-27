/**
 * GoalGPT Pro - Admin Routes
 * User management, stats, and admin operations
 */

const express = require('express');
const router = express.Router();
const { getAllUsers, getUserStats, updateUserPlan, deleteUser, getUserById, getRecentLogs, createPick, deletePick } = require('../database');
const { requireAdmin } = require('../auth');
const aiService = require('../services/aiService');
const betTracker = require('../betTracker');

// All admin routes require admin role
router.use(requireAdmin);

// ============================================
// 📜 System Logs
// ============================================
router.get('/logs', async (req, res) => {
    try {
        const logs = await getRecentLogs(200);
        res.json({ success: true, logs });
    } catch (error) {
        console.error('[ADMIN] Logs error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🧠 AI Strategy Optimization
// ============================================
router.post('/optimize-strategy', async (req, res) => {
    try {
        // 1. Get History (Last 100 settled bets)
        const bets = betTracker.getAllBets()
            .filter(b => b.status === 'WON' || b.status === 'LOST')
            .slice(0, 100);

        if (bets.length === 0) {
            return res.json({ success: false, error: 'No settled bets found for analysis.' });
        }

        // 2. Generate Report
        const report = await aiService.generateOptimizationReport(bets);

        res.json({ success: true, report });
    } catch (error) {
        console.error('[ADMIN] Strategy Optimize Error:', error);
        res.status(500).json({ success: false, error: 'AI Analysis failed' });
    }
});

// ============================================
// 📊 Dashboard Stats
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const stats = await getUserStats();
        const users = await getAllUsers();

        // Calculate recent activity
        const now = new Date();
        const last24h = users.filter(u => {
            if (!u.last_login) return false;
            const loginDate = new Date(u.last_login);
            return (now - loginDate) < 24 * 60 * 60 * 1000;
        }).length;

        const last7d = users.filter(u => {
            if (!u.created_at) return false;
            const created = new Date(u.created_at);
            return (now - created) < 7 * 24 * 60 * 60 * 1000;
        }).length;

        res.json({
            success: true,
            stats: {
                total_users: stats.total || 0,
                free_users: stats.free_users || 0,
                pro_users: stats.pro_users || 0,
                premium_users: stats.premium_users || 0,
                active_last_24h: last24h,
                new_last_7d: last7d,
                revenue_monthly: (stats.pro_users || 0) * 99 + (stats.premium_users || 0) * 199
            }
        });
    } catch (error) {
        console.error('[ADMIN] Stats error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 👥 Get All Users
// ============================================
router.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                plan: u.plan,
                plan_expires_at: u.plan_expires_at,
                signals_today: u.signals_today || 0,
                created_at: u.created_at,
                last_login: u.last_login
            }))
        });
    } catch (error) {
        console.error('[ADMIN] Users list error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🔄 Update User Plan
// ============================================
router.put('/users/:id/plan', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, expires_at } = req.body;

        if (!['free', 'pro', 'premium'].includes(plan)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan. Must be free, pro, or premium'
            });
        }

        const user = await getUserById(parseInt(id));
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        await updateUserPlan(parseInt(id), plan, expires_at || null);

        res.json({
            success: true,
            message: `User plan updated to ${plan}`
        });
    } catch (error) {
        console.error('[ADMIN] Update plan error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🗑️ Delete User
// ============================================
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await getUserById(parseInt(id));
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete admin users'
            });
        }

        await deleteUser(parseInt(id));

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('[ADMIN] Delete user error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 📈 Get Signal Stats
// ============================================
router.get('/signals/stats', (req, res) => {
    try {
        res.json({
            success: true,
            stats: {
                total_signals_today: 0,
                iy_signals: 0,
                ms_signals: 0,
                avg_confidence: 0
            }
        });
    } catch (error) {
        console.error('[ADMIN] Signal stats error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🎫 Coupon Management Endpoints
// ============================================
const { getCoupons, saveCoupon, settleCoupon, deleteCoupon } = require('../betTrackerRedis');

// Get All Coupons (Admin/Public)
router.get('/coupons', async (req, res) => {
    try {
        const coupons = await getCoupons();
        res.json({ success: true, coupons });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create Coupon
router.post('/coupons', async (req, res) => {
    try {
        const result = await saveCoupon(req.body);
        res.json({ success: true, coupon: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Settle Coupon
router.post('/coupons/:id/settle', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await settleCoupon(id, status);
        if (!result.success) return res.status(400).json(result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Coupon
router.delete('/coupons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteCoupon(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear History (Hard Reset)
router.delete('/history', async (req, res) => {
    try {
        const { source } = req.body; // Optional: 'live' or 'daily'

        // Input Validation
        if (source && !['live', 'daily'].includes(source)) {
            return res.status(400).json({ success: false, error: 'Invalid source. Must be "live" or "daily".' });
        }

        const { clearAllBets } = require('../betTrackerRedis');

        const result = await clearAllBets(source);
        res.json(result);
    } catch (error) {
        console.error('[ADMIN] Clear history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 🎯 Curated Picks Management
// ============================================
router.post('/picks', async (req, res) => {
    try {
        const { type, match_data, market, category, confidence } = req.body;

        // Basic Validation
        if (!['single', 'parlay'].includes(type) || !match_data) {
            return res.status(400).json({ success: false, error: 'Invalid pick data' });
        }

        const result = await createPick(type, match_data, market || 'General', category || 'Daily', confidence || 80);
        res.json(result);
    } catch (error) {
        console.error('[ADMIN] Create pick error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.delete('/picks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deletePick(id);
        res.json(result);
    } catch (error) {
        console.error('[ADMIN] Delete pick error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// ============================================
// 📱 Mobile Management
// ============================================

router.post('/mobile/toggle', async (req, res) => {
    try {
        const { betId, isMobile } = req.body;
        const approvedBets = require('../approvedBets');
        const result = await approvedBets.toggleMobile(betId, isMobile);
        res.json(result);
    } catch (error) {
        console.error('[ADMIN] Mobile Toggle Error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Clear Mobile List (Manual Reset)
router.delete('/mobile/clear-list', async (req, res) => {
    try {
        const { db } = require('../database');
        await db.execute("UPDATE approved_bets SET is_mobile = 0");
        res.json({ success: true, message: 'Mobil liste temizlendi (maçlar silinmedi, sadece listeden çıktı)' });
    } catch (error) {
        console.error('[ADMIN] Clear Mobile List Error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// 📱 Clear Mobile Predictions (Delete Pending Bets)
router.delete('/mobile-predictions', async (req, res) => {
    try {
        const approvedBets = require('../approvedBets');
        const result = await approvedBets.clearAllBets();
        console.log('[ADMIN] All mobile predictions cleared for daily reset');
        res.json({
            success: true,
            message: 'Tüm mobil tahminler sıfırlandı',
            ...result
        });
    } catch (error) {
        console.error('[ADMIN] Clear mobile predictions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

