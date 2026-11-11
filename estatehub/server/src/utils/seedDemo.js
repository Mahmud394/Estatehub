const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const env = require('../config/env');

// DEMO DATA ONLY. Every property/review inserted here is flagged is_demo = 1.
// Images are placeholder photos from picsum.photos (random royalty-free images, not real listings).
const DEMO_PASSWORD = 'Demo@12345';

const img = (seed) => `https://picsum.photos/seed/${seed}/900/600`;

const properties = [
  ['Modern 3-Bed Apartment in Uttara', 'Bright corner apartment with a south-facing balcony, near Sector 7 lake. DEMO LISTING.', 'apartment', 'sale', 7500000, 1450, 3, 3, 'Dhaka', 'Uttara', 'uttara1'],
  ['Family House with Garden', 'Two-storey house with a small garden and covered parking. DEMO LISTING.', 'house', 'sale', 28500000, 3200, 5, 4, 'Dhaka', 'Bashundhara', 'house2'],
  ['Cozy 2-Bed Flat for Rent', 'Quiet residential building, lift and generator backup. DEMO LISTING.', 'apartment', 'rent', 28000, 1050, 2, 2, 'Dhaka', 'Mirpur', 'flat3'],
  ['Corner Commercial Space', 'Ground-floor shop space on a busy road, suitable for retail. DEMO LISTING.', 'commercial', 'rent', 120000, 1800, null, 1, 'Dhaka', 'Uttara', 'shop4'],
  ['Residential Plot, 5 Katha', 'Rectangular plot in a planned residential area. DEMO LISTING.', 'land', 'sale', 18000000, 3600, null, null, 'Dhaka', 'Bashundhara', 'land5'],
  ['Hillside View Apartment', 'Top-floor apartment with city and hill views. DEMO LISTING.', 'apartment', 'sale', 9800000, 1700, 3, 3, 'Chattogram', 'Khulshi', 'ctg6'],
  ['Spacious Family Flat', 'Well-ventilated flat close to schools and markets. DEMO LISTING.', 'apartment', 'rent', 35000, 1500, 3, 2, 'Sylhet', 'Zindabazar', 'syl7'],
  ['Office Floor in Business District', 'Open-plan office floor with parking. DEMO LISTING.', 'commercial', 'sale', 42000000, 4200, null, 3, 'Dhaka', 'Mirpur', 'office8'],
];

async function seed() {
  const conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user,
    password: env.db.password, database: env.db.database,
  });
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const addUser = async (name, email, role, phone) => {
    const [r] = await conn.execute(
      'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [name, email, hash, role, phone]
    );
    return r.insertId;
  };

  await addUser('Demo Admin', 'admin@estatehub.demo', 'admin', null);
  const broker1 = await addUser('Rahim Uddin (Demo)', 'broker1@estatehub.demo', 'broker', '+8801700000001');
  const broker2 = await addUser('Nusrat Jahan (Demo)', 'broker2@estatehub.demo', 'broker', '+8801700000002');
  const client1 = await addUser('Demo Client One', 'client1@estatehub.demo', 'client', null);
  await addUser('Demo Client Two', 'client2@estatehub.demo', 'client', null);

  await conn.execute(
    `INSERT INTO broker_profiles (user_id, company_name, bio, service_areas, verification_status, verified_at)
     VALUES (?,?,?,?, 'approved', NOW()), (?,?,?,?, 'approved', NOW())`,
    [broker1, 'Demo Realty Ltd.', 'Demo broker profile.', 'Uttara, Bashundhara, Mirpur',
     broker2, 'Demo Homes BD', 'Demo broker profile.', 'Chattogram, Sylhet, Dhaka']
  );

  for (let i = 0; i < properties.length; i++) {
    const [title, desc, cat, purpose, price, size, beds, baths, city, area, seedName] = properties[i];
    const brokerId = i % 2 === 0 ? broker1 : broker2;
    const [r] = await conn.execute(
      `INSERT INTO properties (broker_id, title, description, category, purpose, price, size,
         bedrooms, bathrooms, city, area, approval_status, availability_status, is_demo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'approved', 'available', 1)`,
      [brokerId, title, desc, cat, purpose, price, size, beds, baths, city, area]
    );
    await conn.execute(
      'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?,?,1,0),(?,?,0,1)',
      [r.insertId, img(seedName), r.insertId, img(seedName + 'b')]
    );
  }

  await conn.execute(
    'INSERT INTO reviews (broker_id, client_id, rating, body, is_demo) VALUES (?,?,5,?,1)',
    [broker1, client1, 'SAMPLE REVIEW (demo content, not a real customer).']
  );

  await conn.end();
  console.log('Demo data inserted. All demo accounts use password:', DEMO_PASSWORD);
}

module.exports = seed;

if (require.main === module) {
  seed().catch((e) => { console.error('Seeding failed:', e.message); process.exit(1); });
}
