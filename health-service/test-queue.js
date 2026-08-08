const {
  medicationQueue,
  scheduleReminders,
  initializeReminders,
} = require("./src/queues/medicationQueue");
const { Medication, Patient } = require("./src/models");

const testQueue = async () => {
  console.log("🧪 Testing BullMQ Queue...\n");

  // Initialize all reminders
  await initializeReminders();

  // Check queue status
  const jobs = await medicationQueue.getJobs(["waiting", "active", "delayed"]);
  console.log(`📊 Queue stats:`);
  console.log(`- Total jobs: ${jobs.length}`);
  console.log(`- Waiting: ${jobs.filter((j) => j.isWaiting()).length}`);
  console.log(`- Active: ${jobs.filter((j) => j.isActive()).length}`);
  console.log(`- Delayed: ${jobs.filter((j) => j.isDelayed()).length}`);

  // Show next few jobs
  const delayedJobs = await medicationQueue.getJobs(["delayed"]);
  console.log("\n⏰ Upcoming reminders:");
  for (const job of delayedJobs.slice(0, 5)) {
    const delay = job.delay;
    const hours = Math.floor(delay / 3600000);
    const minutes = Math.floor((delay % 3600000) / 60000);
    console.log(
      `- ${job.data.medicationName} for patient ${job.data.patientId} in ${hours}h ${minutes}m`,
    );
  }

  process.exit();
};

testQueue().catch(console.error);
