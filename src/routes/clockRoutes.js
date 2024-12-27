const express = require('express');
const router = express.Router();
const clockController = require('../controllers/clockController');
const db = require('../models/db'); // Ensure the db connection is imported here

// Route for Clock-In/Clock-Out
router.post('/clock', clockController.recordClockInOut);

// Route for fetching all records
router.get('/records', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM records'); // Fetch all records from the database
    res.json(rows); // Return the records as JSON
  } catch (error) {
    console.error('Error fetching records:', error); // Log the error
    res.status(500).json({ message: 'Internal server error.' }); // Send error response
  }
});


// Route for fetching records for a specific user
router.get("/records/:userId", clockController.fetchEmployeeRecords);

module.exports = router;
