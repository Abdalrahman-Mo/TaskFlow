import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/db.config.js";

const route = Router();
const salt_rounds = Number(process.env.SALT_ROUNDS) || 10;

//! ### method: POST
//* ### endpoint: /api/auth/register
//? ### description: To register a new user
route.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Bad Request",
      });
    }
    const password_hash = await bcrypt.hash(password, salt_rounds);
    await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3)",
      [name, email, password_hash],
    );

    res.status(201).json({
      message: "User registered successfully!",
      user: {
        name,
        email,
      },
    });
  } catch (err) {
    if (err.code == "23505") {
      return res.status(409).json({
        message: "User already exists",
      });
    }
    console.error(err);
    res.status(500).json({
      message: "Internal server Error",
    });
  }
});

//! ### method: POST
//* ### endpoint: /api/auth/login
//? ### description: To let user login
route.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Bad Request",
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      "SELECT user_id, name, email, password_hash FROM users WHERE email=$1",
      [normalizedEmail],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }
    const password_hash = user?.password_hash;
    const is_valid = await bcrypt.compare(password, password_hash);
    if (is_valid) {
      req.session.userId = user.user_id;
      return res.status(200).json({
        status: "OK",
        message: "User logged-in successfully",
        user: {
          name: user.name,
          email: user.email,
        },
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Invalid email or password",
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
    });
  }
});

//! ### method: GET
//* ### endpoint: /api/auth/me
//? ### description: To get profile for active user
route.get("/me", async (req, res) => {
  try {
    const user_session = req.session.userId;
    if (user_session) {
      const result = await pool.query(
        "SELECT user_id, name, email FROM users WHERE user_id=$1",
        [user_session],
      );
      const user = result.rows[0];
      if (user) {
        return res.status(200).json({
          status: "OK",
          message: "session still running",
          payload: {
            name: user.name,
            email: user.email,
          },
        });
      } else {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized user",
        });
      }
    }
    return res.status(401).json({
      status: "error",
      message: "Unauthorized user",
    });
  } catch (err) {
    console.error("Authentication Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
    });
  }
});

//! ### method: POST
//* ### endpoint: /api/auth
//? ### description: To logout the user and ends its session
route.post("/logout", (req, res) => {
  if (!req.session) {
    return res.status(400).json({
      status: "error",
      message: "No active session found",
    });
  }
  const cookieName = "connect.sid";
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({
        status: "error",
        message: "Could not log out, please try again.",
      });
    }
    return res.status(200).clearCookie(cookieName).json({
      status: "OK",
      message: "Logged out successfully",
    });
  });
});
export default route;
