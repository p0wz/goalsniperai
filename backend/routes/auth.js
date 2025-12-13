/**
 * GoalGPT Pro - Auth Routes
 * Login, Register, Logout, Verify endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { createUser, verifyPassword, getUserByEmail, updateLastLogin, getUserById } = require('../database');
const { generateToken, requireAuth } = require('../auth');

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { success: false, error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// 📝 Register
// ============================================
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }

        // Strong password validation
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                success: false,
                error: 'Şifre en az 8 karakter, 1 büyük harf ve 1 rakam içermelidir'
            });
        }

        if (!email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Create user
        const result = await createUser(email, password, name);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        // Get created user and generate token
        const user = await getUserById(result.userId);
        const token = generateToken(user);

        // Set secure cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plan: user.plan
            },
            token
        });

    } catch (error) {
        console.error('[AUTH] Register error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🔐 Login
// ============================================
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        if (!verifyPassword(user, password)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Update last login
        await updateLastLogin(user.id);

        // Generate token
        const token = generateToken(user);

        // Set secure cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plan: user.plan
            },
            token
        });

    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// 🚪 Logout
// ============================================
router.post('/logout', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================
// ✅ Verify Token / Get Current User
// ============================================
router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            plan: req.user.plan,
            signals_today: req.user.signals_today || 0,
            created_at: req.user.created_at
        }
    });
});

// ============================================
// 🔄 Refresh Token
// ============================================
router.post('/refresh', requireAuth, (req, res) => {
    const token = generateToken(req.user);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token });
});

module.exports = router;
