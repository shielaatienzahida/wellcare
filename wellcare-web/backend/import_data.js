const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function run() {
  await db.init();
  const csv = fs.readFileSync('import_data.csv', 'utf8');
  const lines = csv.trim().split('\n').slice(1); // skip header
  
  console.log(`Found ${lines.length} lines`);
  
  for (let line of lines) {
    if (!line) continue;
    
    // Simple CSV parser for quoted fields
    const parts = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuote = !inQuote;
      } else if (line[i] === ',' && !inQuote) {
        parts.push(cur);
        cur = '';
      } else {
        cur += line[i];
      }
    }
    parts.push(cur);

    if (parts.length < 5) continue;
    
    let date = parts[0].trim();
    let slot_id = parseInt(parts[1].trim(), 10);
    let fullName = parts[2].trim();
    let address = parts[3].trim();
    let bottles = parseInt(parts[4].trim(), 10);
    
    if (isNaN(bottles)) bottles = 0;

    let names = fullName.split(' ');
    let first_name = names[0];
    let last_name = names.length > 1 ? names[names.length - 1] : '';
    let middle_name = names.length > 2 ? names.slice(1, -1).join(' ') : null;

    let username = (first_name + last_name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!username) username = 'user' + slot_id;
    
    // Check if user exists
    let [existing] = await db.execute('SELECT id FROM clients WHERE username = ?', [username]);
    let clientId;
    
    if (existing.length === 0) {
      // Create user
      const birthdate = '1990-01-01';
      const rawPassword = '19900101';
      const hashed = await bcrypt.hash(rawPassword, 10);
      const client_id_number = Math.floor(100000 + Math.random() * 900000).toString();
      
      const [result] = await db.execute(
        'INSERT INTO clients (slot_id, first_name, last_name, middle_name, full_name, username, password, birthdate, address, client_id_number, total_checkins, total_bottles, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [slot_id, first_name, last_name, middle_name, fullName, username, hashed, birthdate, address, client_id_number, bottles, bottles, date]
      );
      clientId = result.insertId;
      console.log(`Created new client: ${fullName}`);
    } else {
      clientId = existing[0].id;
      // Update checkins and bottles
      await db.execute(
        'UPDATE clients SET total_checkins = total_checkins + ?, total_bottles = total_bottles + ?, last_seen = ? WHERE id = ?',
        [bottles, bottles, date, clientId]
      );
      console.log(`Updated client: ${fullName}`);
    }
    
    // Log history for bottles (we can just do 1 single log for the import to save space, or multiple logs)
    if (bottles > 0) {
       await db.execute('INSERT INTO session_history (client_id, type, logged_by, date) VALUES (?, ?, ?, ?)', [clientId, 'Alkaline Session', 'admin', date]);
    }
  }
  
  console.log('Import completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
