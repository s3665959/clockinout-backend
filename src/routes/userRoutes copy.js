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
    // Check if the user is already registered
    const [existingUser] = await db.query('SELECT * FROM registered WHERE userId = ?', [userId]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User is already registered.' }); // Conflict status
    }

    // Insert the new user
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

// Fetch a single employee by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM registered WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Update an employee
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, branch, status, daily_rate, bonus, compensation, employee_type } = req.body;

  if (!fullName || !phone || !branch || !status || daily_rate === undefined || bonus === undefined || compensation === undefined || !employee_type) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
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
    const values = [fullName, phone, branch, status, daily_rate, bonus, compensation, employee_type, id];
    await db.query(query, values);

    res.json({ message: 'Employee updated successfully.' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Delete an employee
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM registered WHERE id = ?';
    await db.query(query, [id]);

    res.json({ message: 'Employee deleted successfully.' });
  } catch (error) {
    console.error('Error deleting employee:', error);
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
      // Fetch all employees with the branch field
      const [employees] = await db.query(
        'SELECT id, userId, fullName, branch, daily_rate, bonus, compensation FROM registered'
      );
  
      const payrollReport = [];
  
      for (const employee of employees) {
        // Fetch work records for the employee in the given period
        const [records] = await db.query(
          'SELECT total_hours FROM records WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?',
          [employee.userId, start_date, end_date]
        );
  
        let totalHours = 0; // Initialize total hours as a number
        let totalDaysWorked = 0; // Initialize total days worked as a number
  
        for (const record of records) {
          totalHours += parseFloat(record.total_hours || 0); // Safely add hours as a float
  
          if (record.total_hours > 5 && record.total_hours < 9) {
            totalDaysWorked += 0.5; // Half day
          } else if (record.total_hours >= 9) {
            totalDaysWorked += 1; // Full day
          }
        }
  
        // Calculate total days in the current period
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        const totalDaysInPeriod = Math.ceil(
          (endDateObj - startDateObj) / (1000 * 60 * 60 * 24)
        ) + 1; // +1 to include both start and end dates
  
        // Calculate total days in the current month
        const totalDaysInMonth = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 0).getDate(); // Get total days in the month
  
        let absenceDays = 0;
        let bonus = 0;
  
        // If calculating for the end of the month, include absence days and bonus
        const isEndOfMonthCalculation = endDateObj.getDate() === totalDaysInMonth;
  
        if (isEndOfMonthCalculation) {
          // Calculate absence days for the whole month
          absenceDays = totalDaysInMonth - totalDaysWorked;
  
          // Determine bonus eligibility (only if absence days <= 2 for the entire month)
          bonus = absenceDays <= 2 ? parseFloat(employee.bonus || 0) : 0;
        } else {
          // For partial periods, calculate absence days for the period only
          absenceDays = totalDaysInPeriod - totalDaysWorked;
  
          // Bonus is not applicable for partial periods
          bonus = 0;
        }
  
        // Calculate salary
        const salary = totalDaysWorked * parseFloat(employee.daily_rate || 0);
  
        // Add compensation (always included)
        const compensation = parseFloat(employee.compensation || 0);
  
        // Total pay
        const totalPay = isEndOfMonthCalculation
          ? salary + bonus + compensation
          : salary;
  
        // Insert into payroll table
        await db.query(
          'INSERT INTO payroll (employee_id, start_date, end_date, total_days_worked, total_hours_worked, salary, bonus, compensation, total_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            employee.id,
            start_date,
            end_date,
            totalDaysWorked,
            totalHours,
            salary,
            bonus,
            compensation,
            totalPay,
          ]
        );
  
        payrollReport.push({
          employee_id: employee.id,
          fullName: employee.fullName,
          branch: employee.branch, // Ensure this is included
          totalHours,
          totalDaysWorked,
          salary,
          bonus,
          compensation,
          totalPay,
          absenceDays, // Include absence days in the report
          totalDaysInPeriod,
          totalDaysInMonth,
        });
      }
  
      res.json(payrollReport);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  
// Fetch unique branches from the registered table
router.get("/branches", async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT DISTINCT branch FROM registered WHERE branch IS NOT NULL AND branch != ''"
      );
  
      // Log the rows for debugging (optional)
      console.log("Fetched branches:", rows);
  
      // Handle case when no branches are found
      if (rows.length === 0) {
        return res.status(404).json({ message: "No branches found." });
      }
  
      const branches = rows.map((row) => row.branch);
      res.json(branches); // Return branches as JSON response
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  

module.exports = router;
