const router = require('express').Router();
const Advisory = require('../models/Advisory');
const { protect } = require('../middleware/auth');
const { runAgent } = require('../services/agent');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    res.json(await Advisory.find({ owner: req.user._id }).select('title updatedAt').sort({ updatedAt: -1 }).limit(30));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const a = await Advisory.findOne({ _id: req.params.id, owner: req.user._id });
    if (!a) return res.status(404).json({ message: 'Not found' });
    res.json(a);
  } catch (e) { next(e); }
});

// Send a message; creates a conversation when id is "new"
router.post('/:id/message', async (req, res, next) => {
  try {
    const text = (req.body.message || '').trim();
    if (!text) return res.status(400).json({ message: 'Message is required' });
    let conv = req.params.id === 'new' ? null : await Advisory.findOne({ _id: req.params.id, owner: req.user._id });
    if (!conv) conv = new Advisory({ owner: req.user._id, title: text.slice(0, 50) });
    conv.messages.push({ role: 'user', content: text });
    const history = conv.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const { reply, toolsUsed } = await runAgent(history, req.user);
    conv.messages.push({ role: 'assistant', content: reply, toolsUsed });
    await conv.save();
    res.json({ id: conv._id, reply, toolsUsed });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Advisory.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
