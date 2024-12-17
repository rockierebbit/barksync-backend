// server/tests/testEndpoints.js
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_URL = 'http://127.0.0.1:3000';

async function runTests() {
    console.log('Starting API tests...');

    try {
        // Basic connection test
        console.log('\nTesting connection...');
        const response = await fetch(`${SERVER_URL}/api/test`);
        const data = await response.json();
        console.log('Server response:', data);

        // Test successful
        console.log('\n✅ Basic connection test passed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\nDebug information:');
        console.log('1. Make sure server is running (node server.js)');
        console.log(`2. Check if server is accessible at ${SERVER_URL}`);
        console.log('3. Check server console for errors');
    }
}

runTests();