const express = require('express');
const router = express.Router();
const clockController = require('../controllers/clockController');


// Route for Clock-In/Clock-Out
router.post('/clock', clockController.recordClockInOut);

// Route for fetching all records
router.get("/records", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM records");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
