const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGO_URI;

// Middleware
app.use(express.json());
app.use(cors());

// ตรวจสอบ Mongo URI
if (!mongoURI) {
  console.error('❌ MONGODB_URI is not set in environment variables. Please configure it on Render.');
  process.exit(1);
}

// เชื่อมต่อ MongoDB
mongoose.connect(mongoURI, { dbName: 'UBMassage' })
  .then(() => console.log('✅ Connected to MongoDB, using database UBMassage'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err.message));

// --- Schemas ---
const salesSchema = new mongoose.Schema({
  date: Date, // ใช้ Date ตรงๆ แทน object _seconds/_nanoseconds
  staffOil: Number,
  customers: Number,
  income: Number,
  commission: Number,
  extraCommission: Number,
  expense: Number,
  creditCard: Number,
  cash: Number,
  timeWork: String
}, { collection: 'sales' });
const Sale = mongoose.model('Sale', salesSchema);

const employeeSchema = new mongoose.Schema({
  name: String,
  position: String
}, { collection: 'Employee' });
const Employee = mongoose.model('Employee', employeeSchema);

const shiftSchema = new mongoose.Schema({
  name: String,
  desc: String,
  active: Boolean,
  order: Number
}, { collection: 'Shift' });
const Shift = mongoose.model('Shift', shiftSchema);

const scheduleSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  schedule: Array,
  summary: Array,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'schedules' });

scheduleSchema.index({ year: 1, month: 1 }, { unique: true }); // ป้องกันซ้ำ
const Schedule = mongoose.model('Schedule', scheduleSchema);

// --- Middleware ตรวจสอบ DB ---
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connection is not available. Please try again later.' });
  }
  next();
};

// --- API Sales ---
app.get('/api/sales', checkDbConnection, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const sales = await Sale.find(query).sort({ date: 1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});

// --- API Employees ---
app.get('/api/employees', checkDbConnection, async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

// --- API Shifts ---
app.get('/api/shifts', checkDbConnection, async (req, res) => {
  try {
    const shifts = await Shift.find({}).sort({ order: 1 });
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ message: 'Error fetching shifts', error: error.message });
  }
});

app.post('/api/shifts', checkDbConnection, async (req, res) => {
  try {
    const newShift = new Shift(req.body);
    const savedShift = await newShift.save();
    res.status(201).json(savedShift);
  } catch (error) {
    console.error('Error saving shift:', error);
    res.status(500).json({ message: 'Error saving shift', error: error.message });
  }
});

// --- API Schedules ---
app.get('/api/schedules/:year/:month', checkDbConnection, async (req, res) => {
  try {
    const { year, month } = req.params;
    const schedule = await Schedule.findOne({ year: parseInt(year), month: parseInt(month) });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Error fetching schedule', error: error.message });
  }
});

app.post('/api/schedules', checkDbConnection, async (req, res) => {
  try {
    const { year, month, schedule, summary } = req.body;
    if (year === undefined || month === undefined) {
      return res.status(400).json({ message: 'Missing year or month in request body' });
    }

    // ลบ createdAt ที่มาจาก frontend
    if (req.body.createdAt) delete req.body.createdAt;

    const updated = await Schedule.findOneAndUpdate(
      { year, month },
      { schedule, summary },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(updated);
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ message: 'Error saving schedule', error: error.message });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
