const router = require('express').Router();
const PriceEntry = require('../models/PriceEntry');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { priceTrend } = require('../services/tools');

router.use(protect);

// Latest price + trend for every commodity
router.get('/', async (req, res, next) => {
  try {
    const commodities = await PriceEntry.distinct('commodity');
    const out = (await Promise.all(commodities.map(priceTrend))).filter(Boolean);
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/:commodity', async (req, res, next) => {
  try {
    const t = await priceTrend(req.params.commodity);
    if (!t) return res.status(404).json({ message: 'No data' });
    res.json(t);
  } catch (e) { next(e); }
});

// Alerts
router.get('/alerts/mine', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const withState = await Promise.all(alerts.map(async (a) => {
      const t = await priceTrend(a.commodity);
      const current = t ? t.latestPrice : null;
      const triggered = current != null && (a.condition === 'above' ? current >= a.targetPrice : current <= a.targetPrice);
      return { ...a.toObject(), currentPrice: current, triggered };
    }));
    res.json(withState);
  } catch (e) { next(e); }
});

router.post('/alerts', async (req, res, next) => {
  try {
    res.status(201).json(await Alert.create({ ...req.body, owner: req.user._id }));
  } catch (e) { next(e); }
});

router.delete('/alerts/:id', async (req, res, next) => {
  try {
    await Alert.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
