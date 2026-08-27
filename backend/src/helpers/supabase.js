const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const rootEnv = path.join(__dirname, '..', '..', '..', '.env');
const backendEnv = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = {
  supabase,
  supabaseUrl,
  supabaseKey,
};
