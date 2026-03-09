/**
 * MFM IFESOWAPO — Admin Setup Script
 * ─────────────────────────────────────
 * Run ONCE after deploying to create the initial admin account.
 * Usage: node scripts/createAdmin.js
 *
 * Make sure your .env file is configured before running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = 'MFM Admin';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('❌ Password must be at least 10 characters for security.');
    process.exit(1);
  }

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log('⚠️  Admin with this email already exists. Skipping.');
    process.exit(0);
  }

  // Hash password with bcrypt (salt rounds: 12)
  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('admins')
    .insert([{ name, email: email.toLowerCase(), password_hash }])
    .select('id, email, name')
    .single();

  if (error) {
    console.error('❌ Failed to create admin:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin created successfully!');
  console.log(`   Name:  ${data.name}`);
  console.log(`   Email: ${data.email}`);
  console.log(`   ID:    ${data.id}`);
  console.log('\n⚠️  Remove ADMIN_PASSWORD from your .env after setup!');
}

createAdmin();
