/**
 * StockSense - Security and Cryptographic Utilities
 * Zero third-party dependencies - Uses Node.js native crypto module
 */
const crypto = require('node:crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense-secure-dev-secret-key-2026';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash a plain-text password using scrypt with random salt
 * @param {string} password 
 * @returns {string} salt:hash format
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored salt:hash
 * Uses timingSafeEqual to protect against timing attacks
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Generate a signed HMAC-SHA256 bearer token
 * @param {Object} payload 
 * @returns {string} base64 encoded token
 */
function generateToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const body = {
        ...payload,
        exp: Date.now() + TOKEN_EXPIRY_MS
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(body)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 bearer token
 * @param {string} token 
 * @returns {Object|null}
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

    if (signature !== expectedSignature) return null;

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (decoded.exp && Date.now() > decoded.exp) {
            return null; // Expired
        }
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Generate a 6-digit numeric OTP for password reset
 * @returns {string} 6-digit OTP string
 */
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    generateOtp
};
