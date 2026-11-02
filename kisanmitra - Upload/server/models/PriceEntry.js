const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, index: true },
    market: { type: String, required: true },
    state: String,
    pricePerQuintal: { type: Number, required: true },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceEntry', priceSchema);
