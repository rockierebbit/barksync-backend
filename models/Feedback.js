import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ['suggestion', 'bug', 'praise', 'other']
    },
    feedback: {
        type: String,
        required: true
    },
    deviceInfo: {
        platform: String,
        version: String,
        bundleId: {
            type: String,
            default: 'com.barksync.app'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Feedback', feedbackSchema); 