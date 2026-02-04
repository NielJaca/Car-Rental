require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const exists = await Admin.findOne({ username: 'admin' });
  if (exists) {
    console.log('Admin already exists');
    process.exit(0);
    return;
  }
  await Admin.create({ username: 'admin', password: 'admin123' });
  console.log('Admin created: username=admin, password=admin123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
