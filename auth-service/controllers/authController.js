const { User, Family, FamilyMember } = require("../models");
const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "24h" });
};

// Register new user (/auth/register)
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email already exists",
      });
    }

    const user = await User.create({
      email,
      password_hash: password,
      name,
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
};

// Login user (/auth/login)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Attach familyId if they belong to a family
    const familyMember = await FamilyMember.findOne({ where: { user_id: user.id } });
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    if (familyMember) {
      userData.familyId = familyMember.family_id;
    }

    res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

// Get user profile (/auth/profile)
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password_hash"] },
    });

    const familyMember = await FamilyMember.findOne({ where: { user_id: req.user.id } });
    const userData = user.toJSON();
    if (familyMember) {
      userData.familyId = familyMember.family_id;
    }

    res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
