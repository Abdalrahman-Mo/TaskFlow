import { Router } from "express";
import pool from "../config/db.config.js";

const route = Router();

//! ### method: POST
//* ### endpoint: /api/projects
//? ### description: To create a new project for active user
route.post("/", async (req, res) => {
  const ownerId = req.session.userId;
  const { name, description } = req.body;
  try {
    if (!ownerId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Project name is required",
      });
    }
    const projectName = name.trim();
    const project = await pool.query(
      "INSERT INTO projects (name, description, owner_id) VALUES ($1,$2,$3) RETURNING *",
      [projectName, description ?? null, ownerId],
    );
    res.status(201).json({
      status: "OK",
      message: "Project created successfully!",
      project_details: project.rows[0],
    });
  } catch (err) {
    console.log("Inserting project error: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: GET
//* ### endpoint: /api/projects
//? ### description: To get all projects for active user
route.get("/", async (req, res) => {
  const ownerId = req.session.userId;
  try {
    if (!ownerId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    const project = await pool.query(
      "SELECT name, description, owner_id FROM projects WHERE owner_id=$1",
      [ownerId],
    );
    return res.status(200).json({
      status: "OK",
      project: project.rows,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: GET
//* ### endpoint: api/projects/:projectId
//? ### description: Get specific project for the active user
route.get("/:id", async (req, res) => {
  const id = req.params.id;
  const cur_user = req.session.userId;
  try {
    const result = await pool.query(
      "SELECT name, description FROM projects WHERE owner_id=$1 AND project_id=$2",
      [cur_user, id],
    );
    const project = result.rows[0];
    if (project) {
      return res.status(200).json({
        status: "OK",
        project,
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  } catch (err) {
    console.error("Error in fetching project: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: PATCH
//* ### endpoint: api/projects/:projectId
//? ### description: Update specific project for the active user
route.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const cur_user = req.session.userId;
  const { name, description } = req.body;
  try {
    if (!cur_user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const hasName = Object.hasOwn(req.body, "name");
    const hasDescription = Object.hasOwn(req.body, "description");

    if (!hasName && !hasDescription) {
      return res.status(400).json({
        status: "error",
        message: "No data provided to update",
      });
    }
    if (hasName && (typeof name !== "string" || name.trim())) {
      return res.status(400).json({
        status: "error",
        message: "Project name must be a non-empty string",
      });
    }
    if (
      hasDescription &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Project name must be a non-empty string",
      });
    }

    const result = await pool.query(
      `SELECT project_id, name, description
       FROM projects
       WHERE owner_id = $1 AND project_id = $2`,
      [cur_user, id],
    );

    const project = result.rows[0];

    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Not found",
      });
    }

    const newName = hasName ? name.trim() : project.name;
    const newDescription = hasDescription
      ? description === null
        ? null
        : description.trim()
      : project.description;

    const updatedProject = await pool.query(
      `UPDATE projects
       SET name = $1,
           description = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE owner_id = $3 AND project_id = $4
       RETURNING *`,
      [newName, newDescription, cur_user, id],
    );
    return res.status(200).json({
      status: "OK",
      message: "Project updated successfully",
      project: updatedProject.rows[0],
    });
  } catch (err) {
    console.error("Updating project error: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: DELETE
//* ### endpoint: api/projects/:projectId
//? ### description: Delete specific project for the active user
route.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const cur_user = req.session.userId;

  try {
    if (cur_user) {
      const project = await pool.query(
        "SELECT * FROM projects WHERE owner_id=$1 AND project_id=$2",
        [cur_user, id],
      );
      const isProjecExists = project.rows[0];
      if (isProjecExists) {
        await pool.query(
          "DELETE FROM projects WHERE owner_id=$1 AND project_id=$2",
          [cur_user, id],
        );
        return res.status(200).json({
          status: "OK",
          message: "Project deleted successfully",
        });
      }
      return res.status(400).json({
        status: "error",
        message: "Project does not exists",
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  } catch (err) {
    console.error("Deleting project error: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default route;
