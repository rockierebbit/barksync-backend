import { OAuth2Client } from 'google-auth-library';

const clientWeb = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);
const clientIOS = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_IOS);

export const verifyGoogleToken = async (req, res, next) => {
    try {
        const { idToken, platform } = req.body;
        
        if (!idToken) {
            return res.status(401).json({
                success: false,
                error: 'No ID token provided'
            });
        }

        // Wybierz odpowiedni client w zależności od platformy
        const client = platform === 'ios' ? clientIOS : clientWeb;

        // Weryfikuj token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: platform === 'ios' 
                ? process.env.GOOGLE_CLIENT_ID_IOS 
                : process.env.GOOGLE_CLIENT_ID_WEB
        });

        const payload = ticket.getPayload();
        
        // Dodaj dane użytkownika do request
        req.googleUser = {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            userId: payload.sub
        };

        next();
    } catch (error) {
        console.error('Google token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid Google token'
        });
    }
}; 