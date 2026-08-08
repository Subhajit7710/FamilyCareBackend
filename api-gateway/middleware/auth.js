const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  // List of public paths
  const isPublic =
    req.path === "/auth/login" ||
    req.path === "/auth/register" ||
    req.path === "/gateway/health" ||
    req.path === "/gateway/status" ||
    req.path.startsWith("/gateway/");

  if (isPublic) {
    return next();
  }

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

module.exports = { authenticate };
