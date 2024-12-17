import jwt from 'jsonwebtoken';

export const tokenHandler = {
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    },

    generateRefreshToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '30d' }
        );
    },

    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    },

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return null;
        }
    }
}; 