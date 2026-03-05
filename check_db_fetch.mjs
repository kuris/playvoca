const url = 'https://ggtydikxkfozlhnihrwr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdndHlkaWt4a2ZvemxobmlocndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzUxNzEsImV4cCI6MjA3MjYxMTE3MX0._-VDrO_v7bDeuBMSvqSa1uhnFr020qy9d4zWAg8ISu4';

async function testConnection() {
    console.log('Testing connection to Supabase via REST...');
    try {
        const res = await fetch(`${url}/rest/v1/words?select=id&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Connection failed! Status:', res.status, 'Error:', err);
            process.exit(1);
        }

        const data = await res.json();
        console.log('Connection successful! Retrieved data:', data);
    } catch (e) {
        console.error('Connection error:', e.message);
    }
}

testConnection();
