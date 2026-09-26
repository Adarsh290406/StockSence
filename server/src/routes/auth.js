/**
 * StockSense - Authentication & User Management Routes
 * Features: Signup, Login, Profile, OTP-based password reset
 */
const express = require('express');
const router = express.Router();
const { queryOne, run } = require('../db/database');
const { hashPassword, verifyPassword, generateToken, verifyToken, generateOtp } = require('../utils/security');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Middleware to authenticate requests via Bearer token
 */
function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', (req, res) => {
    try {
        const { name, email, password, role = 'inventory_manager' } = req.body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Valid full name is required (min 2 characters)' });
        }
        if (!email || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ success: false, error: 'A valid email address is required' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const validRole = ['inventory_manager', 'warehouse_staff'].includes(role) ? role : 'inventory_manager';
        const cleanEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existing = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists' });
        }

        const passwordHash = hashPassword(password);
        const result = run(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name.trim(), cleanEmail, passwordHash, validRole]
        );

        const user = {
            id: result.lastInsertRowid,
            name: name.trim(),
            email: cleanEmail,
            role: validRole
        };

        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error during registration' });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = queryOne('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [cleanEmail]);

        if (!user || !verifyPassword(password, user.password_hash)) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const tokenPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token = generateToken(tokenPayload);

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: tokenPayload
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error during login' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Generates an OTP for password reset
 */
router.post('/forgot-password', (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ success: false, error: 'Please provide a valid registered email address' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);

        if (!user) {
            // Standard security: don't reveal email non-existence, but inform
            return res.status(404).json({ success: false, error: 'No user registered with this email address' });
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        run(
            'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
            [cleanEmail, otp, expiresAt]
        );

        return res.json({
            success: true,
            message: 'OTP has been generated. For testing/demo convenience, use the code below.',
            otp, // Returned for effortless demo/testing without external SMTP lockup
            expiresIn: '10 minutes'
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ success: false, error: 'Failed to process password reset request' });
    }
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP and updates user's password
 */
router.post('/reset-password', (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, error: 'Email, OTP code, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find valid, unused, unexpired OTP
        const now = new Date().toISOString();
        const resetRecord = queryOne(
            `SELECT id FROM password_resets 
             WHERE email = ? AND otp = ? AND used_at IS NULL AND expires_at > ? 
             ORDER BY id DESC LIMIT 1`,
            [cleanEmail, otp.trim(), now]
        );

        if (!resetRecord) {
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
        }

        // Mark OTP as used
        run('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [resetRecord.id]);

        // Update password
        const passwordHash = hashPassword(newPassword);
        run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', [passwordHash, cleanEmail]);

        return res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticateUser, (req, res) => {
    const user = queryOne(
        'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user });
});

module.exports = {
    router,
    authenticateUser
};
