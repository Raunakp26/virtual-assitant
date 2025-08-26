import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    console.log("=== AUTHENTICATION DEBUG ===");
    console.log("Cookies:", req.cookies);
    console.log("Token:", req.cookies.token);
    
    const token = req.cookies.token;
    if (!token) {
      console.log("No token found in cookies");
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    console.log("Verifying token...");
    const verifyToken = await jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully:", verifyToken);
    
    req.user = verifyToken;
    console.log("User object set:", req.user);
    next();
  } catch (error) {
    console.error("=== AUTHENTICATION ERROR ===");
    console.error("Token verification error:", error.message);
    console.error("Error details:", error);
    console.error("============================");
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default isAuth;
