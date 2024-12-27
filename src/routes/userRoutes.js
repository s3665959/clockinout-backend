const express = require('express');
const router = express.Router();
const db = require('../models/db'); // Import database connection

// Employee registration route
router.post('/register', async (req, res) => {
  const { userId, fullName, phone, branch } = req.body;

  if (!userId || !fullName || !phone || !branch) {
    return res.status(400).json({ message: 'All fields (userId, fullName, phone, branch) are required.' });
  }

  try {
    const [existingUser] = await db.query('SELECT * FROM registered WHERE userId = ?', [userId]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User is already registered.' });
    }

    const query = 'INSERT INTO registered (userId, fullName, phone, branch, status) VALUES (?, ?, ?, ?, ?)';
    const values = [userId, fullName, phone, branch, 'pending'];
    await db.query(query, values);

    res.status(201).json({ message: 'Registration successful. Waiting for approval.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch all employees
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM registered');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


// Update an employee's details (PUT)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
      fullName,
      phone,
      branch,
      status,
      daily_rate,
      bonus,
      compensation,
      employee_type,
    } = req.body;
  
    // Validate required fields
    if (
      !fullName ||
      !phone ||
      !branch ||
      !status ||
      daily_rate === undefined ||
      bonus === undefined ||
      compensation === undefined ||
      !employee_type
    ) {
      return res.status(400).json({
        message: 'All fields (fullName, phone, branch, status, daily_rate, bonus, compensation, employee_type) are required.',
      });
    }
  
    try {
      // Update employee in the database
      const query = `
        UPDATE registered 
        SET fullName = ?, 
            phone = ?, 
            branch = ?, 
            status = ?, 
            daily_rate = ?, 
            bonus = ?, 
            compensation = ?, 
            employee_type = ? 
        WHERE id = ?`;
      const values = [
        fullName,
        phone,
        branch,
        status,
        daily_rate,
        bonus,
        compensation,
        employee_type,
        id,
      ];
  
      await db.query(query, values);
  
      res.json({ message: 'Employee updated successfully.' });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      // Delete related records in the 'payroll' table
      await db.query('DELETE FROM payroll WHERE employee_id = ?', [id]);
  
      // Delete related records in the 'records' table
      await db.query('DELETE FROM records WHERE user_id = (SELECT userId FROM registered WHERE id = ?)', [id]);
  
      // Delete the employee from the 'registered' table
      const query = 'DELETE FROM registered WHERE id = ?';
      await db.query(query, [id]);
  
      res.json({ message: 'Employee deleted successfully.' });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  
  
// Fetch branches (unique branch names)
router.get('/branches', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT branch FROM registered');
    const branches = rows.map((row) => row.branch);
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Payroll calculation for a given period
router.post('/calculate-payroll', async (req, res) => {
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ message: 'Start date and end date are required.' });
  }

  try {
    const [employees] = await db.query(
      'SELECT id, userId, fullName, branch, daily_rate, bonus, compensation FROM registered'
    );

    const payrollReport = [];

    for (const employee of employees) {
      const [records] = await db.query(
        'SELECT total_hours FROM records WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?',
        [employee.userId, start_date, end_date]
      );

      let totalHours = 0;
      let totalDaysWorked = 0;

      for (const record of records) {
        totalHours += parseFloat(record.total_hours || 0);
        if (record.total_hours > 5 && record.total_hours < 9) {
          totalDaysWorked += 0.5;
        } else if (record.total_hours >= 9) {
          totalDaysWorked += 1;
        }
      }

      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const totalDaysInPeriod = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

      const totalDaysInMonth = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 0).getDate();

      let absenceDays = 0;
      let bonus = 0;

      const isEndOfMonthCalculation = endDateObj.getDate() === totalDaysInMonth;

      if (isEndOfMonthCalculation) {
        absenceDays = totalDaysInMonth - totalDaysWorked;
        bonus = absenceDays <= 2 ? parseFloat(employee.bonus || 0) : 0;
      } else {
        absenceDays = totalDaysInPeriod - totalDaysWorked;
        bonus = 0;
      }

      const salary = totalDaysWorked * parseFloat(employee.daily_rate || 0);
      const compensation = parseFloat(employee.compensation || 0);
      const totalPay = isEndOfMonthCalculation ? salary + bonus + compensation : salary;

      payrollReport.push({
        employee_id: employee.id,
        fullName: employee.fullName,
        branch: employee.branch,
        totalHours,
        totalDaysWorked,
        salary,
        bonus,
        compensation,
        totalPay,
        absenceDays,
      });
    }

    res.json(payrollReport);
  } catch (error) {
    console.error('Error calculating payroll:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch a single employee by userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM registered WHERE userId = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user by userId:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
module.exports = router;
