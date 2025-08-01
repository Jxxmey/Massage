const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 10000;
const mongoURI = process.env.MONGO_URI;

// Middleware
app.use(express.json());
app.use(cors());

// ตรวจสอบว่ามี mongoURI ถูกตั้งค่าหรือไม่
if (!mongoURI) {
  console.error('❌ MONGODB_URI is not set in environment variables. Please configure it on Render.');
  process.exit(1); // Exit the process if a critical environment variable is missing
}

// เชื่อมต่อ MongoDB
// เพิ่ม dbName เข้าไปในตัวเลือก เพื่อระบุ database ที่ต้องการใช้ให้ชัดเจน
mongoose.connect(mongoURI, { dbName: 'UBMassage' })
  .then(() => console.log('✅ Connected to MongoDB, using database UBMassage'))
  .catch(err => {
    console.error('❌ Could not connect to MongoDB:', err.message);
    // Exit the application if database connection fails
    // This is optional, but helps to prevent the server from running without a database connection
    // process.exit(1); 
  });

// --- Schemas และ Models ---

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

const employeeSchema = new mongoose.Schema({
  _id: String,
  Name: String,
  Position: String
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
const Schedule = mongoose.model('Schedule', scheduleSchema);


// --- API Endpoints ---
// เพิ่ม Middleware สำหรับตรวจสอบสถานะการเชื่อมต่อฐานข้อมูล
const checkDbConnection = (req, res, next) => {
  // 1 = connected
  if (mongoose.connection.readyState !== 1) { 
    return res.status(503).json({ message: 'Database connection is not available. Please try again later.' });
  }
  next();
};

// API สำหรับ Sales
app.get('/api/sales', checkDbConnection, async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = {};
  if (startDate && endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.date = { $gte: start, $lte: end };
    } catch (e) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  }
  try {
    const sales = await Sale.find(query).sort({ date: 1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});

// API สำหรับ Employee
app.get('/api/employees', checkDbConnection, async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

// API สำหรับ Shift
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

app.put('/api/shifts/:id', checkDbConnection, async (req, res) => {
  const { id } = req.params;
  try {
    const updatedShift = await Shift.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ message: 'Error updating shift', error: error.message });
  }
});

app.delete('/api/shifts/:id', checkDbConnection, async (req, res) => {
  const { id } = req.params;
  try {
    await Shift.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ message: 'Error deleting shift', error: error.message });
  }
});


// API สำหรับ Schedules
app.get('/api/schedules/:year/:month', checkDbConnection, async (req, res) => {
    try {
        const { year, month } = req.params;
        const schedule = await Schedule.findOne({ year: year, month: month });
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }
        res.json(schedule);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Error fetching schedule', error: error.message });
    }
});

app.post('/api/schedules', checkDbConnection, async (req, res) => {
    try {
        const { month, year, schedule } = req.body;
        
        // Find an existing schedule document by year and month
        let existingSchedule = await Schedule.findOne({ year: year, month: month });

        if (existingSchedule) {
            // If exists, update the schedule array. Do NOT touch other fields.
            existingSchedule.schedule = schedule;
            
            const updatedSchedule = await existingSchedule.save();
            return res.json(updatedSchedule);
        } else {
            // If not exists, create a new one with a clear payload.
            const newSchedule = new Schedule({
                month,
                year,
                schedule
                // summary is not needed in the new payload, it can be an empty array by default if specified in schema
            });
            const savedSchedule = await newSchedule.save();
            res.status(201).json(savedSchedule);
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({ message: 'Error saving schedule', error: error.message });
    }
});

// --- เริ่ม Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});