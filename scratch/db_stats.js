const Database = require('/Users/okelly/Desktop/dev/enfusionx/clients/pos/pos/node_modules/better-sqlite3');
const liveDbPath = '/Users/okelly/Library/Application Support/smartwaypos/smartwaypos.db';
const db = new Database(liveDbPath);
try {
  const columns = db.prepare(`PRAGMA table_info(orders)`).all();
  console.log('Orders Columns:', columns.map(c => c.name));
  
  const columnsItems = db.prepare(`PRAGMA table_info(order_items)`).all();
  console.log('Order Items Columns:', columnsItems.map(c => c.name));
} catch (e) {
  console.error(e);
} finally {
  db.close();
}
process.exit(0);
