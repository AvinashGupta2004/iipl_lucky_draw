// Controller.js
import Database from "better-sqlite3";
import * as bcrypt from "bcrypt";
import { parentPort, workerData } from "worker_threads";

let databaseInstance = null;

class Controller {
  constructor(dbPath) {
    this.database = new Database(dbPath);
    this.createRegisteredUsers();
    this.createRequirements();
    this.createCoupons();
    this.createPrizes();
    databaseInstance = this.database;
  }

  // Ensure the database is closed only when the worker exits
  closeDatabase() {
    if (this.database) {
      this.database.close();
      databaseInstance = null; // Reset for potential new worker instances
    }
  }

  reloadDatabase() {
    this.closeDatabase();
    this.database = new Database(workerData.dbPath);
    this.createRegisteredUsers();
    this.createRequirements();
    this.createCoupons();
    this.createPrizes();
  }

  createRegisteredUsers() {
    try {
      let query = `create table if not exists registeredUsers (
        userID text not null primary key,
        user_name text not null,
        password text not null
        );`;
      this.database.exec(query);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  createRequirements() {
    let query = `create table if not exists requirements (
        event_name text not null,
        main_prize_count integer not null,
        consolation_prize_count integer not null,
        total_digits integer not null,
        max_range integer not null,
        min_range integer not null
    );`;
    this.database.exec(query);
  }

  createActivityLog() {
    let query = `create table if not exists activity_log (
        activity_id integer not null primary key,
        usr_id text not null,
        run_dt text not null,
        desc text not null
    );`;
    this.database.exec(query);
  }
  createCoupons() {
    let query = `
      create table if not exists coupons(
        Coupon_Numbers integer not null,
        Prize_Number integer
      );
    `;
    this.database.exec(query);
  }

  createPrizes() {
    let query = `
      create table if not exists prizes(
        Event_Name text not null,
        Prize_Type_Info text not null,
        Coupon_Number integer not null,
        run_usr_id text not null,
        run_dt text not null
      );
    `;
    this.database.exec(query);
  }

  insertRequirements({
    event_name,
    main_prize_count,
    consolation_prize_count,
    total_digits,
    max_range,
    min_range,
  }) {
    try {
      let query = this.database.prepare(`
        insert into requirements (event_name,main_prize_count,consolation_prize_count,total_digits,max_range,min_range) values(?,?,?,?,?,?);
      `);
      query.run(
        event_name,
        main_prize_count,
        consolation_prize_count,
        total_digits,
        max_range,
        min_range,
      );
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  insertUser({ userName, hash }) {
    try {
      let query = this.database.prepare(`
      insert into registeredUsers (userID,user_name,password) values(?,?,?);
    `);
      let totalCount =
        this.database
          .prepare("select count(*) as count from registeredUsers;")
          .get().count + 1;
      let userID = "IIPL-" + totalCount.toString().padStart(4, "0");
      query.run(userID, userName, hash);
      return { success: true, id: userID };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  insertActivityLog({ userID, actType = "Sign in" }) {
    try {
      let query = this.database.prepare(`
      insert into activity_log (activity_id,usr_id,run_dt,run_time,desc) values(?,?,?,?,?);
    `);
      let totalCount =
        this.database
          .prepare("select count(*) as count from activity_log;")
          .get().count + 1;
      let date = new Date();
      query.run(
        totalCount,
        userID,
        this.formatDate(date),
        this.formatTime(date),
        actType,
      );
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  updateRequirements({
    event_name,
    main_prize_count,
    consolation_prize_count,
    total_digits,
    max_range,
    min_range,
  }) {
    try {
      let query = this.database.prepare(`
        update requirements set event_name = ?,main_prize_count = ?,consolation_prize_count = ?,total_digits = ?,max_range = ?,min_range = ?;
      `);
      query.run(
        event_name,
        main_prize_count,
        consolation_prize_count,
        total_digits,
        max_range,
        min_range,
      );
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  updateCoupons(couponNumber, prizeNumber) {
    try {
      let query = this.database.prepare(
        `update coupons set Prize_Number = ? where Coupon_Numbers = ?;`,
      );
      query.run(prizeNumber, couponNumber);
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }
  formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  }
  insertFinalNumbers(loggedInUserID, eventName, prizeInfo, couponNumber) {
    try {
      let timestamp = this.formatDateTime(new Date());
      let query = this.database.prepare(`
        insert into prizes (Event_Name,Prize_Type_Info,Coupon_Number, run_usr_id, run_dt) values (?,?,?,?,?);
      `);
      query.run(eventName, prizeInfo, couponNumber, loggedInUserID, timestamp);
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  getUser(userID) {
    try {
      let query = this.database.prepare(`
        select * from registeredUsers where userID=?;
      `);
      return { success: true, data: query.get(userID) };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  getRequirements() {
    try {
      let query = this.database.prepare(`
        select * from requirements;
      `);
      return { success: true, data: query.get() };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  getCoupons() {
    try {
      let query = this.database.prepare(`
        select Coupon_Numbers from coupons;
      `);
      return { success: true, data: query.all() };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  checkPrizeNumbersAlongCoupons() {
    try {
      let query = this.database.prepare(`
        select Prize_Number from coupons
        where Prize_Number is not null
        and Prize_Number <> '';
      `);
      const result = query.get();
      return { success: true, data: result == null };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  clearCoupons() {
    try {
      let query = `delete from coupons;`;
      this.database.exec(query);
      return { success: true };
    } catch (err) {
      console.log(err);
      return { success: false, error: err.message };
    }
  }

  insertCoupons(couponNumbers) {
    try {
      this.clearCoupons(); // Clear existing coupons first
      const insert = this.database.prepare(`
        INSERT INTO coupons (Coupon_Numbers, Prize_Number) VALUES (?,NULL);
      `);
      this.database.transaction(() => {
        for (const coupon of couponNumbers) {
          insert.run(coupon);
        }
      })();
      return { success: true };
    } catch (err) {
      console.error("Error inserting coupons:", err);
      return { success: false, error: err.message };
    }
  }
  getActivityLog(userID) {
    let resultSet = new Set();
    try {
      let query = this.database.prepare(
        `select * from activity_log where usr_id = ?;`,
      );
      let result = query.all(userID);
      result.forEach((event) => {
        resultSet.add(event);
      });
      return [...resultSet];
    } catch (err) {
      console.log(err);
      return null;
    }
  }
  async hashPassword(password, saltRounds = 10) {
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return { success: true, hash };
    } catch (err) {
      console.error("Error hashing password:", err);
      return { success: false, error: err.message };
    }
  }

  async comparePassword(password, hash) {
    try {
      const result = await bcrypt.compare(password, hash);
      return { success: true, result };
    } catch (err) {
      console.error("Error comparing password:", err);
      return { success: false, error: err.message };
    }
  }
  getLastRecordedEventNames() {
    let resultSet = new Set();
    try {
      let query = this.database.prepare(`select Event_Name from prizes;`);
      let result = query.all();
      result.forEach((event) => {
        resultSet.add(event.Event_Name);
      });
      return [...resultSet];
    } catch (err) {
      console.log(err);
      return null;
    }
  }
  clearPrizesForEventName(eventName) {
    let query = this.database.prepare(
      `delete from prizes where Event_Name = ?;`,
    );
    query.run(eventName);
  }
}

const controller = new Controller(workerData.dbPath);

// Listen for messages from the main thread
parentPort.on("message", async (message) => {
  const { id, method, args } = message;
  try {
    if (typeof controller[method] === "function") {
      let result;
      // Handle bcrypt methods which are now async
      if (method === "hashPassword" || method === "comparePassword") {
        result = await controller[method](...args);
      } else {
        result = controller[method](...args);
      }
      parentPort.postMessage({ id, success: true, result });
    } else {
      parentPort.postMessage({
        id,
        success: false,
        error: `Method ${method} not found`,
      });
    }
  } catch (error) {
    parentPort.postMessage({ id, success: false, error: error.message });
  }
});

// Close database when worker exits
parentPort.on("exit", () => {
  controller.closeDatabase();
});
