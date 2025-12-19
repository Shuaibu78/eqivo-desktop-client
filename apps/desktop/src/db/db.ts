import sqlite3 from "sqlite3";
import path from "path";
import { app } from "electron";

// Initialize database after app is ready
let db: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
  if (!db) {
    // Ensure app is ready before accessing userData
    if (!app.isReady()) {
      throw new Error("Database accessed before app is ready");
    }
    const dbPath = path.join(app.getPath("userData"), "calls.db");
    db = new sqlite3.Database(dbPath);

    db.serialize(() => {
      db!.run(`
        CREATE TABLE IF NOT EXISTS calls (
          id TEXT PRIMARY KEY,
          to_number TEXT,
          status TEXT,
          timestamp INTEGER
        )
      `);
    });
  }
  return db;
}

export default {
  saveCall(call: any) {
    return new Promise<void>((resolve, reject) => {
      const database = getDb();
      database.run(
        `INSERT OR REPLACE INTO calls (id, to_number, status, timestamp)
         VALUES (?, ?, ?, ?)`,
        [call.id, call.to, call.status, call.timestamp],
        (err) => (err ? reject(err) : resolve())
      );
    });
  },

  getCalls() {
    return new Promise<any[]>((resolve, reject) => {
      const database = getDb();
      database.all(
        `SELECT id, to_number as toNumber, status, timestamp FROM calls ORDER BY timestamp DESC`,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          // Map toNumber back to 'to' for frontend compatibility (avoiding SQL reserved keyword)
          const mappedRows = (rows || []).map((row: any) => {
            const { toNumber, ...rest } = row;
            return { ...rest, to: toNumber };
          });
          resolve(mappedRows);
        }
      );
    });
  },

  updateCallStatus(callId: string, status: string) {
    return new Promise<void>((resolve, reject) => {
      const database = getDb();
      database.run(
        `UPDATE calls SET status = ? WHERE id = ?`,
        [status, callId],
        (err) => (err ? reject(err) : resolve())
      );
    });
  },
};
