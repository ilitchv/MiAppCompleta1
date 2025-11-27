
import { TicketData, WinningResult, PrizeTable } from '../types';
import { DEFAULT_PRIZE_TABLE } from '../constants';

const TICKETS_KEY = 'beast_tickets_db';
const RESULTS_KEY = 'beast_results_db';
const PRIZES_KEY = 'beast_prizes_db';

export const localDbService = {
    // --- TICKETS ---
    saveTicket: (ticket: TicketData) => {
        try {
            const existingStr = localStorage.getItem(TICKETS_KEY);
            const existing: TicketData[] = existingStr ? JSON.parse(existingStr) : [];
            
            if (!existing.some((t) => t.ticketNumber === ticket.ticketNumber)) {
                const ticketWithMeta: TicketData = { 
                    ...ticket, 
                    syncStatus: 'local', 
                    savedAt: new Date().toISOString() 
                };
                const updated = [ticketWithMeta, ...existing];
                localStorage.setItem(TICKETS_KEY, JSON.stringify(updated));
                console.log('✅ Ticket saved to Local DB');
            }
        } catch (e) {
            console.error('❌ Local DB Save Error', e);
        }
    },

    getTickets: (): TicketData[] => {
        try {
            const existingStr = localStorage.getItem(TICKETS_KEY);
            return existingStr ? JSON.parse(existingStr) : [];
        } catch (e) {
            console.error('❌ Local DB Read Error', e);
            return [];
        }
    },

    // --- RESULTS ---
    saveResult: (result: WinningResult) => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            let existing: WinningResult[] = existingStr ? JSON.parse(existingStr) : [];
            
            // Upsert logic: Remove existing result for same lottery+date if exists
            existing = existing.filter(r => r.id !== result.id);
            
            const updated = [result, ...existing];
            localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
            console.log('✅ Result saved to Local DB');
        } catch (e) {
            console.error('❌ Local DB Result Save Error', e);
        }
    },

    getResults: (): WinningResult[] => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            return existingStr ? JSON.parse(existingStr) : [];
        } catch (e) {
            console.error('❌ Local DB Result Read Error', e);
            return [];
        }
    },

    deleteResult: (id: string) => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            if (existingStr) {
                const existing: WinningResult[] = JSON.parse(existingStr);
                const updated = existing.filter(r => r.id !== id);
                localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
            }
        } catch (e) { console.error(e); }
    },

    // --- PRIZE TABLE ---
    savePrizeTable: (table: PrizeTable) => {
        try {
            localStorage.setItem(PRIZES_KEY, JSON.stringify(table));
        } catch (e) { console.error('Error saving prize table', e); }
    },

    getPrizeTable: (): PrizeTable => {
        try {
            const saved = localStorage.getItem(PRIZES_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_PRIZE_TABLE;
        } catch (e) { return DEFAULT_PRIZE_TABLE; }
    },

    // --- UTILS ---
    clearDb: () => {
        localStorage.removeItem(TICKETS_KEY);
        localStorage.removeItem(RESULTS_KEY);
        localStorage.removeItem(PRIZES_KEY);
    },
    
    getStats: () => {
        const tickets = localDbService.getTickets();
        const totalSales = tickets.reduce((acc, t) => acc + t.grandTotal, 0);
        const totalTickets = tickets.length;
        return { totalSales, totalTickets };
    }
};
