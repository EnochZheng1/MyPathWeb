const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    sender: { type: String, enum: ['user', 'hedge'], required: true },
    createdAt: { type: Date, default: Date.now },
});

const ChatSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema);