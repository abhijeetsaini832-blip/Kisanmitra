const Crop = require('../models/Crop');
const PriceEntry = require('../models/PriceEntry');
const Alert = require('../models/Alert');

// Tool definitions exposed to the AI agent (Anthropic tool-use format)
const definitions = [
  {
    name: 'get_my_crops',
    description: "List the farmer's crops with area, soil, season, sowing date, status and recent activity logs.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_market_prices',
    description: 'Get recent mandi prices (INR per quintal) and the 7-day trend for a commodity.',
    input_schema: {
      type: 'object',
      properties: { commodity: { type: 'string', description: 'e.g. Wheat, Rice, Tomato' } },
      required: ['commodity'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get a 5-day weather forecast (temperature, rain) for a place name such as a district or city.',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string' } },
      required: ['place'],
    },
  },
  {
    name: 'create_price_alert',
    description: 'Create a price alert so the farmer is notified when a commodity goes above or below a target price per quintal.',
    input_schema: {
      type: 'object',
      properties: {
        commodity: { type: 'string' },
        condition: { type: 'string', enum: ['above', 'below'] },
        targetPrice: { type: 'number' },
      },
      required: ['commodity', 'condition', 'targetPrice'],
    },
  },
  {
    name: 'log_crop_activity',
    description: 'Record an activity (water, fertilizer, pesticide, harvest, note) against one of the farmer\'s crops by crop name.',
    input_schema: {
      type: 'object',
      properties: {
        cropName: { type: 'string' },
        type: { type: 'string', enum: ['water', 'fertilizer', 'pesticide', 'harvest', 'note'] },
        note: { type: 'string' },
        cost: { type: 'number' },
      },
      required: ['cropName', 'type'],
    },
  },
];

async function priceTrend(commodity) {
  const since = new Date(Date.now() - 14 * 864e5);
  const rows = await PriceEntry.find({
    commodity: new RegExp(`^${commodity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    date: { $gte: since },
  }).sort({ date: 1 });
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const weekAgo = rows.find((r) => r.date >= new Date(Date.now() - 7 * 864e5)) || rows[0];
  const change = ((latest.pricePerQuintal - weekAgo.pricePerQuintal) / weekAgo.pricePerQuintal) * 100;
  return {
    commodity: latest.commodity,
    latestPrice: latest.pricePerQuintal,
    market: latest.market,
    weekChangePct: Number(change.toFixed(1)),
    trend: change > 2 ? 'rising' : change < -2 ? 'falling' : 'stable',
    history: rows.slice(-10).map((r) => ({ date: r.date.toISOString().slice(0, 10), price: r.pricePerQuintal })),
  };
}

const handlers = {
  async get_my_crops(_input, user) {
    const crops = await Crop.find({ owner: user._id }).sort({ createdAt: -1 });
    return crops.map((c) => ({
      name: c.name,
      areaAcres: c.areaAcres,
      soilType: c.soilType,
      season: c.season,
      sowingDate: c.sowingDate.toISOString().slice(0, 10),
      daysSinceSowing: Math.floor((Date.now() - c.sowingDate) / 864e5),
      status: c.status,
      recentLogs: c.logs.slice(-3).map((l) => ({ type: l.type, note: l.note, date: l.date })),
    }));
  },

  async get_market_prices({ commodity }) {
    return (await priceTrend(commodity)) || { message: `No price data for ${commodity}` };
  },

  async get_weather({ place }) {
    try {
      const geo = await (await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`
      )).json();
      const loc = geo.results && geo.results[0];
      if (!loc) return { message: `Could not find ${place}` };
      const w = await (await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=5`
      )).json();
      return {
        place: `${loc.name}, ${loc.admin1 || ''}`,
        days: w.daily.time.map((d, i) => ({
          date: d,
          maxC: w.daily.temperature_2m_max[i],
          minC: w.daily.temperature_2m_min[i],
          rainMm: w.daily.precipitation_sum[i],
        })),
      };
    } catch {
      return { message: 'Weather service unavailable right now' };
    }
  },

  async create_price_alert({ commodity, condition, targetPrice }, user) {
    const a = await Alert.create({ owner: user._id, commodity, condition, targetPrice });
    return { created: true, id: a._id, commodity, condition, targetPrice };
  },

  async log_crop_activity({ cropName, type, note, cost }, user) {
    const crop = await Crop.findOne({ owner: user._id, name: new RegExp(`^${cropName}$`, 'i') });
    if (!crop) return { message: `No crop named ${cropName} found` };
    crop.logs.push({ type, note, cost: cost || 0 });
    await crop.save();
    return { logged: true, crop: crop.name, type };
  },
};

async function run(name, input, user) {
  if (!handlers[name]) return { error: `Unknown tool ${name}` };
  try {
    return await handlers[name](input || {}, user);
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { definitions, run, priceTrend };
