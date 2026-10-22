function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    status: "ERROR",
    message: "Internal server error",
  });
}

export default errorHandler;
