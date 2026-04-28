const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Upload endpoint - returns placeholder for demo
// In production, integrate with Cloudinary or AWS S3
router.post('/', protect, async (req, res) => {
  try {
    const { base64, filename } = req.body;
    // In production: upload to Cloudinary
    // const result = await cloudinary.uploader.upload(base64, { folder: 'memory-timeline' });
    // res.json({ url: result.secure_url, publicId: result.public_id });

    // For demo, return the base64 as URL
    res.json({
      url: base64,
      publicId: `demo_${Date.now()}`,
      type: 'image'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
