const { createClient } = require('@libsql/client');
const path = require('path');

async function run() {
  const sqlitePath = path.resolve(__dirname, '../data/radiology.db').replace(/\\/g, '/');
  const client = createClient({ url: `file:${sqlitePath}` });

  // Add column if not exists
  try {
    await client.execute(`ALTER TABLE reports ADD COLUMN is_archived INTEGER DEFAULT 0;`);
    console.log('Added is_archived column successfully.');
  } catch (e) {
    console.log('is_archived column already exists or error:', e.message);
  }

  // Update existing 3 records to archived
  const result = await client.execute(`
    UPDATE reports 
    SET is_archived = 1, status = 'ARCHIVED'
  `);

  console.log('Updated existing records to archived state.');
  
  const current = await client.execute(`SELECT id, token_number, patient_name, status, is_archived FROM reports;`);
  console.log('Current reports in database:');
  console.table(current.rows);
}

run().catch(console.error);
