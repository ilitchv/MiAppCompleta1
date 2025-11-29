
import { TicketData, WinningResult, PrizeTable, AuditLogEntry } from '../types';
import { DEFAULT_PRIZE_TABLE } from '../constants';

const TICKETS_KEY = 'beast_tickets_db';
const RESULTS_KEY = 'beast_results_db';
const PRIZES_KEY = 'beast_prizes_db';
const AUDIT_KEY = 'beast_audit_log_db';

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

    // --- RESULTS (WITH AUDIT) ---
    saveResult: (result: WinningResult) => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            let existing: WinningResult[] = existingStr ? JSON.parse(existingStr) : [];
            
            // Check if exists to determine Action Type
            const previousIndex = existing.findIndex(r => r.id === result.id);
            const isUpdate = previousIndex !== -1;
            
            // Remove existing result for same lottery+date if exists
            if (isUpdate) {
                existing.splice(previousIndex, 1);
            }
            
            const updated = [result, ...existing];
            localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
            
            // LOG AUDIT
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: isUpdate ? 'UPDATE' : 'CREATE',
                targetId: result.id,
                details: isUpdate 
                    ? `Updated result for ${result.lotteryName} (${result.date}). New val: ${result.first}-${result.second}-${result.third}` 
                    : `Created result for ${result.lotteryName} (${result.date}). Val: ${result.first}-${result.second}-${result.third}`,
                user: 'Admin'
            });

            console.log('✅ Result saved/audited to Local DB');
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
                const target = existing.find(r => r.id === id);
                
                if (target) {
                    const updated = existing.filter(r => r.id !== id);
                    localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));

                    // LOG AUDIT
                    localDbService.logAction({
                        id: Date.now().toString(),
                        timestamp: new Date().toISOString(),
                        action: 'DELETE',
                        targetId: id,
                        details: `Deleted result for ${target.lotteryName} (${target.date}). Data was: ${target.first}-${target.second}-${target.third}`,
                        user: 'Admin'
                    });
                }
            }
        } catch (e) { console.error(e); }
    },

    // --- AUDIT LOG SYSTEM ---
    logAction: (entry: AuditLogEntry) => {
        try {
            const logStr = localStorage.getItem(AUDIT_KEY);
            const logs: AuditLogEntry[] = logStr ? JSON.parse(logStr) : [];
            // Add new entry at the top
            logs.unshift(entry);
            // Optional: Limit log size to prevent storage overflow (e.g., keep last 1000)
            if (logs.length > 1000) logs.length = 1000;
            localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to write audit log', e);
        }
    },

    getAuditLog: (): AuditLogEntry[] => {
        try {
            const logStr = localStorage.getItem(AUDIT_KEY);
            return logStr ? JSON.parse(logStr) : [];
        } catch (e) { return []; }
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
        // NOTE: AUDIT LOG IS NOT CLEARED HERE TO PRESERVE INTEGRITY
    },
    
    getStats: () => {
        const tickets = localDbService.getTickets();
        const totalSales = tickets.reduce((acc, t) => acc + t.grandTotal, 0);
        const totalTickets = tickets.length;
        return { totalSales, totalTickets };
    }
};
