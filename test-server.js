const express = require('express');
     const app = express();

     console.log('Loading test-server.js at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

     app.get('/api/test-users', (req, res) => {
       console.log('Test route hit: /api/test-users');
       res.json({ message: 'Test route working' });
     });

     app.get('/api/admin/users', (req, res) => {
       console.log('Users route hit: /api/admin/users');
       res.json({ message: 'Users route working' });
     });

     app.use((req, res) => {
       console.log(`Unhandled route: ${req.method} ${req.url}`);
       res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
     });

     const server = app.listen(3001, '0.0.0.0', () => {
       console.log('Test server running on port 3001');
     });

     server.on('error', (err) => {
       console.error('Server error:', err.message);
     });