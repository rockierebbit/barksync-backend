const ConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    analysis: {
        type: Object,
        required: true
    }
}); 