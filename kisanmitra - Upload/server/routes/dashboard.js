const router = require('express').Router();
const Crop = require('../models/Crop');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { priceTrend } = require('../services/tools');

router.get('/', protect, async (req, res, next) => {
  try {
    const crops = await Crop.find({ owner: req.user._id });
    const growing = crops.filter((c) => c.status === 'growing');
    const totalAcres = crops.reduce((s, c) => s + c.areaAcres, 0);
    const totalCost = crops.reduce((s, c) => s + c.logs.reduce((a, l) => a + (l.cost || 0), 0), 0);

    // Estimated revenue from expected yield x latest market price
    let projectedRevenue = 0;
    const perCrop = [];
    for (const c of growing) {
      const t = await priceTrend(c.name);
      const rev = t ? c.expectedYieldQuintal * t.latestPrice : 0;
      projectedRevenue += rev;
      perCrop.push({ name: c.name, acres: c.areaAcres, revenue: rev, trend: t ? t.trend : 'n/a' });
    }

    const costByType = {};
    crops.forEach((c) => c.logs.forEach((l) => { costByType[l.type] = (costByType[l.type] || 0) + (l.cost || 0); }));

    const activeAlerts = await Alert.countDocuments({ owner: req.user._id, active: true });
    const upcomingHarvests = growing
      .filter((c) => c.expectedHarvest)
      .sort((a, b) => a.expectedHarvest - b.expectedHarvest)
      .slice(0, 3)
      .map((c) => ({ name: c.name, date: c.expectedHarvest }));

    res.json({
      cropCount: crops.length,
      growingCount: growing.length,
      totalAcres,
      totalCost,
      projectedRevenue,
      projectedProfit: projectedRevenue - totalCost,
      costByType: Object.entries(costByType).map(([type, value]) => ({ type, value })),
      perCrop,
      upcomingHarvests,
      activeAlerts,
    });
  } catch (e) { next(e); }
});

module.exports = router;
