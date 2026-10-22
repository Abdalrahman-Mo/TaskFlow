import { Router } from "express";
const route = Router();
route.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "TaskFlow API is running",
  });
});
export default route;
