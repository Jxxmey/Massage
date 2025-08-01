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
  // กำหนด _id ให้เป็น String เพื่อรองรับข้อมูลเดิมจาก Firestore
  _id: { type: String, required: true },
  // กำหนด date ให้เป็น Object เพื่อรองรับข้อมูลเดิมจาก Firestore
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
  _id: { type: String, required: true },
  Name: { type: String, required: true },
  Position: { type: String, default: "พนักงาน" }
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

scheduleSchema.index({ year: 1, month: 1 }, { unique: true });
const Schedule = mongoose.model('Schedule', scheduleSchema);

// --- Middleware ตรวจสอบ DB ---
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connection is not available. Please try again later.' });
  }
  next();
};

// --- API Sales (ไม่เปลี่ยนแปลง) ---
app.get('/api/sales', checkDbConnection, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      const startSeconds = new Date(startDate).getTime() / 1000;
      const endSeconds = new Date(endDate).getTime() / 1000 + (24 * 60 * 60);
      query['date._seconds'] = { $gte: startSeconds, $lte: endSeconds };
    }
    const sales = await Sale.find(query).sort({ 'date._seconds': 1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});
app.post('/api/sales', checkDbConnection, async (req, res) => {
  try {
    const newSale = new Sale(req.body);
    const savedSale = await newSale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    console.error('Error saving sale:', error);
    res.status(500).json({ message: 'Error saving sale', error: error.message });
  }
});
app.put('/api/sales/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSale = await Sale.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedSale) {
      return res.status(404).json({ message: 'Sale entry not found' });
    }
    res.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ message: 'Error updating sale', error: error.message });
  }
});
app.get('/api/sales/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale entry not found' });
    }
    res.json(sale);
  } catch (error) {
    console.error('Error fetching single sale:', error);
    res.status(500).json({ message: 'Error fetching single sale', error: error.message });
  }
});
app.delete('/api/sales/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSale = await Sale.findByIdAndDelete(id);
    if (!deletedSale) {
      return res.status(404).json({ message: 'Sale entry not found' });
    }
    res.status(200).json({ message: 'Sale entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ message: 'Error deleting sale', error: error.message });
  }
});

// --- API Employees (แก้ไข) ---
app.get('/api/employees', checkDbConnection, async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

app.post('/api/employees', checkDbConnection, async (req, res) => {
  try {
    const { Name, Position } = req.body;
    if (!Name) {
      return res.status(400).json({ message: 'Employee Name is required.' });
    }
    // สร้าง _id จาก Name
    const newEmployee = new Employee({
      _id: Name,
      Name: Name,
      Position: Position || 'พนักงาน'
    });
    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error('Error saving employee:', error);
    res.status(500).json({ message: 'Error saving employee', error: error.message });
  }
});

// ** เพิ่ม API สำหรับแก้ไขข้อมูลพนักงาน **
app.put('/api/employees/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Position } = req.body;
    
    // ถ้ามีการแก้ไขชื่อ ต้องลบอันเก่าและสร้างอันใหม่
    if (id !== Name) {
      const oldEmployee = await Employee.findById(id);
      if (oldEmployee) {
        await Employee.findByIdAndDelete(id);
      }
      const newEmployee = new Employee({ _id: Name, Name, Position });
      const savedEmployee = await newEmployee.save();
      return res.json(savedEmployee);
    }

    // ถ้าแก้ไขแค่ Position
    const updatedEmployee = await Employee.findByIdAndUpdate(id, { Name, Position }, { new: true, runValidators: true });
    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
});

// ** เพิ่ม API สำหรับดึงข้อมูลพนักงานรายบุคคล **
app.get('/api/employees/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Error fetching single employee:', error);
    res.status(500).json({ message: 'Error fetching single employee', error: error.message });
  }
});

app.delete('/api/employees/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
});

// --- API Shifts (ไม่เปลี่ยนแปลง) ---
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

// --- API Schedules (ไม่เปลี่ยนแปลง) ---
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