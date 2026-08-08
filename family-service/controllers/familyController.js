const crypto = require("crypto");
const { User, Family, FamilyMember } = require("../models");
const uuidv4 = () => crypto.randomUUID();

// Generate unique family code
const generateFamilyCode = () => {
  return uuidv4().substring(0, 8).toUpperCase();
};

// Create a new family (/families)
const createFamily = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    // Generate unique code
    const familyCode = generateFamilyCode();

    // Create family
    const family = await Family.create({
      name,
      family_code: familyCode,
      created_by: userId,
    });

    // Add creator as admin member
    await FamilyMember.create({
      user_id: userId,
      family_id: family.id,
      role: "admin",
    });

    res.status(201).json({
      success: true,
      message: "Family created successfully",
      family: {
        id: family.id,
        name: family.name,
        familyCode: family.family_code,
        createdBy: userId,
      },
    });
  } catch (error) {
    console.error("Create family error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create family",
    });
  }
};

// Get family details (/families/:id)
const getFamily = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is member of this family
    const membership = await FamilyMember.findOne({
      where: { family_id: id, user_id: userId },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this family",
      });
    }

    // Get family with members
    const family = await Family.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          through: { attributes: ["role", "joined_at"] },
          attributes: ["id", "name", "email"],
        },
      ],
    });

    res.json({
      success: true,
      family,
    });
  } catch (error) {
    console.error("Get family error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get family",
    });
  }
};

// Generate invite link (/families/:id/invite)
const generateInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is admin
    const membership = await FamilyMember.findOne({
      where: { family_id: id, user_id: userId, role: "admin" },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "Only admins can generate invites",
      });
    }

    const family = await Family.findByPk(id);
    const inviteCode = family.family_code;

    res.json({
      success: true,
      inviteCode,
      expiresIn: "24 hours",
      inviteLink: `http://localhost:3000/join?code=${inviteCode}`,
    });
  } catch (error) {
    console.error("Generate invite error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate invite",
    });
  }
};

// Join family with code (/families/join)
const joinFamily = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    // Find family by code
    const family = await Family.findOne({
      where: { family_code: inviteCode },
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        error: "Invalid invite code",
      });
    }

    // Check if already member
    const existingMember = await FamilyMember.findOne({
      where: { family_id: family.id, user_id: userId },
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: "You are already a member of this family",
      });
    }

    // Add as member
    await FamilyMember.create({
      user_id: userId,
      family_id: family.id,
      role: "member",
    });

    res.json({
      success: true,
      message: "Successfully joined family",
      family: {
        id: family.id,
        name: family.name,
      },
    });
  } catch (error) {
    console.error("Join family error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to join family",
    });
  }
};

// List family members (families/:id/members)
const getFamilyMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check membership
    const membership = await FamilyMember.findOne({
      where: { family_id: id, user_id: userId },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this family",
      });
    }

    // Get all members with their roles
    const members = await FamilyMember.findAll({
      where: { family_id: id },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const formattedMembers = members.map((m) => ({
      id: m.User.id,
      name: m.User.name,
      email: m.User.email,
      role: m.role,
      joinedAt: m.joined_at,
    }));

    res.json({
      success: true,
      members: formattedMembers,
    });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get family members",
    });
  }
};

module.exports = {
  createFamily,
  getFamily,
  generateInvite,
  joinFamily,
  getFamilyMembers,
};
