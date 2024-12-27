const db = require('../models/db');

// Check if employee's branch matches the store and distance is within allowed range
exports.recordClockInOut = async (req, res) => {
  const { user_id, latitude, longitude } = req.body;

  if (!user_id || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields (user_id, latitude, longitude) are required' });
  }

  try {
    // Check if the user is approved
    const [userRows] = await db.query('SELECT branch, status FROM registered WHERE userId = ?', [user_id]);
    if (userRows.length === 0) {
      return res.status(403).json({ message: 'User is not registered.' });
    }
    const { branch, status } = userRows[0];
    if (status !== 'approved') {
      return res.status(403).json({ message: 'User is not approved to clock in/out.' });
    }

    // Check if the branch matches a store
    const [storeRows] = await db.query('SELECT * FROM stores WHERE name = ?', [branch]);
    if (storeRows.length === 0) {
      return res.status(403).json({ message: `No store found for branch '${branch}'` });
    }
    const store = storeRows[0];

    // Check if the location is within 100 meters of the store
    const distance = Math.sqrt(
      Math.pow(store.latitude - latitude, 2) + Math.pow(store.longitude - longitude, 2)
    );
    if (distance > 0.1) {
      return res.status(403).json({ message: 'You are not within the allowed range to clock in/out.' });
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

      // Calculate total hours worked correctly
      const clockInTime = new Date(openRecord.clock_in);
      const totalMilliseconds = clockOutTime - clockInTime;
      const totalMinutes = totalMilliseconds / (1000 * 60); // Convert to minutes
      const totalHours = (totalMinutes / 60).toFixed(2); // Convert to hours and round to 2 decimals

      const updateQuery = 'UPDATE records SET clock_out = ?, total_hours = ? WHERE id = ?';
      const updateValues = [clockOutTime, totalHours, openRecord.id];
      await db.query(updateQuery, updateValues);

      return res.status(200).json({
        message: 'Clock-Out successful',
        clock_in: openRecord.clock_in,
        clock_out: clockOutTime,
        total_hours: totalHours,
      });
    }
  } catch (error) {
    console.error('Error handling Clock-In/Clock-Out:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Fetch records for a specific user by userId
exports.fetchEmployeeRecords = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const [records] = await db.query(
      "SELECT * FROM records WHERE user_id = ? ORDER BY clock_in ASC",
      [userId]
    );
    res.json(records);
  } catch (error) {
    console.error("Error fetching employee records:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};