import mongoose from 'mongoose';
import { config } from './config.js';

let connection = null;

export const connectToDatabase = async () => {
    try {
        if (connection) {
            console.log('Using existing database connection');
            return connection;
        }

        console.log('Connecting to MongoDB...');
        
        // Dodaj event listenery przed połączeniem
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Połącz z bazą danych
        connection = await mongoose.connect(config.database.uri, {
            ...config.database.options,
            serverSelectionTimeoutMS: 5000, // Timeout po 5 sekundach
            socketTimeoutMS: 45000, // Timeout dla operacji po 45 sekundach
        });

        // Dodaj indeksy i walidacje
        await initializeCollections();

        return connection;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
};

export const closeConnection = async () => {
    try {
        if (mongoose.connection.readyState !== 0) {
            console.log('Closing database connection...');
            await mongoose.connection.close();
            connection = null;
            console.log('Database connection closed');
        }
    } catch (error) {
        console.error('Error closing database connection:', error);
        throw error;
    }
};

const initializeCollections = async () => {
    try {
        // Sprawdź i utwórz indeksy dla kolekcji
        const collections = mongoose.connection.collections;

        if (collections.users) {
            await collections.users.createIndex({ email: 1 }, { unique: true });
            await collections.users.createIndex({ username: 1 }, { unique: true });
        }

        if (collections.recordings) {
            await collections.recordings.createIndex({ userId: 1 });
            await collections.recordings.createIndex({ createdAt: -1 });
        }

        if (collections.analytics) {
            await collections.analytics.createIndex({ timestamp: -1 });
            await collections.analytics.createIndex({ userId: 1 });
        }

        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating database indexes:', error);
        throw error;
    }
};

// Funkcja pomocnicza do sprawdzania stanu połączenia
export const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Funkcja do ponownego połączenia
export const reconnectToDatabase = async () => {
    if (!isDatabaseConnected()) {
        console.log('Attempting to reconnect to database...');
        await connectToDatabase();
    }
};

// Automatyczne ponowne połączenie przy błędach
mongoose.connection.on('error', (error) => {
    console.error('MongoDB error:', error);
    setTimeout(reconnectToDatabase, 5000);
});

export default {
    connectToDatabase,
    closeConnection,
    isDatabaseConnected,
    reconnectToDatabase
};