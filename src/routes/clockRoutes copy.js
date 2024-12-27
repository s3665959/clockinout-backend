const express = require('express');
const router = express.Router();
const db = require('../models/db'); // Database connection

// Route for Clock-In/Clock-Out
router.post('/clock', async (req, res) => {
  const { user_id, latitude, longitude } = req.body;

  if (!user_id || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields (user_id, latitude, longitude) are required' });
  }

  try {
    // Check if the user is approved
    const [userRows] = await db.query('SELECT status FROM registered WHERE userId = ?', [user_id]);
    if (userRows.length === 0) {
      return res.status(403).json({ message: 'User is not registered.' });
    }
    if (userRows[0].status !== 'approved') {
      return res.status(403).json({ message: 'User is not approved to clock in/out.' });
    }

    // Check for an open record (clock_out IS NULL)
    const [recordRows] = await db.query(
      'SELECT * FROM records WHERE user_id = ? AND clock_out IS NULL',
      [user_id]
    );

    if (recordRows.length === 0) {
      // No open record → Clock-In
      const clockInTime = new Date();
      const query = 'INSERT INTO records (user_id, clock_in, latitude, longitude) VALUES (?, ?, ?, ?)';
      const values = [user_id, clockInTime, latitude, longitude];
      await db.query(query, values);

      return res.status(201).json({ message: 'Clock-In successful', clock_in: clockInTime });
    } else {
      // Open record exists → Clock-Out
      const clockOutTime = new Date();
      const openRecord = recordRows[0];

      // Calculate total hours worked
      const clockInTime = new Date(openRecord.clock_in);
      const totalMilliseconds = clockOutTime - clockInTime; // Difference in milliseconds
      const totalHours = totalMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours

      const updateQuery = 'UPDATE records SET clock_out = ?, total_hours = ? WHERE id = ?';
      const updateValues = [clockOutTime, totalHours.toFixed(2), openRecord.id];
      await db.query(updateQuery, updateValues);

      return res.status(200).json({
        message: 'Clock-Out successful',
        clock_in: openRecord.clock_in,
        clock_out: clockOutTime,
        total_hours: totalHours.toFixed(2),
      });
    }
  } catch (error) {
    console.error('Error handling Clock-In/Clock-Out:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

  

module.exports = router;
