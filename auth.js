/**
 * GoalGPT Pro - Authentication Middleware
 * JWT-based authentication with role checking
 */

const jwt = require('jsonwebtoken');
const { getUserById } = require('./database');

// JWT Secret - must be set in environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('[AUTH] WARNING: JWT_SECRET not set - using insecure default. Set this in production!');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ============================================
// 🔐 Generate Token
// ============================================
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan
    };

    return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ============================================
// ✅ Verify Token
// ============================================
function verifyToken(token) {
    try {
        return jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// ============================================
// 🛡️ Auth Middleware - Requires Login
// ============================================
async function requireAuth(req, res, next) {
    // Get token from cookie or Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            redirect: '/login'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            redirect: '/login'
        });
    }

    // Get fresh user data
    const user = await getUserById(decoded.id);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'User not found',
            redirect: '/login'
        });
    }

    req.user = user;
    next();
}

// ============================================
// 👑 Admin Middleware - Requires Admin Role
// ============================================
async function requireAdmin(req, res, next) {
    // First check if authenticated
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            redirect: '/login'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            redirect: '/login'
        });
    }

    // Get fresh user data
    const user = await getUserById(decoded.id);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'User not found',
            redirect: '/login'
        });
    }

    // Check admin role
    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            redirect: '/dashboard'
        });
    }

    req.user = user;
    next();
}

// ============================================
// 💎 Premium Middleware - Requires Pro/Premium
// ============================================
function requirePremium(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            redirect: '/login'
        });
    }

    if (req.user.plan === 'free') {
        return res.status(403).json({
            success: false,
            error: 'Premium subscription required',
            redirect: '/pricing'
        });
    }

    next();
}

// ============================================
// 🔍 Optional Auth - Attach user if logged in
// ============================================
async function optionalAuth(req, res, next) {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = await getUserById(decoded.id);
        }
    }

    next();
}

module.exports = {
    JWT_SECRET: EFFECTIVE_JWT_SECRET,
    generateToken,
    verifyToken,
    requireAuth,
    requireAdmin,
    requirePremium,
    optionalAuth
};
