const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Upload endpoint - returns placeholder for demo
// In production, integrate with Cloudinary or AWS S3
router.post('/', protect, async (req, res) => {
  try {
    const { base64, thumbnailBase64, filename } = req.body;
    // In production: upload both to Cloudinary
    // const result = await cloudinary.uploader.upload(base64, { folder: 'memory-timeline' });
    // const thumbResult = await cloudinary.uploader.upload(thumbnailBase64, { folder: 'memory-timeline-thumbs' });
    // res.json({ url: result.secure_url, thumbnailUrl: thumbResult.secure_url, publicId: result.public_id });

    // For demo, return the base64 strings
    res.json({
      url: base64,
      thumbnailUrl: thumbnailBase64 || base64,
      publicId: `demo_${Date.now()}`,
      type: 'image'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
