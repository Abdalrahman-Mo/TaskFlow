import express from "express";
import cors from "cors";
import authRoute from "./routes/auth.routes.js";
import projectsRoute from "./routes/projects.routes.js";
import membersRoute from "./routes/members.routes.js";
import tasksRoute from "./routes/tasks.routes.js";
import session from "express-session";
// import errorHandler from "./middleware/errorHandler.middlware.js";

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false, //! Avoids saving an unchanged session unnecessarily
    saveUninitialized: false, //! Doesn't save a new, unmodified session
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/api/auth", authRoute);
app.use("/api/projects", projectsRoute);
app.use("/api/projects", membersRoute);
app.use("/api/projects", tasksRoute);
// app.use(errorHandler);

export default app;
