(async () => {
    try {
        const rand = Math.random().toString(36).substring(7);
        const loginRes = await fetch('http://localhost:3001/api/v1/auth/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: 'Test', email:`test_${rand}@example.com`, password:'password'})
        });
        const login = await loginRes.json();
        
        console.log("LOGIN BODY:", JSON.stringify(login, null, 2));

        let token = login.data?.token || login.token;
        console.log("USING TOKEN:", token);

        const res = await fetch('http://localhost:3001/api/v1/reports', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'Car crash',
                severity_level: 'medium',
                description: 'Test crash',
                location: { latitude: 15.3, longitude: 120 }
            })
        });
        const data = await res.json();
        console.log('STATUS:', res.status, 'DATA:', JSON.stringify(data, null, 2));
    } catch(e) {
        console.error('ERROR:', e);
    }
})();
