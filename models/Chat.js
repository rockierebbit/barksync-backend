import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['user', 'ai', 'system', 'analysis', 'error'],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    analysisId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Analysis'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Chat', chatSchema);
