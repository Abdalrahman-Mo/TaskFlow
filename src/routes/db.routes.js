import { Router } from "express";
import pool from "../config/db.config.js";
const route = Router();

//! ### method: GET
//* ### endpoint: /api/db-check
//? ### description: Just checking the database connection
route.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    const data = result.rows[0];

    res.json({ data });
  } catch (err) {
    console.error("Database check failed:", err);

    return res.status(500).json({
      status: "ERROR",
      message: "Database check failed",
    });
  }
});

export default route;
