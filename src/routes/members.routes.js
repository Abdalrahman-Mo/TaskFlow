import { Router } from "express";
import pool from "../config/db.config.js";

const route = Router();

//! ### method: POST
//* ### endpoint: /api/projects/:PROJECT_ID/members
//? ### description: Add a member to current user specific project
route.post("/:id/members", async (req, res) => {
  const projectId = req.params.id;
  const cur_user = req.session.userId;
  const { email, role } = req.body;
  try {
    if (!cur_user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    const result_project = await pool.query(
      "SELECT project_id, name, description FROM projects WHERE project_id=$1 AND owner_id=$2",
      [projectId, cur_user],
    );
    const project = result_project.rows[0];

    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    const hasEmail = Object.hasOwn(req.body, "email");
    const hasRole = Object.hasOwn(req.body, "role");

    if (!hasEmail) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Email must be non-empty string",
      });
    }

    if (!hasRole) {
      return res.status(400).json({
        status: "error",
        message: "Role is required",
      });
    }

    if (role !== "admin" && role !== "member") {
      return res.status(400).json({
        status: "error",
        message: "Role must be either 'admin' or 'member'",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result_user = await pool.query(
      "SELECT user_id, name, email FROM users WHERE email=$1",
      [normalizedEmail],
    );
    const invitedUser = result_user.rows[0];

    if (!invitedUser) {
      return res.status(404).json({
        status: "error",
        message: "Invited user not found",
      });
    }

    const membership = await pool.query(
      "INSERT INTO memberships (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING membership_id, project_id, user_id, role, created_at",
      [projectId, invitedUser.user_id, role],
    );
    return res.status(201).json({
      status: "OK",
      message: "Membership has created successfully",
      membership: membership.rows[0],
    });
  } catch (err) {
    console.error("Adding member to project error: ", err);
    if (err.code == "23505") {
      return res.status(409).json({
        status: "error",
        message: "memebership already exists",
      });
    }
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: GET
//* ### endpoint: /api/projects/:PROJECT_ID/members
//? ### description: Get all members working on a specific project for the current user
route.get("/:id/members", async (req, res) => {
  const projectId = req.params.id;
  const cur_user = req.session.userId;
  try {
    if (!cur_user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    const result_project = await pool.query(
      "SELECT project_id, name, description FROM projects WHERE project_id=$1 AND owner_id=$2",
      [projectId, cur_user],
    );
    const project = result_project.rows[0];

    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }
    const result_members = await pool.query(
      "SELECT m.membership_id, m.user_id, u.name, u.email, m.role, m.created_at FROM memberships AS m JOIN users AS u ON m.user_id = u.user_id WHERE m.project_id = $1 ORDER BY m.created_at ASC;",
      [projectId],
    );
    const members = result_members.rows;

    return res.status(200).json({
      status: "OK",
      members,
    });
  } catch (err) {
    console.error("Get project's members error: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//! ### method: DELETE
//* ### endpoint: /api/projects/:PROJECT_ID/members/:USERS_ID
//? ### description: Remove a member from a project
route.delete("/:id/members/:member_id", async (req, res) => {
  const { id, member_id } = req.params;
  const cur_user = req.session.userId;
  try {
    if (!cur_user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    const result_project = await pool.query(
      "SELECT project_id, name, description FROM projects WHERE project_id=$1 AND owner_id=$2",
      [id, cur_user],
    );
    const project = result_project.rows[0];
    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }
    const deleted_membership_result = await pool.query(
      "DELETE FROM memberships WHERE project_id=$1 AND user_id=$2 RETURNING membership_id, user_id, project_id, role;",
      [id, member_id],
    );
    const deleted_membership = deleted_membership_result.rows[0];
    if (!deleted_membership) {
      return res.status(404).json({
        status: "error",
        message: "Membership not found",
      });
    }
    return res.status(200).json({
      status: "OK",
      message: "Membership deleted successfully",
    });
  } catch (err) {
    console.error("Deleting membership error: ", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});
export default route;
