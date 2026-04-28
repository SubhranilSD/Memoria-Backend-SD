const express = require('express');
const router = express.Router();
const FaceCluster = require('../models/FaceCluster');
const { protect } = require('../middleware/auth');

// Get saved people data for user
router.get('/', protect, async (req, res) => {
  try {
    const data = await FaceCluster.findOne({ user: req.user._id });
    if (!data) return res.json({ clusters: [], groups: [], birthdays: {} });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save/Update people data
router.post('/', protect, async (req, res) => {
  try {
    const { clusters, groups, birthdays } = req.body;
    
    const data = await FaceCluster.findOneAndUpdate(
      { user: req.user._id },
      { 
        clusters, 
        groups, 
        birthdays,
        updatedAt: Date.now() 
      },
      { upsert: true, new: true }
    );
    
    res.json(data);
  } catch (err) {
    console.error("SAVE PEOPLE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
