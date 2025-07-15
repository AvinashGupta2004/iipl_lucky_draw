import * as Thread from "worker_threads";
import Database from "better-sqlite3";

console.log("Worker: Initializing database connection...");

try {
  // Add debug logging for the database path
  console.log(`Worker: Attempting to open database at ${Thread.workerData.dbPath}`);

  let database;
  try {
    database = new Database(Thread.workerData.dbPath, {
      verbose: console.log // This will log all SQL queries
    });

    // Test the connection immediately
    database.prepare("SELECT 1").get();
    console.log("Worker: Database connection successful");
  } catch (dbError) {
    console.error("Worker: Database connection failed:", dbError);
    throw dbError;
  }

  Thread.parentPort.on("message", async (message) => {
    try {
      // Handle different types of messages
      if (message.method) {
        const { id, method, args } = message;

        try {
          let result;
          switch (method) {
            case "getRequirements":
              result = database.prepare("SELECT * FROM requirements LIMIT 1").get();
              break;
            case "getCoupons":
              result = database.prepare("SELECT * FROM coupons").all();
              break;
            // Add other methods as needed
            default:
              throw new Error(`Unknown method: ${method}`);
          }

          Thread.parentPort.postMessage({ id, success: true, result });
        } catch (error) {
          Thread.parentPort.postMessage({ id, success: false, error: error.message });
        }
      }
      // Rest of your message handling...
    } catch (err) {
      console.error("Worker: Message handling error:", err);
      Thread.parentPort.postMessage({
        type: "error",
        status: "error",
        error: err.message
      });
    }
  });

  // Error handlers
  Thread.parentPort.on("error", (err) => {
    console.error("Worker ParentPort Error:", err);
  });

  process.on("uncaughtException", (err) => {
    console.error("Worker Uncaught Exception:", err);
  });

} catch (initError) {
  console.error("Worker: Initialization failed:", initError);
  if (Thread.parentPort) {
    Thread.parentPort.postMessage({
      type: "init_error",
      status: "error",
      error: initError.message
    });
  }
  process.exit(1);
}
