import { Router } from "express";
import pool from "../config/db.config.js";

const route = Router();

//! ### method: POST
//* ### endpoint: /api/projects/:project_id/tasks
//? ### description: To create task for specific project
route.post("/:id/tasks", async (req, res) => {
  const projectId = req.params.id;
  const cur_user = req.session.userId;
  const { title, description, status, priority, assigned_to, due_date } =
    req.body;

  try {
    if (!cur_user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const project_result = await pool.query(
      "SELECT * FROM projects WHERE owner_id=$1 AND project_id=$2",
      [cur_user, projectId],
    );
    const project = project_result.rows[0];

    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Title must be non-empty string",
      });
    }
    const allowed_status = ["todo", "in_progress", "done"];
    const allowed_priority = ["high", "medium", "low"];
    if (status !== undefined && !allowed_status.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status must be todo, in_progress, or done",
      });
    }
    if (priority !== undefined && !allowed_priority.includes(priority)) {
      return res.status(400).json({
        status: "error",
        message: "Priority must be low, medium, or high",
      });
    }
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Description must be a string or null",
      });
    }
    const check_assigned_to = await pool.query(
      "SELECT * FROM users WHERE user_id=$1",
      [assigned_to],
    );
    if (!check_assigned_to.rows[0]) {
      return res.status(404).json({
        status: "error",
        message: "Assigned user not found",
      });
    }
    if (due_date !== undefined && due_date !== null) {
      const parsedDate = new Date(due_date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Due date must be a valid date",
        });
      }
    }
    const parsedDate = due_date ? new Date(due_date) : null;
    const task = await pool.query(
      "INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        projectId,
        title,
        description || null,
        status ?? "todo",
        priority ?? "medium",
        assigned_to || null,
        cur_user,
        parsedDate,
      ],
    );
    return res.status(201).json({
      status: "OK",
      message: "Task created successfully",
      task: task.rows[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default route;
