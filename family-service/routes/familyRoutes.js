const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  createFamily,
  getFamily,
  generateInvite,
  joinFamily,
  getFamilyMembers,
} = require("../controllers/familyController");

// All routes require authentication
router.use(authenticate);

// Family CRUD
router.post("/", createFamily);
router.get("/:id", getFamily);
router.get("/:id/members", getFamilyMembers);

// Invites
router.post("/:id/invite", generateInvite);
router.post("/join", joinFamily);

module.exports = router;
