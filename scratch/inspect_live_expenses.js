const Database = require('/Users/okelly/Desktop/dev/enfusionx/clients/pos/pos/node_modules/better-sqlite3');
const liveDbPath = '/Users/okelly/Library/Application Support/smartwaypos/smartwaypos.db';
const db = new Database(liveDbPath);

try {
  const expenses = db.prepare("SELECT * FROM expenses").all();
  console.log("All Expenses in DB:", expenses);
  
  const users = db.prepare("SELECT id, username, role FROM users").all();
  console.log("All Users in DB:", users);
} catch (e) {
  console.error(e);
} finally {
  db.close();
}
process.exit(0);
