import jwt from 'jsonwebtoken';

export const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'zoho_transport_super_secret_key_2026', {
        expiresIn: '15m', // Access token valid for 15 minutes
    });
};

export const generateRefreshToken = (id) => {
    // Falls back to JWT_SECRET if JWT_REFRESH_SECRET is not specified
    const secret = process.env.JWT_REFRESH_SECRET || 'zoho_transport_refresh_secret_key_2026';
    return jwt.sign({ id }, secret, {
        expiresIn: '7d', // Refresh token valid for 7 days
    });
};

// Default export kept for legacy support
const generateToken = (id) => {
    return generateAccessToken(id);
};
export default generateToken;
