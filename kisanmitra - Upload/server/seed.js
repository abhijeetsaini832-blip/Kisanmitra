require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Crop = require('./models/Crop');
const PriceEntry = require('./models/PriceEntry');
const Alert = require('./models/Alert');

const BASE = {
  Wheat: [2275, 'Karnal Mandi', 'Haryana'],
  Rice: [2183, 'Ludhiana Mandi', 'Punjab'],
  Tomato: [1800, 'Nashik Mandi', 'Maharashtra'],
  Onion: [1500, 'Lasalgaon Mandi', 'Maharashtra'],
  Potato: [1200, 'Agra Mandi', 'Uttar Pradesh'],
  Maize: [2090, 'Davangere Mandi', 'Karnataka'],
  Cotton: [6620, 'Rajkot Mandi', 'Gujarat'],
  Soybean: [4600, 'Indore Mandi', 'Madhya Pradesh'],
  Mustard: [5650, 'Alwar Mandi', 'Rajasthan'],
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Crop.deleteMany({}), PriceEntry.deleteMany({}), Alert.deleteMany({})]);

  const prices = [];
  for (const [commodity, [base, market, state]] of Object.entries(BASE)) {
    let p = base;
    for (let d = 20; d >= 0; d--) {
      p = Math.round(p * (1 + (Math.random() - 0.46) * 0.03)); // slight upward drift
      prices.push({ commodity, market, state, pricePerQuintal: p, date: new Date(Date.now() - d * 864e5) });
    }
  }
  await PriceEntry.insertMany(prices);

  const user = await User.create({
    name: 'Ramesh Kumar', email: 'demo@kisanmitra.in', password: 'demo1234',
    village: 'Gharaunda', district: 'Karnal', state: 'Haryana',
  });
  const day = (n) => new Date(Date.now() + n * 864e5);
  await Crop.insertMany([
    { owner: user._id, name: 'Wheat', variety: 'HD-3086', areaAcres: 5, soilType: 'loamy', season: 'rabi', sowingDate: day(-40), expectedHarvest: day(85), expectedYieldQuintal: 100,
      logs: [{ type: 'water', note: 'First irrigation', cost: 600 }, { type: 'fertilizer', note: 'Urea 50kg', cost: 1100 }] },
    { owner: user._id, name: 'Mustard', areaAcres: 2, soilType: 'sandy', season: 'rabi', sowingDate: day(-25), expectedHarvest: day(95), expectedYieldQuintal: 20,
      logs: [{ type: 'fertilizer', note: 'DAP basal dose', cost: 1350 }] },
    { owner: user._id, name: 'Tomato', areaAcres: 1, soilType: 'loamy', season: 'zaid', sowingDate: day(-60), expectedHarvest: day(20), expectedYieldQuintal: 80,
      logs: [{ type: 'pesticide', note: 'Neem oil spray', cost: 400 }] },
  ]);
  await Alert.create({ owner: user._id, commodity: 'Wheat', condition: 'above', targetPrice: 2400 });

  console.log('Seeded. Demo login -> demo@kisanmitra.in / demo1234');
  await mongoose.disconnect();
})();
