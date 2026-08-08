const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const { Medication, Patient, MedicationLog } = require("../models");
const { getIo } = require("../socket/ioStore");

// Redis connection for BullMQ
const connection = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create queue for medication reminders
const medicationQueue = new Queue("medication-reminders", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Create worker to process reminders
const reminderWorker = new Worker(
  "medication-reminders",
  async (job) => {
    const { medicationId, patientId, scheduledTime } = job.data;

    console.log(
      `Processing reminder for medication ${medicationId} at ${new Date().toLocaleTimeString()}`,
    );

    try {
      // Get medication and patient details
      const medication = await Medication.findByPk(medicationId, {
        include: [{ model: Patient }],
      });

      if (!medication || medication.status !== "active") {
        console.log(`Medication ${medicationId} is no longer active`);
        return;
      }

      const eventData = {
        type: "REMINDER",
        medicationId: medication.id,
        medicationName: medication.name,
        patientId: medication.patient_id,
        patientName: medication.Patient.name,
        scheduledTime,
        familyId: medication.Patient.family_id,
        timestamp: new Date().toISOString(),
      };

      // Publish to Redis for cross-service notification (non-fatal if Redis down)
      try {
        const redis = new Redis({ host: "localhost", port: 6379, lazyConnect: true });
        await redis.connect();
        await redis.publish("medication:reminders", JSON.stringify(eventData));
        redis.disconnect();
      } catch (redisErr) {
        console.warn('[REMINDER WORKER] Redis publish failed (non-fatal):', redisErr.message);
      }

      // Emit DIRECTLY via socket.io (works even without Redis)
      const io = getIo();
      if (io && medication.Patient && medication.Patient.family_id) {
        io.to(`family:${medication.Patient.family_id}`).emit('medication-reminder', eventData);
        console.log(`[REMINDER WORKER] Direct socket emit to family:${medication.Patient.family_id}`);
      }

      console.log(
        `Reminder sent for ${medication.name} - ${medication.Patient.name}`,
      );
    } catch (error) {
      console.error("Reminder worker error:", error);
      throw error;
    }
  },
  { connection },
);

// Handle worker events
reminderWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

// Schedule reminders for a medication
const scheduleReminders = async (medicationId, patientId, scheduleTime) => {
  // Parse schedule time (e.g., "08:00:00")
  const [hours, minutes] = scheduleTime.split(":");

  // Calculate next occurrence
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduled < now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  const delay = scheduled.getTime() - now.getTime();

  console.log(
    `Scheduling reminder for ${scheduleTime} (in ${Math.round(delay / 60000)} minutes)`,
  );

  // Add job to queue
  await medicationQueue.add(
    `reminder-${medicationId}`,
    {
      medicationId,
      patientId,
      scheduledTime: scheduleTime,
    },
    {
      delay,
      jobId: `med-${medicationId}-${Date.now()}`,
      repeat: {
        pattern: `${minutes} ${hours} * * *`, // Cron pattern for daily reminder
      },
    },
  );
};

// Check all medications and schedule reminders (run on startup)
const initializeReminders = async () => {
  console.log("Initializing medication reminders...");

  const medications = await Medication.findAll({
    where: { status: "active" },
    include: [{ model: Patient }],
  });

  for (const med of medications) {
    await scheduleReminders(med.id, med.patient_id, med.schedule);
  }

  console.log(`Scheduled ${medications.length} medication reminders`);
};

module.exports = {
  medicationQueue,
  scheduleReminders,
  initializeReminders,
};
