const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

// Get all events for user
router.get('/', protect, async (req, res) => {
  try {
    const { sort = 'date', order = 'desc', tag, mood } = req.query;
    const query = { user: req.user._id };
    if (tag) query.tags = tag;
    if (mood) query.mood = mood;

    // Check Vault Token
    let vaultUnlocked = false;
    const vaultToken = req.headers['x-vault-token'];
    if (vaultToken) {
      try {
        const decoded = jwt.verify(vaultToken, process.env.JWT_SECRET || 'fallback_secret_key_change_in_prod');
        if (decoded.id === req.user._id.toString() && decoded.vault) {
          vaultUnlocked = true;
        }
      } catch (e) {
        // invalid vault token, ignore
      }
    }

    // Hide private events unless vault is unlocked
    if (!vaultUnlocked) {
      query.isPrivate = { $ne: true };
    }

    let sortObj = {};
    if (sort === 'date') sortObj = { date: order === 'asc' ? 1 : -1 };
    else if (sort === 'sortIndex') sortObj = { sortIndex: 1 };
    else sortObj = { createdAt: -1 };

    const events = await Event.find(query).sort(sortObj);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single event
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create event
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, date, location, mood, media, tags, people, audioUrl, unlockDate, color, nodePosition, isPrivate, coordinates } = req.body;
    const count = await Event.countDocuments({ user: req.user._id });
    const event = await Event.create({
      user: req.user._id,
      title,
      description,
      date,
      location,
      mood,
      media: media || [],
      tags: tags || [],
      people: people || [],
      audioUrl: audioUrl || '',
      unlockDate,
      coordinates,
      color: color || '#6366f1',
      sortIndex: count,
      nodePosition: nodePosition || { x: Math.random() * 600, y: Math.random() * 400 },
      isPrivate: isPrivate || false,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event
router.put('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const updates = req.body;
    Object.assign(event, updates);
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete event
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reorder events (drag & drop)
router.put('/reorder/bulk', protect, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: { filter: { _id: id, user: req.user._id }, update: { sortIndex: index } }
    }));
    await Event.bulkWrite(bulkOps);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
