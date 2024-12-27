const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../models/db");

// Admin registration
router.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Check if the username already exists
    const [existingAdmin] = await db.query("SELECT * FROM admins WHERE username = ?", [username]);
    if (existingAdmin.length > 0) {
      return res.status(409).json({ message: "Username already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new admin
    const query = "INSERT INTO admins (username, password, role) VALUES (?, ?, ?)";
    await db.query(query, [username, hashedPassword, role]);

    res.status(201).json({ message: "Admin registered successfully." });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Check if the admin exists
    const [admins] = await db.query("SELECT * FROM admins WHERE username = ?", [username]);
    if (admins.length === 0) {
      return res.status(404).json({ message: "Invalid username or password." });
    }

    const admin = admins[0];

    // Compare the password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Admin login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
  
    try {
      // Check if the admin exists
      const [admins] = await db.query("SELECT * FROM admins WHERE username = ?", [username]);
      if (admins.length === 0) {
        return res.status(404).json({ message: "Invalid username or password." });
      }
  
      const admin = admins[0];
  
      // Compare the password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password." });
      }
  
      // Generate a JWT token
      const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
  
      res.json({ message: "Login successful", token });
    } catch (error) {
      console.error("Error logging in admin:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  

module.exports = router;
