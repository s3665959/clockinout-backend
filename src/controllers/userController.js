const db = require('../models/db');

exports.registerUser = async (req, res) => {
  const { userId, fullName, phone, branch, employeePhone } = req.body;
  try {
    await db.query('INSERT INTO registered (userId, fullName, phone, branch, employeePhone, status) VALUES (?, ?, ?, ?, ?, ?)', [
      userId, fullName, phone, branch, employeePhone, 'pending',
    ]);
    res.status(201).send('User Registered');
  } catch (error) {
    res.status(500).send(error.message);
  }
};

