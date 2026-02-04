const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Car = require('../models/Car');
const UnavailableDate = require('../models/UnavailableDate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (file.mimetype === 'image/png') ? '.png' : (file.mimetype === 'image/jpeg' ? '.jpg' : path.extname(file.originalname) || '.jpg');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    cb(null, `car-${unique}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function normalizeCarImages(car) {
  const doc = car.toObject ? car.toObject() : car;
  const imageUrls = (doc.imageUrls && doc.imageUrls.length) ? doc.imageUrls : (doc.imageUrl ? [doc.imageUrl] : []);
  return { ...doc, imageUrls };
}

router.get('/', async (req, res) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json(cars.map(normalizeCarImages));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    res.json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, pricePerDay } = req.body;
    if (!name || pricePerDay == null) {
      return res.status(400).json({ error: 'Name and pricePerDay required' });
    }
    const car = await Car.create({
      name,
      description: description || '',
      pricePerDay: Number(pricePerDay),
      imageUrls: []
    });
    res.status(201).json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, pricePerDay } = req.body;
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { ...(name != null && { name }), ...(description != null && { description }), ...(pricePerDay != null && { pricePerDay: Number(pricePerDay) }) },
      { new: true }
    );
    if (!car) return res.status(404).json({ error: 'Car not found' });
    res.json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    await UnavailableDate.deleteMany({ carId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/upload', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    const url = `/uploads/${req.file.filename}`;
    if (!car.imageUrls || !Array.isArray(car.imageUrls)) car.imageUrls = car.imageUrl ? [car.imageUrl] : [];
    car.imageUrls.push(url);
    await car.save();
    res.json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/upload-many', requireAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    if (!car.imageUrls || !Array.isArray(car.imageUrls)) car.imageUrls = car.imageUrl ? [car.imageUrl] : [];
    req.files.forEach((f) => car.imageUrls.push(`/uploads/${f.filename}`));
    await car.save();
    res.json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Image url required' });
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    if (!car.imageUrls || !Array.isArray(car.imageUrls)) car.imageUrls = car.imageUrl ? [car.imageUrl] : [];
    car.imageUrls = car.imageUrls.filter((u) => u !== url);
    await car.save();
    res.json(normalizeCarImages(car));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
