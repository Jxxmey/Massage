const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGODB_URI;

// Middleware
app.use(express.json());
app.use(cors());

// เชื่อมต่อ MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err));

// --- Schemas และ Models ---

// Schema สำหรับยอดขาย (ปรับปรุง date)
const salesSchema = new mongoose.Schema({
  date: {
    _seconds: Number,
    _nanoseconds: Number
  },
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

// Schema สำหรับพนักงาน (ปรับปรุงตาม model ที่ให้มา)
const employeeSchema = new mongoose.Schema({
  _id: String, // ใช้ _id เป็นชื่อพนักงาน
  Name: String,
  Position: String
}, { collection: 'Employee' });
const Employee = mongoose.model('Employee', employeeSchema);

// Schema สำหรับกะงาน (เพิ่มเข้ามาใหม่ตาม model ที่ให้มา)
const shiftSchema = new mongoose.Schema({
  name: String,
  desc: String,
  active: Boolean,
  order: Number
}, { collection: 'Shift' });
const Shift = mongoose.model('Shift', shiftSchema);

// Schema สำหรับตารางกะงาน
const scheduleSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  schedule: Array,
  summary: Array,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'schedules' });
const Schedule = mongoose.model('Schedule', scheduleSchema);

// Schema สำหรับวันหยุดพิเศษ
const holidaySchema = new mongoose.Schema({
  date: String,
  th: String,
  en: String
}, { collection: 'holidays' });
const Holiday = mongoose.model('Holiday', holidaySchema);

// --- API Endpoints ---

// API สำหรับ Sales
app.get('/api/sales', async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = {};

  if (startDate && endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.date = {
          $gte: start,
          $lte: end
        };
    } catch (e) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  }

  try {
    const sales = await Sale.find(query).sort({ date: 1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Error fetching sales', error });
  }
});

// API สำหรับ Employee
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error });
  }
});

// API สำหรับ Shift (ใหม่)
app.get('/api/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find({}).sort({ order: 1 });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts', error });
  }
});

app.post('/api/shifts', async (req, res) => {
  try {
    const newShift = new Shift(req.body);
    const savedShift = await newShift.save();
    res.status(201).json(savedShift);
  } catch (error) {
    res.status(500).json({ message: 'Error saving shift', error });
  }
});

app.put('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedShift = await Shift.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedShift);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shift', error });
  }
});

app.delete('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Shift.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting shift', error });
  }
});

// ... ส่วนของ API Endpoints อื่นๆ (Schedules, Holidays) ที่มีอยู่แล้ว

// --- เริ่ม Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});