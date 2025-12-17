const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const { getUserByEmail, createUser, getUserById } = require('../database');

// Serialize user for the session (if using sessions)
// We are primarily using JWTs, but passport might need this for the initial callback handshake
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await getUserById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ============================================
// 🌐 Google Strategy
// ============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists by email
                const email = profile.emails[0].value;
                let user = await getUserByEmail(email);

                if (!user) {
                    // Create new user
                    // Generate a random password since they use social login
                    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!'; // Meets valid criteria
                    const name = profile.displayName || email.split('@')[0];

                    const result = await createUser(email, randomPassword, name);
                    if (result.success) {
                        user = await getUserById(result.userId);
                    } else {
                        return done(new Error('Failed to create user from Google profile'));
                    }
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
} else {
    console.warn('[AUTH] Google Client ID/Secret not set. Google Auth disabled.');
}

// ============================================
// 🐦 Twitter Strategy
// ============================================
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: "/auth/twitter/callback",
        includeEmail: true
    },
        async (token, tokenSecret, profile, done) => {
            try {
                // Twitter might not always return email depending on permissions
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@twitter.placeholder.com`;

                let user = await getUserByEmail(email);

                if (!user) {
                    // Create new user
                    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
                    const name = profile.displayName || profile.username;

                    const result = await createUser(email, randomPassword, name);
                    if (result.success) {
                        user = await getUserById(result.userId);
                    } else {
                        return done(new Error('Failed to create user from Twitter profile'));
                    }
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
} else {
    // console.warn('[AUTH] Twitter Consumer Key/Secret not set. Twitter Auth disabled.');
}

module.exports = passport;
