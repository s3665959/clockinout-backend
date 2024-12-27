const express = require("express");
const router = express.Router();
const db = require("../models/db");

// Fetch all stores
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM stores");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Add a new store
router.post("/", async (req, res) => {
  const { name, latitude, longitude } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ message: "All fields (name, latitude, longitude) are required." });
  }

  try {
    await db.query("INSERT INTO stores (name, latitude, longitude) VALUES (?, ?, ?)", [
      name,
      latitude,
      longitude,
    ]);
    res.status(201).json({ message: "Store added successfully." });
  } catch (error) {
    console.error("Error adding store:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Update a store
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ message: "All fields (name, latitude, longitude) are required." });
  }

  try {
    await db.query("UPDATE stores SET name = ?, latitude = ?, longitude = ? WHERE id = ?", [
      name,
      latitude,
      longitude,
      id,
    ]);
    res.json({ message: "Store updated successfully." });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Delete a store
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM stores WHERE id = ?", [id]);
    res.json({ message: "Store deleted successfully." });
  } catch (error) {
    console.error("Error deleting store:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});



  

module.exports = router;
