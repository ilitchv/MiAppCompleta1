const cron = require('node-cron');
const LotteryResult = require('../models/LotteryResult');

// --- CONFIGURATION ---
const TARGETS = [
    // USA - New York
    { id: 'usa/ny/Midday', country: 'USA', name: 'New York', draw: 'Midday', time: '14:30', close: '14:10' },
    { id: 'usa/ny/Evening', country: 'USA', name: 'New York', draw: 'Evening', time: '22:30', close: '22:10' },
    // USA - New Jersey
    { id: 'usa/nj/Midday', country: 'USA', name: 'New Jersey', draw: 'Midday', time: '12:59', close: '12:39' },
    { id: 'usa/nj/Evening', country: 'USA', name: 'New Jersey', draw: 'Evening', time: '22:57', close: '22:37' },
    // USA - Florida
    { id: 'usa/fl/Midday', country: 'USA', name: 'Florida', draw: 'Midday', time: '13:30', close: '13:10' },
    { id: 'usa/fl/Evening', country: 'USA', name: 'Florida', draw: 'Evening', time: '21:45', close: '21:25' },
    // USA - Georgia
    { id: 'usa/ga/Midday', country: 'USA', name: 'Georgia', draw: 'Midday', time: '12:29', close: '12:09' },
    { id: 'usa/ga/Evening', country: 'USA', name: 'Georgia', draw: 'Evening', time: '18:59', close: '18:39' },
    
    // Santo Domingo
    { id: 'rd/real/Mediodía', country: 'SD', name: 'Lotería Real', draw: 'Mediodía', time: '12:55', close: '12:35' },
    { id: 'rd/ganamas/Tarde', country: 'SD', name: 'Gana Más', draw: 'Tarde', time: '14:30', close: '14:10' },
    { id: 'rd/loteka/Noche', country: 'SD', name: 'Loteka', draw: 'Noche', time: '19:55', close: '19:35' },
    { id: 'sd/nacional', country: 'SD', name: 'Nacional', draw: 'Noche', time: '20:55', close: '20:40' }
];

// Helper to generate random numbers for "Mock Mode"
const generateMockNumbers = (type) => {
    const p3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const p4 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const p2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const p2b = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const p2c = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    if (type === 'SD') return `${p2}-${p2b}-${p2c}`; 
    return `${p3}-${p4}`; 
};

const fetchAndParse = async () => {
    console.log('📡 Starting Data Cycle (MongoDB)...');
    const today = new Date().toISOString().split('T')[0]; 

    try {
        // Prepare Bulk Operations for Mongoose
        const operations = TARGETS.map(target => {
            const mockNumbers = generateMockNumbers(target.country);
            return {
                updateOne: {
                    // CRITICAL CHANGE: Filter by BOTH ID and Date to preserve history
                    filter: { resultId: target.id, drawDate: today },
                    update: {
                        $set: {
                            resultId: target.id,
                            country: target.country,
                            lotteryName: target.name,
                            drawName: target.draw,
                            numbers: mockNumbers,
                            drawDate: today,
                            scrapedAt: new Date(),
                            lastDrawTime: target.time,
                            closeTime: target.close
                        }
                    },
                    upsert: true
                }
            };
        });

        const result = await LotteryResult.bulkWrite(operations);
        console.log(`✅ MongoDB Bulk Write Completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);
        
    } catch (error) {
        console.error("❌ Error writing to MongoDB:", error);
    }
};

// Initialize Cron Job
const startResultScheduler = () => {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        fetchAndParse();
    });
    
    // RUN IMMEDIATELY ON STARTUP
    console.log('⏳ Scheduling initial MongoDB write in 2 seconds...');
    setTimeout(fetchAndParse, 2000); 
};

module.exports = {
    startResultScheduler,
    fetchAndParse 
};