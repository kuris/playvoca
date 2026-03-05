import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = import.meta.env ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL;
const key = import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.log('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    const { data, error } = await supabase.from('words').select('id').limit(1);
    if (error) {
        console.error('Connection failed:', error.message);
    } else {
        console.log('Connection successful! Data:', data);
    }
}

testConnection();
