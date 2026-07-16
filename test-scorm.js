// test-scorm-account.js
import dotenv from 'dotenv';
dotenv.config();

async function testAccountCapabilities() {
    console.log('🔍 Testing SCORM Cloud Account Capabilities\n');

    const auth = {
        username: process.env.SCORM_CLOUD_APP_ID,
        password: process.env.SCORM_CLOUD_SECRET_KEY
    };

    console.log('Using App ID:', auth.username);

    if (!auth.username || !auth.password) {
        console.log('❌ Missing SCORM Cloud credentials in .env file');
        return;
    }

    // Test different API versions and endpoints
    const testCases = [
        // SCORM Cloud v2
        {
            base: 'https://cloud.scorm.com/api/v2',
            name: 'SCORM Cloud v2'
        },
        // SCORM Cloud v1
        {
            base: 'https://cloud.scorm.com/api/v1',
            name: 'SCORM Cloud v1'
        },
        // Rustici Engine (older accounts)
        {
            base: 'https://cloud.scorm.com/EngineWebServices',
            name: 'Engine WebServices'
        },
        // Legacy Rustici
        {
            base: 'https://rustici.scorm.com/EngineWebServices',
            name: 'Legacy Rustici'
        }
    ];

    for (const test of testCases) {
        console.log(`\n🧪 Testing: ${test.name}`);
        console.log(`Base URL: ${test.base}`);

        try {
            // Try to get courses (simple GET request)
            const response = await fetch(`${test.base}/courses?limit=1`, {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            console.log(`  GET /courses: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`  ✅ Works! Found ${data.length || 0} courses`);
                console.log(`  Response keys:`, Object.keys(data));

                // Test POST endpoint
                console.log(`  Testing POST to find upload endpoint...`);

                // Try common upload endpoints
                const uploadEndpoints = [
                    '/courses',
                    '/course',
                    '/import/course',
                    '/upload/course'
                ];

                for (const endpoint of uploadEndpoints) {
                    try {
                        const formData = new FormData();
                        const blob = new Blob(['test'], { type: 'application/zip' });
                        formData.append('file', blob, 'test.zip');

                        const uploadResponse = await fetch(`${test.base}${endpoint}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
                            },
                            body: formData
                        });

                        console.log(`    POST ${endpoint}: ${uploadResponse.status}`);

                        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
                            console.log(`    🎉 UPLOAD ENDPOINT FOUND: ${test.base}${endpoint}`);
                            return `${test.base}${endpoint}`;
                        } else if (uploadResponse.status === 400 || uploadResponse.status === 415) {
                            console.log(`    ✅ Endpoint exists (bad file): ${test.base}${endpoint}`);
                            return `${test.base}${endpoint}`;
                        }
                    } catch (error) {
                        console.log(`    ❌ ${endpoint}: ${error.message}`);
                    }
                }
            } else {
                const errorText = await response.text();
                console.log(`  ❌ Failed: ${errorText.substring(0, 100)}`);
            }
        } catch (error) {
            console.log(`  ❌ Cannot connect: ${error.message}`);
        }
    }

    console.log('\n❌ No working API found.');
    console.log('\n💡 Likely Issues:');
    console.log('1. Your account may not have API access');
    console.log('2. You might need to activate API in SCORM Cloud dashboard');
    console.log('3. Check your plan includes API access');
    console.log('4. Contact SCORM Cloud support');

    return null;
}

testAccountCapabilities();