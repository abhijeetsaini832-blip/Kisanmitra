const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commodity: { type: String, required: true },
    condition: { type: String, enum: ['above', 'below'], required: true },
    targetPrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
    lastTriggeredAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
