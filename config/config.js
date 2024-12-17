import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
        url: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`
    },

    database: {
        uri: process.env.MONGODB_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority'
        }
    },

    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? [process.env.CLIENT_URL, 'exp://barksync.app']
            : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    audio: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
            'audio/wav',
            'audio/mpeg',
            'audio/mp4',
            'audio/x-m4a',
            'audio/m4a',
            'application/octet-stream'
        ],
        uploadDir: path.join(__dirname, '..', 'uploads'),
        tempDir: path.join(__dirname, '..', 'temp')
    },

    security: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
        sessionSecret: process.env.SESSION_SECRET,
        bcryptRounds: 10
    },

    storage: {
        provider: process.env.STORAGE_PROVIDER || 'local', // 'local' lub 's3'
        s3: {
            bucket: process.env.AWS_S3_BUCKET,
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    },

    analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        provider: process.env.ANALYTICS_PROVIDER || 'internal'
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'dev'
    }
};

// Walidacja wymaganych zmiennych środowiskowych
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default config;