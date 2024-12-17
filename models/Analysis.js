import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    type: String,
    intensity: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
        default: 0
    },
    emotion: String,
    duration: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    pitch: String,
    behaviorPattern: String,
    rhythm: String,
    spectralInfo: String,
    energyPattern: String,
    context: String,
    interpretation: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Analysis', analysisSchema);
