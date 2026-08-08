// Run this once to fix the medications table schema
// Usage: node fix-medications-schema.js

require("dotenv").config();
const { sequelize } = require("./config/database");

async function fixSchema() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB");

    // Change schedule from TIME (NOT NULL) to VARCHAR(10) NULL
    await sequelize.query(
      "ALTER TABLE medications MODIFY COLUMN schedule VARCHAR(10) NULL"
    );
    console.log("✅ Fixed: schedule column → VARCHAR(10) NULL");

    // Change frequency from ENUM to VARCHAR(50)
    await sequelize.query(
      "ALTER TABLE medications MODIFY COLUMN frequency VARCHAR(50) NOT NULL DEFAULT 'once-daily'"
    );
    console.log("✅ Fixed: frequency column → VARCHAR(50)");

    console.log("\n✅ Schema fixed! Restart health-service now.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fixSchema();
