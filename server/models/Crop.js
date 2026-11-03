const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['water', 'fertilizer', 'pesticide', 'harvest', 'note'], default: 'note' },
    note: String,
    cost: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cropSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    variety: String,
    areaAcres: { type: Number, required: true, min: 0 },
    soilType: { type: String, enum: ['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay'], default: 'loamy' },
    season: { type: String, enum: ['kharif', 'rabi', 'zaid'], default: 'kharif' },
    sowingDate: { type: Date, required: true },
    expectedHarvest: Date,
    status: { type: String, enum: ['growing', 'harvested', 'failed'], default: 'growing' },
    expectedYieldQuintal: { type: Number, default: 0 },
    actualYieldQuintal: { type: Number, default: 0 },
    logs: [logSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Crop', cropSchema);
