const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// ใช้ Environment Variable สำหรับ URL ของ MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err));

// Schema และ Model สำหรับตารางกะงาน
const scheduleSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  schedule: Array,
  summary: Array,
  createdAt: { type: Date, default: Date.now }
});
const Schedule = mongoose.model('Schedule', scheduleSchema);

// Schema และ Model สำหรับยอดขาย
const salesSchema = new mongoose.Schema({
  date: Date,
  staffOil: Number,
  customers: Number,
  income: Number,
  commission: Number,
  extraCommission: Number,
  expense: Number,
  creditCard: Number,
  cash: Number,
  timeWork: String
});
const Sale = mongoose.model('Sale', salesSchema);

// Schema และ Model สำหรับพนักงาน
const employeeSchema = new mongoose.Schema({
  name: String // เปลี่ยนจาก Name เป็น name เพื่อให้สอดคล้องกับมาตรฐาน
});
const Employee = mongoose.model('Employee', employeeSchema);

// Schema และ Model สำหรับวันหยุดพิเศษ
const holidaySchema = new mongoose.Schema({
  date: String,
  th: String,
  en: String
});
const Holiday = mongoose.model('Holiday', holidaySchema);

// API Endpoints สำหรับตารางกะงาน
app.get('/api/schedules/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const schedule = await Schedule.findOne({ year, month });
  res.json(schedule);
});

app.post('/api/schedules', async (req, res) => {
  const { month, year, schedule, summary } = req.body;
  const id = { year, month };
  try {
    const doc = await Schedule.findOneAndUpdate(id, { schedule, summary }, { new: true, upsert: true });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Error saving schedule', error });
  }
});

app.get('/api/holidays', async (req, res) => {
  const holidays = await Holiday.find({});
  res.json(holidays);
});

// API Endpoints สำหรับจัดการพนักงาน
app.get('/api/employees', async (req, res) => {
  const employees = await Employee.find({});
  res.json(employees);
});

app.post('/api/employees', async (req, res) => {
  try {
    const newEmployee = new Employee(req.body);
    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    res.status(500).json({ message: 'Error saving employee', error });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error });
  }
});

// API Endpoints สำหรับยอดขาย
app.get('/api/sales', async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  const sales = await Sale.find(query).sort({ date: 1 });
  res.json(sales);
});

app.post('/api/sales', async (req, res) => {
  try {
    const newSale = new Sale(req.body);
    const savedSale = await newSale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    res.status(500).json({ message: 'Error saving sale', error });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedSale = await Sale.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: 'Error updating sale', error });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Sale.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sale', error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});