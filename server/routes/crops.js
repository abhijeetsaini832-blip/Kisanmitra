const router = require('express').Router();
const Crop = require('../models/Crop');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    res.json(await Crop.find({ owner: req.user._id }).sort({ createdAt: -1 }));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const crop = await Crop.create({ ...req.body, owner: req.user._id });
    res.status(201).json(crop);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { owner, logs, ...rest } = req.body;
    const crop = await Crop.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, rest, { new: true, runValidators: true });
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    res.json(crop);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const crop = await Crop.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.post('/:id/logs', async (req, res, next) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    crop.logs.push(req.body);
    await crop.save();
    res.status(201).json(crop);
  } catch (e) { next(e); }
});

module.exports = router;
