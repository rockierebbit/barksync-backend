import express from 'express';
import { verifyGoogleToken } from '../middleware/auth.js';
import User from '../models/User.js';
import { tokenHandler } from '../utils/tokenHandler.js';

const router = express.Router();

router.post('/google', verifyGoogleToken, async (req, res) => {
    try {
        console.log('=== Google Auth endpoint hit ===');
        const { email, name, picture, userId } = req.googleUser;

        console.log('Authenticating user:', email);

        // Znajdź lub utwórz użytkownika
        let user = await User.findOne({ email });
        
        if (!user) {
            console.log('Creating new user:', email);
            user = new User({
                email,
                name,
                picture,
                googleId: userId,
                deviceInfo: req.body.deviceInfo
            });
            await user.save();
            console.log('New user created:', user._id);
        } else {
            console.log('Existing user found:', user._id);
        }

        // Generuj tokeny
        const token = tokenHandler.generateToken(user._id);
        const refreshToken = tokenHandler.generateRefreshToken(user._id);

        // Aktualizuj lastLogin
        user.lastLogin = new Date();
        await user.save();

        console.log('Authentication successful for:', user._id);

        res.json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Szczegółowe logowanie błędów
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user data',
                details: error.message
            });
        }
        
        if (error.name === 'MongoError' && error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'production' 
                ? 'Authentication failed' 
                : error.message
        });
    }
});

export default router; 