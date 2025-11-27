
console.log("------------------------------------------------");
console.log("🚀 STARTING BEAST READER SERVER (CLOUD RUN MODE)");
console.log("------------------------------------------------");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Database & Services
const connectDB = require('./database');
const scraperService = require('./services/scraperService');

// Models
const Ticket = require('./models/Ticket');
const LotteryResult = require('./models/LotteryResult');

const app = express();
// Google Cloud Run injects the PORT environment variable (defaulting to 8080 usually)
const PORT = process.env.PORT || 8080;

// 1. Connect to Database (Hardcoded in database.js for immediate safety)
connectDB();

// 2. Start Background Jobs
try {
    scraperService.startResultScheduler();
    console.log("✅ Scraper service initialized");
} catch (err) {
    console.error("⚠️ Failed to start scraper:", err);
}

// 3. Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logger Middleware
app.use((req, res, next) => {
    // Only log non-static asset requests to keep logs clean
    if (!req.url.match(/\.(js|css|png|jpg|ico)$/)) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// ==========================================
// 4. API ROUTES (PRIORITY #1)
// ==========================================

app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    res.status(200).json({
        server: 'online',
        database: statusMap[dbState] || 'unknown',
        env: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/results', async (req, res) => {
    try {
        const { date, resultId } = req.query;
        const query = {};
        
        if (date) {
            query.drawDate = date;
        }
        
        if (resultId) {
            query.resultId = resultId;
        }

        // If no date provided, we default to showing the latest entry for each unique lottery
        // However, simple .find() returns everything. 
        // For specific dashboard view (Latest), we usually filter client side or aggregate.
        // For now, returning all matches or filtered matches.
        
        const results = await LotteryResult.find(query).sort({ drawDate: -1, country: 1, lotteryName: 1 });
        
        // If no filters, we might want to limit to "Latest" to avoid sending huge history payload
        // But logic currently relies on client filtering. We will optimize if needed.
        
        res.json(results);
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: 'Failed to fetch results from DB' });
    }
});

// --- NEW: GET TICKETS FOR ADMIN DASHBOARD ---
app.get('/api/tickets', async (req, res) => {
    try {
        // Fetch last 500 tickets to prevent massive payload, sorted by newest
        const tickets = await Ticket.find({}).sort({ transactionDateTime: -1 }).limit(500);
        res.json(tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: 'Failed to fetch tickets from DB' });
    }
});

app.post('/api/tickets', async (req, res) => {
    try {
        const ticketData = req.body;
        if (!ticketData.ticketNumber || !ticketData.plays || ticketData.plays.length === 0) {
            return res.status(400).json({ message: 'Invalid ticket data provided.' });
        }
        const newTicket = new Ticket(ticketData);
        await newTicket.save();
        console.log(`✅ Ticket ${ticketData.ticketNumber} saved.`);
        res.status(201).json({ message: 'Ticket saved successfully.', ticketId: ticketData.ticketNumber });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ticket number already exists.' });
        }
        console.error('Error saving ticket:', error);
        res.status(500).json({ message: 'An error occurred.', error: error.message });
    }
});

// Database Viewer (Admin Tool)
app.get('/ver-db', async (req, res) => {
    try {
        const tickets = await Ticket.find({}).sort({ createdAt: -1 }).limit(50).lean();
        const results = await LotteryResult.find({}).sort({ createdAt: -1 }).limit(50).lean();
        
        let html = `
        <html><body style="background:#111; color:#eee; font-family:monospace; padding:20px;">
        <h1 style="color:#00ff00">Admin DB Viewer</h1>
        <p>Status: <strong>${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}</strong></p>
        <hr style="border-color:#333"/>
        <h2>Last 50 Tickets</h2>
        <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
            <pre>${JSON.stringify(tickets, null, 2)}</pre>
        </div>
        <h2>Recent Results</h2>
        <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
            <pre>${JSON.stringify(results, null, 2)}</pre>
        </div>
        </body></html>`;
        res.send(html);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// ==========================================
// 5. STATIC FILES (REACT APP) (PRIORITY #2)
// ==========================================
const distPath = path.join(__dirname, 'dist');

// Ensure the build exists (handled by gcp-build script usually)
if (fs.existsSync(distPath)) {
    console.log(`✅ Serving static files from: ${distPath}`);
    // Serve static assets normally (long cache)
    app.use(express.static(distPath, {
        index: false // Don't serve index.html automatically, we handle it below
    }));
} else {
    console.error(`❌ CRITICAL: 'dist' directory not found. 'npm run build' might have failed.`);
}

// ==========================================
// 6. CATCH-ALL (CLIENT-SIDE ROUTING) (PRIORITY #3)
// ==========================================
app.get('*', (req, res) => {
    // Safety check: Don't return HTML for API 404s
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        // Force no-cache for index.html to ensure clients get new builds immediately
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
    } else {
        res.status(500).send('Application build not found. Please check deployment logs.');
    }
});

// Start Server - Binding to 0.0.0.0 is CRITICAL for Docker/Cloud Run
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0)`);
});