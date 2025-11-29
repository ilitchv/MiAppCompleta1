
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TicketData, WinningResult, PrizeTable, CalculationResult, AuditLogEntry } from '../types';
import { localDbService } from '../services/localDbService';
import { DEFAULT_PRIZE_TABLE, GAME_RULES_TEXT, RESULTS_CATALOG } from '../constants';
import { calculateWinnings } from '../utils/prizeCalculator';
import { fileToBase64, formatWinningResult } from '../utils/helpers';
import { interpretWinningResultsImage, interpretWinningResultsText } from '../services/geminiService';
import { processLocalOcr } from '../services/localOcrService';
import { useSound } from '../hooks/useSound';

// Declare jsQR from global scope
declare var jsQR: any;

interface AdminDashboardProps {
    onClose: () => void;
}

interface OcrStagingRow {
    id: string;
    source: string;
    targetId: string;
    value: string;
    status: 'pending' | 'saved';
}

// --- TRACK MAPPING FOR AUDIT (UI Name -> DB Result ID) ---
const TRACK_MAP: Record<string, string> = {
    // USA Regular
    'New York AM': 'usa/ny/Midday',
    'New York PM': 'usa/ny/Evening',
    'Georgia Midday': 'usa/ga/Midday',
    'Georgia Evening': 'usa/ga/Evening',
    'Georgia Night': 'usa/ga/Night',
    'New Jersey AM': 'usa/nj/Midday',
    'New Jersey PM': 'usa/nj/Evening',
    'Florida AM': 'usa/fl/Midday',
    'Florida PM': 'usa/fl/Evening',
    'Connect AM': 'usa/ct/Day',
    'Connect PM': 'usa/ct/Night',
    'Pennsylvania AM': 'usa/pa/Day',
    'Pennsylvania PM': 'usa/pa/Evening',
    
    // USA New
    'Texas Morning': 'usa/tx/Morning',
    'Texas Day': 'usa/tx/Day',
    'Texas Evening': 'usa/tx/Evening',
    'Texas Night': 'usa/tx/Night',
    'Maryland AM': 'usa/md/AM',
    'Maryland PM': 'usa/md/PM',
    'South C Midday': 'usa/sc/Midday',
    'South C Evening': 'usa/sc/Evening',
    'Michigan Day': 'usa/mi/Day',
    'Michigan Night': 'usa/mi/Night',
    'Delaware AM': 'usa/de/Day',
    'Delaware PM': 'usa/de/Night',
    'Tennessee Midday': 'usa/tn/Midday',
    'Tennessee Evening': 'usa/tn/Evening',
    'Massachusetts Midday': 'usa/ma/Midday',
    'Massachusetts Evening': 'usa/ma/Evening',
    'Virginia Day': 'usa/va/Day',
    'Virginia Night': 'usa/va/Night',
    'North Carolina AM': 'usa/nc/Day',
    'North Carolina PM': 'usa/nc/Evening',

    // Santo Domingo
    'La Primera': 'rd/primer/AM',
    'Lotedom': 'rd/lotedom/Tarde',
    'La Suerte': 'rd/suerte/AM',
    'La Suerte PM': 'rd/suerte/PM',
    'Loteria Real': 'rd/real/Mediodía',
    'Gana Mas': 'rd/ganamas/Tarde',
    'Loteka': 'rd/loteka/Noche',
    'Quiniela Pale': 'rd/quiniela/Diario',
    'Nacional': 'rd/nacional/Noche',

    // Special
    'New York Horses': 'special/ny-horses/R1',
    'Brooklyn Midday': 'special/ny-bk/AM',
    'Brooklyn Evening': 'special/ny-bk/PM',
    'Front Midday': 'special/ny-fp/AM',
    'Front Evening': 'special/ny-fp/PM',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'sales' | 'results' | 'ocr' | 'payouts' | 'winners'>('sales');
    const [salesViewMode, setSalesViewMode] = useState<'tickets' | 'plays'>('tickets'); 
    const { playSound } = useSound();
    
    // SALES STATE
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);

    // SCANNER STATE
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const qrFileInputRef = useRef<HTMLInputElement>(null); 

    // RESULTS STATE
    const [results, setResults] = useState<WinningResult[]>([]);
    const [resultsSearch, setResultsSearch] = useState('');
    const [isAddResultOpen, setIsAddResultOpen] = useState(false);
    const [viewResultsDate, setViewResultsDate] = useState(new Date().toISOString().split('T')[0]); // Date for VIEWING results
    
    // DELETE & AUDIT STATE (NEW)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resultToDelete, setResultToDelete] = useState<string | null>(null);
    const [deletePin, setDeletePin] = useState('');
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

    // OCR STATE
    const [ocrImage, setOcrImage] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrResults, setOcrResults] = useState<OcrStagingRow[]>([]);
    const [ocrDate, setOcrDate] = useState(new Date().toISOString().split('T')[0]); // Date for UPLOADING results
    const ocrFileInputRef = useRef<HTMLInputElement>(null);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [successCount, setSuccessCount] = useState(0);

    // PAYOUTS STATE
    const [prizeTable, setPrizeTable] = useState<PrizeTable>(DEFAULT_PRIZE_TABLE);
    const [winners, setWinners] = useState<CalculationResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    
    // CALCULATOR TOOL STATE
    const [calcGame, setCalcGame] = useState('Pick 3');
    const [calcType, setCalcType] = useState('STRAIGHT');
    const [calcWager, setCalcWager] = useState<string>('1');
    const [calcIsNY, setCalcIsNY] = useState(true);
    const [activeRule, setActiveRule] = useState<number | null>(null);

    // New Result Form Variables
    const [newResultTrack, setNewResultTrack] = useState('');
    const [newResult1st, setNewResult1st] = useState('');
    const [newResult2nd, setNewResult2nd] = useState('');
    const [newResult3rd, setNewResult3rd] = useState('');
    const [newResultP3, setNewResultP3] = useState('');
    const [newResultP4, setNewResultP4] = useState('');

    // Flatten tracks for dropdown using RESULTS_CATALOG to ensure ID consistency
    const allTracks = RESULTS_CATALOG.map(c => ({
        id: c.id,
        name: `${c.lottery} - ${c.draw}`,
        originalName: c.lottery
    }));

    // LOAD DATA
    const loadResultsFromDb = () => {
        const resultData = localDbService.getResults();
        resultData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setResults(resultData);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoadingTickets(true);
            
            const localTickets = localDbService.getTickets();
            localTickets.sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime());
            setTickets(localTickets);
            setFilteredTickets(localTickets);

            try {
                const res = await fetch('/api/tickets');
                if (res.ok) {
                    const remoteTickets: TicketData[] = await res.json();
                    remoteTickets.sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime());
                    setTickets(remoteTickets);
                    setFilteredTickets(remoteTickets);
                }
            } catch (error) {
                console.warn("Admin Dashboard offline: showing local data only.");
            } finally {
                setIsLoadingTickets(false);
            }

            loadResultsFromDb();
            setPrizeTable(localDbService.getPrizeTable());
        };

        fetchAllData();
    }, []);

    // FILTER TICKETS
    useEffect(() => {
        let res = tickets;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(t => 
                t.ticketNumber.toLowerCase().includes(lower) || 
                t.tracks.some(tr => tr.toLowerCase().includes(lower))
            );
        }
        if (dateFilter) {
            res = res.filter(t => {
                const tDate = new Date(t.transactionDateTime).toISOString().split('T')[0];
                return tDate === dateFilter;
            });
        }
        setFilteredTickets(res);
    }, [searchTerm, dateFilter, tickets]);

    // --- WINNERS AUDIT LOGIC (CORE) ---
    const auditStats = useMemo(() => {
        let totalPayout = 0;
        const winningTicketsMap = new Map<string, boolean>();
        const winnersList: any[] = [];
        const integrityBreaches: any[] = [];
        const resultsLiabilityMap: Record<string, number> = {}; // ResultID -> Payout Amount

        tickets.forEach(ticket => {
            const ticketTime = new Date(ticket.transactionDateTime).getTime();

            ticket.plays.forEach(play => {
                // LIFE CYCLE: Iterate over all scheduled dates for this ticket (Futures supported)
                ticket.betDates.forEach(date => {
                    // Iterate over all tracks selected
                    ticket.tracks.forEach(trackName => {
                        const resultId = TRACK_MAP[trackName];
                        if (!resultId) return; // Skip if track not mapped

                        // STRICT MATCHING: Result must match Track ID AND Date (not ticket date, but bet date)
                        const result = results.find(r => r.lotteryId === resultId && r.date === date);

                        if (result) {
                            // --- INTEGRITY CHECK ---
                            const resultTime = new Date(result.createdAt).getTime();
                            // Allow 60s tolerance for clock drifts. Ticket must be sold BEFORE result created.
                            const integrityOk = ticketTime < (resultTime + 60000); 

                            // --- CALCULATION ---
                            const wins = calculateWinnings(play, result, prizeTable);
                            
                            if (wins.length > 0) {
                                const totalWinForPlay = wins.reduce((sum, w) => sum + w.prizeAmount, 0);
                                
                                if (totalWinForPlay > 0) {
                                    const winnerEntry = {
                                        id: `${ticket.ticketNumber}-${play.jugadaNumber}-${trackName}-${date}`,
                                        ticketNumber: ticket.ticketNumber,
                                        date: date, // The date it played for
                                        track: trackName,
                                        betNumber: play.betNumber,
                                        gameMode: play.gameMode,
                                        prize: totalWinForPlay,
                                        integrityOk,
                                        matchType: wins.map(w => w.matchType).join(', '),
                                        resultNumbers: formatWinningResult(result),
                                        timeGapSeconds: Math.round((resultTime - ticketTime) / 1000),
                                        soldAt: ticket.transactionDateTime
                                    };

                                    winnersList.push(winnerEntry);
                                    
                                    if (integrityOk) {
                                        totalPayout += totalWinForPlay;
                                        winningTicketsMap.set(ticket.ticketNumber, true);
                                        
                                        // Update Liability for this specific result entry
                                        if (!resultsLiabilityMap[result.id]) resultsLiabilityMap[result.id] = 0;
                                        resultsLiabilityMap[result.id] += totalWinForPlay;
                                    } else {
                                        integrityBreaches.push(winnerEntry);
                                    }
                                }
                            }
                        }
                        // If no result found, Play is PENDING/ACTIVE.
                    });
                });
            });
        });

        // Sort winners by date desc
        winnersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            totalPayout,
            winningTicketsCount: winningTicketsMap.size,
            winnersList,
            integrityBreaches,
            resultsLiabilityMap
        };
    }, [tickets, results, prizeTable]);

    const flattenedPlays = filteredTickets.flatMap(t => 
        t.plays.map(p => ({
            ...p,
            parentTicketNumber: t.ticketNumber,
            parentTransactionDate: t.transactionDateTime,
            parentBetDates: t.betDates,
            parentTracks: t.tracks,
            finalTimestamp: p.timestamp || t.transactionDateTime 
        }))
    );

    // Filter Results for Display
    const displayedResults = results.filter(r => {
        if (r.date !== viewResultsDate) return false;
        if (resultsSearch && !r.lotteryName.toLowerCase().includes(resultsSearch.toLowerCase())) return false;
        return true;
    });

    // --- HELPER: Robust Parsing Logic ---
    const parseRowValue = (val: string) => {
        const cleaned = val.replace(/-{2,}|x{2,}/gi, '').trim();
        const parts = cleaned.split(/[\s\-\t,]+/).filter(p => /^\d+$/.test(p));

        let f = '', s = '', t = '', p3 = '', p4 = '';

        const p3Candidates = parts.filter(p => p.length === 3);
        const p4Candidates = parts.filter(p => p.length === 4);
        
        if (p3Candidates.length > 0) p3 = p3Candidates[p3Candidates.length - 1];
        if (p4Candidates.length > 0) p4 = p4Candidates[p4Candidates.length - 1];

        const pairCandidates = parts.filter(p => p.length <= 2);
        
        if (pairCandidates.length > 0) f = pairCandidates[0].padStart(2, '0');
        if (pairCandidates.length > 1) s = pairCandidates[1].padStart(2, '0');
        if (pairCandidates.length > 2) t = pairCandidates[2].padStart(2, '0');

        return { f, s, t, p3, p4 };
    };

    // --- SCANNER LOGIC ---
    const startScan = async () => {
        setIsScanning(true);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true");
                    videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const stopScan = () => {
        setIsScanning(false);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        processQrData(imageData.data, imageData.width, imageData.height);
                    }
                }
            };
            img.src = event.target.result as string;
        };
        reader.readAsDataURL(file);
        if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    };

    const processQrData = (data: Uint8ClampedArray, width: number, height: number) => {
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(data, width, height, { inversionAttempts: "dontInvert" });
            if (code) {
                const match = code.data.match(/Ticket\s*#?(T-[A-Z0-9]+)/i);
                if (match) {
                    const ticketId = match[1];
                    const ticket = tickets.find(t => t.ticketNumber === ticketId);
                    if (ticket) {
                        stopScan();
                        playBeep();
                        setSelectedTicket(ticket);
                        return;
                    } else {
                        alert("Ticket not found in database. Try syncing.");
                    }
                } else {
                    alert("QR Code format not recognized.");
                }
            }
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                processQrData(imageData.data, imageData.width, imageData.height);
            }
        }
        if (isScanning) {
            animationRef.current = requestAnimationFrame(tick);
        }
    };

    const playBeep = () => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => osc.stop(), 100);
    };

    // --- AUTO-CALCULATION HANDLERS ---
    const handleP3Change = (val: string) => {
        setNewResultP3(val);
        // Clean non-digits
        const clean = val.replace(/\D/g, '');
        if (clean.length >= 2) {
            setNewResult1st(clean.slice(-2));
        }
    };

    const handleP4Change = (val: string) => {
        setNewResultP4(val);
        // Clean non-digits
        const clean = val.replace(/\D/g, '');
        if (clean.length >= 2) {
            setNewResult2nd(clean.slice(0, 2));
            setNewResult3rd(clean.slice(-2));
        }
    };

    const handleSaveResult = (e: React.FormEvent) => {
        e.preventDefault();
        // Allow saving if at least P3 or P4 or 1st is present
        if (!newResultTrack || !viewResultsDate || (!newResult1st && !newResultP3 && !newResultP4)) return;
        
        const trackObj = allTracks.find(t => t.id === newResultTrack);
        if (!trackObj) return;
        
        let f = newResult1st;
        let s = newResult2nd;
        let t = newResult3rd;

        // Auto-calculate Venezuela positions if empty but P3/P4 exist (Final fallback)
        if (!f && !s && !t) {
             const p3Clean = newResultP3.replace(/\D/g, '');
             const p4Clean = newResultP4.replace(/\D/g, '');
             
             if (p3Clean.length >= 2) f = p3Clean.slice(-2);
             if (p4Clean.length >= 2) s = p4Clean.slice(0, 2);
             if (p4Clean.length >= 2) t = p4Clean.slice(-2);
        }

        const newResult: WinningResult = {
            id: `${viewResultsDate}_${newResultTrack}`,
            date: viewResultsDate,
            lotteryId: newResultTrack,
            lotteryName: trackObj.originalName, 
            first: f,
            second: s,
            third: t,
            pick3: newResultP3,
            pick4: newResultP4,
            createdAt: new Date().toISOString()
        };
        localDbService.saveResult(newResult);
        loadResultsFromDb();
        setIsAddResultOpen(false);
        setNewResult1st(''); setNewResult2nd(''); setNewResult3rd(''); setNewResultP3(''); setNewResultP4('');
        // Auto-switch view to the date we just added for
        setViewResultsDate(viewResultsDate); 
    };

    // --- DELETE / EDIT LOGIC WITH SECURITY ---
    const handleDeleteInitiate = (id: string) => {
        playSound('pop');
        setResultToDelete(id);
        setDeletePin('');
        setIsDeleteModalOpen(true);
    };

    const handleEditInitiate = (result: WinningResult) => {
        playSound('click');
        setViewResultsDate(result.date);
        setNewResultTrack(result.lotteryId);
        setNewResult1st(result.first);
        setNewResult2nd(result.second);
        setNewResult3rd(result.third);
        setNewResultP3(result.pick3);
        setNewResultP4(result.pick4);
        setIsAddResultOpen(true); // Opens the modal with pre-filled data (Acts as Upsert)
    };

    const handleConfirmDelete = () => {
        if (deletePin === '198312') {
            if (resultToDelete) {
                localDbService.deleteResult(resultToDelete);
                loadResultsFromDb();
                playSound('delete');
            }
            setIsDeleteModalOpen(false);
            setResultToDelete(null);
            setDeletePin('');
        } else {
            playSound('error');
            alert("INCORRECT PIN. ACCESS DENIED.");
            setDeletePin('');
        }
    };

    const handleOpenAuditLog = () => {
        setAuditLog(localDbService.getAuditLog());
        setIsAuditLogOpen(true);
    };

    // --- OCR LOGIC ---
    const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setOcrImage(base64);
                // DO NOT AUTO PROCESS ON UPLOAD NOW - Wait for user choice
            } catch (err) {
                console.error(err);
                alert("Error reading file.");
            }
        }
        if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const base64 = await fileToBase64(file);
                    setOcrImage(base64);
                    // DO NOT AUTO PROCESS ON PASTE NOW - Wait for user choice
                }
            }
        }
    };

    // CLOUD OCR (GEMINI)
    const handleProcessOcr = async (base64: string) => {
        setIsProcessingOcr(true);
        setOcrResults([]);
        try {
            const catalogIds = allTracks.map(t => t.id);
            const parsed = await interpretWinningResultsImage(base64, catalogIds);
            
            const rows: OcrStagingRow[] = parsed.map((p, idx) => ({
                id: `ocr-${Date.now()}-${idx}`,
                source: p.source,
                targetId: p.targetId || '',
                value: p.value,
                status: 'pending'
            }));
            setOcrResults(rows);
        } catch (e) {
            console.error(e);
            alert("OCR Failed. Please try again.");
        } finally {
            setIsProcessingOcr(false);
        }
    };

    // LOCAL OCR (TESSERACT)
    const handleProcessLocalOcr = async (base64: string) => {
        setIsProcessingOcr(true);
        setOcrResults([]);
        try {
            const parsed = await processLocalOcr(base64);
            const rows: OcrStagingRow[] = parsed.map((p, idx) => ({
                id: `loc-${Date.now()}-${idx}`,
                source: p.source,
                targetId: p.targetId || '',
                value: p.value,
                status: 'pending'
            }));
            
            if (rows.length === 0) {
                alert("Local OCR found no matches. Try AI mode for better results.");
            }
            setOcrResults(rows);
        } catch (e) {
            console.error(e);
            alert("Local OCR Failed. Ensure Tesseract loaded.");
        } finally {
            setIsProcessingOcr(false);
        }
    };

    const handleProcessText = async () => {
        if (!ocrText.trim()) return;
        setIsProcessingOcr(true);
        setOcrResults([]);
        try {
            const catalogIds = allTracks.map(t => t.id);
            const parsed = await interpretWinningResultsText(ocrText, catalogIds);
            
            const rows: OcrStagingRow[] = parsed.map((p, idx) => ({
                id: `txt-${Date.now()}-${idx}`,
                source: p.source,
                targetId: p.targetId || '',
                value: p.value,
                status: 'pending'
            }));
            setOcrResults(rows);
        } catch (e) {
            console.error(e);
            alert("Text processing failed. Check logs.");
        } finally {
            setIsProcessingOcr(false);
        }
    };

    const handleOcrRowChange = (id: string, field: keyof OcrStagingRow, value: string) => {
        setOcrResults(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleSaveOcrRow = (row: OcrStagingRow) => {
        if (!row.targetId || !row.value) return alert("Please select a valid lottery and check value.");
        
        const trackObj = allTracks.find(t => t.id === row.targetId);
        if (!trackObj) return;

        // Use robust parser
        let { f, s, t, p3, p4 } = parseRowValue(row.value);

        // Auto-fill Venezuela if missing
        if ((!f || !s || !t) && (p3 || p4)) {
            if (!f && p3 && p3.length >= 2) f = p3.slice(-2);
            if (!s && p4 && p4.length >= 2) s = p4.slice(0, 2);
            if (!t && p4 && p4.length >= 2) t = p4.slice(-2);
        }

        const newResult: WinningResult = {
            id: `${ocrDate}_${row.targetId}`, 
            date: ocrDate,                    
            lotteryId: row.targetId,
            lotteryName: trackObj.originalName, // Use Original Name from Catalog
            first: f, second: s, third: t,
            pick3: p3, pick4: p4,
            createdAt: new Date().toISOString()
        };

        localDbService.saveResult(newResult);
        setOcrResults(prev => prev.map(r => r.id === row.id ? { ...r, status: 'saved' } : r));
        loadResultsFromDb(); // Background refresh
        setViewResultsDate(ocrDate); // Auto-switch view
    };

    // --- BATCH SAVE FOR OCR (FIXED & INFORMATIVE) ---
    const handleSaveAllOcrRows = () => {
        const pendingRows = ocrResults.filter(r => r.status !== 'saved');
        
        if (pendingRows.length === 0) {
            alert("No pending rows to save.");
            return;
        }

        // Count how many pending rows have a valid Target ID (Lottery selected)
        const validPendingRows = pendingRows.filter(r => r.targetId && r.targetId.trim() !== '');
        
        // CRITICAL CHECK: If user hits "Save All" but hasn't mapped anything, WARN THEM.
        if (validPendingRows.length === 0) {
            alert(`Found ${pendingRows.length} pending rows, but NONE have a Lottery (Map) selected.\n\nPlease select a Lottery for the rows you want to save.`);
            return;
        }

        // Direct map approach - Safer state update
        let savedCount = 0;
        const newResults = ocrResults.map(row => {
            // Skip already saved
            if (row.status === 'saved') return row;

            // Skip if no target ID (leave as pending)
            if (!row.targetId || !row.targetId.trim()) {
                return row; 
            }

            // Skip if no value
            if (!row.value || !row.value.trim()) {
                return row;
            }

            const trackObj = allTracks.find(t => t.id === row.targetId);
            if (!trackObj) return row; 

            // Parse and Save
            try {
                let { f, s, t, p3, p4 } = parseRowValue(row.value);

                // Auto-fill Venezuela if missing
                if ((!f || !s || !t) && (p3 || p4)) {
                    if (!f && p3 && p3.length >= 2) f = p3.slice(-2);
                    if (!s && p4 && p4.length >= 2) s = p4.slice(0, 2);
                    if (!t && p4 && p4.length >= 2) t = p4.slice(-2);
                }

                const resultEntry: WinningResult = {
                    id: `${ocrDate}_${row.targetId}`,
                    date: ocrDate,
                    lotteryId: row.targetId,
                    lotteryName: trackObj.originalName,
                    first: f, second: s, third: t, pick3: p3, pick4: p4,
                    createdAt: new Date().toISOString()
                };

                // Save Sync
                localDbService.saveResult(resultEntry);
                savedCount++;
                
                // Return updated row status
                return { ...row, status: 'saved' as const };
            } catch (e) {
                console.error("Row save failed", e);
                return row;
            }
        });

        if (savedCount > 0) {
            setOcrResults(newResults);
            loadResultsFromDb(); // Refresh the main list
            
            // AUTO-SWITCH VIEW TO OCR DATE to show user the results
            setViewResultsDate(ocrDate);
            
            setSuccessCount(savedCount);
            setShowSuccessOverlay(true);
            playSound('success');
            setTimeout(() => setShowSuccessOverlay(false), 2500);
            
            // If we saved some but not all, verify if there are leftovers
            const remaining = newResults.filter(r => r.status !== 'saved').length;
            if (remaining > 0) {
                console.log(`${remaining} rows skipped due to missing Map/Value.`);
            }
        }
    };

    // --- PAYOUTS LOGIC ---
    const handlePrizeTableChange = (game: string, type: string, value: string) => {
        const newVal = parseFloat(value);
        if (isNaN(newVal)) return;
        const newTable = { ...prizeTable };
        if (!newTable[game]) newTable[game] = {};
        newTable[game][type] = newVal;
        setPrizeTable(newTable);
        localDbService.savePrizeTable(newTable);
    };

    const handleRunCalculation = () => {
        setIsCalculating(true);
        setTimeout(() => {
            const detectedWinners: CalculationResult[] = [];
            tickets.forEach(ticket => {
                ticket.plays.forEach(play => {
                    ticket.betDates.forEach(date => {
                        ticket.tracks.forEach(trackId => {
                            const result = results.find(r => r.date === date && r.lotteryId === trackId);
                            if (result) {
                                const wins = calculateWinnings(play, result, prizeTable);
                                wins.forEach(w => {
                                    detectedWinners.push({
                                        ...w,
                                        ticketNumber: ticket.ticketNumber,
                                        playNumber: play.jugadaNumber
                                    });
                                });
                            }
                        });
                    });
                });
            });
            setWinners(detectedWinners);
            setIsCalculating(false);
        }, 500);
    };

    // --- MANUAL CALCULATOR LOGIC ---
    const getCalculatedPayout = () => {
        const gameTable = prizeTable[calcGame];
        if (!gameTable) return 0;
        let multiplier = gameTable[calcType] || 0;
        if (calcGame === 'Win 4' && !calcIsNY) multiplier = multiplier / 2;
        const wagerVal = parseFloat(calcWager);
        return isNaN(wagerVal) ? 0 : wagerVal * multiplier;
    };

    const totalSales = filteredTickets.reduce((acc, t) => acc + t.grandTotal, 0);
    const totalPlays = filteredTickets.reduce((acc, t) => acc + t.plays.length, 0);
    
    // Net Profit Calculation for Winners Tab
    const netProfit = totalSales - auditStats.totalPayout;

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 font-sans" onPaste={activeTab === 'ocr' ? handlePaste : undefined}>
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-neon-cyan to-blue-600 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                        BO
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">BEAST OFFICE</h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin Command Center</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-700 rounded-lg p-1">
                    <button onClick={() => setActiveTab('sales')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'sales' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Sales</button>
                    <button onClick={() => setActiveTab('results')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'results' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Results</button>
                    <button onClick={() => setActiveTab('winners')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'winners' ? 'bg-neon-green text-black shadow' : 'text-gray-400 hover:text-white'}`}>Winners</button>
                    <button onClick={() => setActiveTab('ocr')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'ocr' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>OCR</button>
                    <button onClick={() => setActiveTab('payouts')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'payouts' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Payouts</button>
                </div>

                <button onClick={onClose} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded border border-red-500/30 transition-all text-sm font-bold">
                    EXIT
                </button>
            </header>

            <div className="p-6 max-w-[1800px] mx-auto space-y-6">
                
                {/* SALES TAB */}
                {activeTab === 'sales' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Sales</p>
                                <p className="text-3xl font-bold text-green-400">${totalSales.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Tickets Sold</p>
                                <p className="text-3xl font-bold text-blue-400">{filteredTickets.length}</p>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Plays</p>
                                <p className="text-3xl font-bold text-purple-400">{totalPlays}</p>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-4 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Search Ticket ID..." 
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-neon-cyan outline-none w-64"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <input 
                                    type="date" 
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-neon-cyan outline-none text-gray-300"
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                />
                                <button onClick={() => {setSearchTerm(''); setDateFilter('')}} className="text-xs text-slate-400 hover:text-white underline">Clear</button>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {isLoadingTickets && (
                                    <span className="text-xs text-neon-cyan animate-pulse flex items-center gap-2">
                                        <div className="w-2 h-2 bg-neon-cyan rounded-full"></div> Syncing with Cloud...
                                    </span>
                                )}
                                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                    <button onClick={() => setSalesViewMode('tickets')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${salesViewMode === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Tickets View</button>
                                    <button onClick={() => setSalesViewMode('plays')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${salesViewMode === 'plays' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>Plays View</button>
                                </div>
                                <button onClick={startScan} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 border border-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
                                    Scan QR
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                            <div className="overflow-x-auto max-h-[600px]">
                                {salesViewMode === 'tickets' ? (
                                    <table className="w-full text-sm text-left text-slate-400">
                                        <thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Ticket #</th>
                                                <th className="p-4">Tracks</th>
                                                <th className="p-4 text-center">Plays</th>
                                                <th className="p-4 text-right">Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {filteredTickets.map(ticket => (
                                                <tr key={ticket.ticketNumber} onClick={() => setSelectedTicket(ticket)} className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                                                    <td className="p-4 text-white font-bold">{new Date(ticket.transactionDateTime).toLocaleString()}</td>
                                                    <td className="p-4 font-mono text-neon-cyan">{ticket.ticketNumber}</td>
                                                    <td className="p-4 max-w-xs truncate" title={ticket.tracks.join(', ')}>{ticket.tracks.length > 2 ? `${ticket.tracks[0]} +${ticket.tracks.length-1}` : ticket.tracks.join(', ')}</td>
                                                    <td className="p-4 text-center">{ticket.plays.length}</td>
                                                    <td className="p-4 text-right font-bold text-green-400">${ticket.grandTotal.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full text-xs text-left text-gray-300 whitespace-nowrap">
                                        <thead className="bg-slate-900/90 text-[10px] uppercase font-bold border-b border-slate-700 sticky top-0 z-10 text-gray-500">
                                            <tr>
                                                <th className="p-3">Ticket Number</th>
                                                <th className="p-3">Transaction DateTime</th>
                                                <th className="p-3">Jugada Number</th>
                                                <th className="p-3">Timestamp</th>
                                                <th className="p-3">Bet Dates</th>
                                                <th className="p-3">Tracks</th>
                                                <th className="p-3">Bet Number</th>
                                                <th className="p-3">Game Mode</th>
                                                <th className="p-3 text-right">Straight ($)</th>
                                                <th className="p-3 text-right">Box ($)</th>
                                                <th className="p-3 text-right">Combo ($)</th>
                                                <th className="p-3 text-right">Total ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700 bg-slate-800">
                                            {flattenedPlays.map((play, idx) => (
                                                <tr key={`${play.parentTicketNumber}_${idx}`} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-3 font-mono text-neon-cyan">{play.parentTicketNumber}</td>
                                                    <td className="p-3">{new Date(play.parentTransactionDate).toLocaleString()}</td>
                                                    <td className="p-3 text-center">{play.jugadaNumber}</td>
                                                    <td className="p-3 font-mono text-slate-500">{new Date(play.finalTimestamp as string).toLocaleTimeString()}</td>
                                                    <td className="p-3 max-w-[150px] truncate" title={play.parentBetDates.join(', ')}>{play.parentBetDates.join(', ')}</td>
                                                    <td className="p-3 max-w-[200px] truncate" title={play.parentTracks.join(', ')}>{play.parentTracks.join(', ')}</td>
                                                    <td className="p-3 font-bold font-mono text-white text-base">{play.betNumber}</td>
                                                    <td className="p-3">{play.gameMode}</td>
                                                    <td className="p-3 text-right font-mono">{play.straightAmount ? play.straightAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-mono">{play.boxAmount ? play.boxAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-mono">{play.comboAmount ? play.comboAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-bold text-green-400">${play.totalAmount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* WINNERS TAB (NEW) */}
                {activeTab === 'winners' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Payout</p>
                                <p className="text-3xl font-bold text-neon-green">${auditStats.totalPayout.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Winning Tickets</p>
                                <p className="text-3xl font-bold text-white">{auditStats.winningTicketsCount}</p>
                            </div>
                            <div className={`bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden ${netProfit < 0 ? 'border-red-500/50' : 'border-green-500/50'}`}>
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Net Profit</p>
                                <p className={`text-3xl font-bold ${netProfit < 0 ? 'text-red-500' : 'text-blue-400'}`}>${netProfit.toFixed(2)}</p>
                            </div>
                        </div>

                        {auditStats.integrityBreaches.length > 0 && (
                            <div className="bg-red-900/30 border border-red-500 p-4 rounded-xl flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-1"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                <div>
                                    <h3 className="font-bold text-red-500">Integrity Breach Detected</h3>
                                    <p className="text-sm text-red-200">Found {auditStats.integrityBreaches.length} winning tickets sold AFTER result declaration. Marked as VOID.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 text-gray-500">
                                        <tr>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Ticket</th>
                                            <th className="p-4">Date / Track</th>
                                            <th className="p-4">Match</th>
                                            <th className="p-4">Time Gap</th>
                                            <th className="p-4 text-right">Prize</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {auditStats.winnersList.map((win, idx) => (
                                            <tr key={win.id || idx} className="hover:bg-slate-700/50">
                                                <td className="p-4">
                                                    {win.integrityOk ? (
                                                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase border border-green-500/30">PAID</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold uppercase border border-red-500/30">VOID</span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-mono text-neon-cyan">{win.ticketNumber}</td>
                                                <td className="p-4 text-xs">
                                                    <div className="font-bold text-white">{win.track}</div>
                                                    <div className="text-slate-500">{win.date}</div>
                                                </td>
                                                <td className="p-4 text-xs">
                                                    <div className="flex gap-2">
                                                        <span className="font-mono text-white">Bet: {win.betNumber}</span>
                                                        <span className="font-mono text-green-400">Res: {win.resultNumbers}</span>
                                                    </div>
                                                    <div className="text-slate-500 mt-1">{win.gameMode} ({win.matchType})</div>
                                                </td>
                                                <td className="p-4 text-xs font-mono text-slate-400">
                                                    {win.timeGapSeconds > 0 ? (
                                                        <span className="text-green-500">Sold {Math.abs(win.timeGapSeconds)}s before</span>
                                                    ) : (
                                                        <span className="text-red-500 font-bold">Sold {Math.abs(win.timeGapSeconds)}s AFTER</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-bold text-neon-green text-lg">${win.prize.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {auditStats.winnersList.length === 0 && (
                                            <tr><td colSpan={6} className="p-12 text-center text-gray-500">No winners found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* RESULTS TAB (RESTRUCTURED) */}
                {activeTab === 'results' && (
                    <>
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Search Lottery..." 
                                    value={resultsSearch}
                                    onChange={e => setResultsSearch(e.target.value)}
                                    className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:border-neon-cyan"
                                />
                                <input 
                                    type="date" 
                                    required 
                                    value={viewResultsDate} 
                                    onChange={e=>setViewResultsDate(e.target.value)} 
                                    className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:border-neon-cyan" 
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleOpenAuditLog} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold rounded shadow border border-slate-600 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                    View Log
                                </button>
                                <button onClick={() => setIsAddResultOpen(true)} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Add Manual Result
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 text-gray-500">
                                        <tr>
                                            <th className="p-4 text-center w-32">Date</th>
                                            <th className="p-4 w-1/4">Lotería</th>
                                            <th className="p-4 text-center text-blue-400 w-20">first</th>
                                            <th className="p-4 text-center w-20">second</th>
                                            <th className="p-4 text-center w-20">third</th>
                                            <th className="p-4 text-center text-purple-400 w-24">pick_3</th>
                                            <th className="p-4 text-center text-orange-400 w-24">pick_4</th>
                                            <th className="p-4 text-right">Hits / Payout</th>
                                            <th className="p-4 text-right w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {displayedResults.map(res => {
                                            const payout = auditStats.resultsLiabilityMap[res.id] || 0;
                                            return (
                                                <tr key={res.id} className="hover:bg-slate-700/50">
                                                    <td className="p-4 text-center font-mono text-xs text-gray-400">{res.date}</td>
                                                    <td className="p-4 font-bold text-white">
                                                        {res.lotteryName} <span className="text-xs font-normal text-slate-500 ml-1">({res.lotteryId.split('/').pop()})</span>
                                                    </td>
                                                    <td className="p-4 text-center font-mono font-bold text-lg text-blue-400">{res.first || '---'}</td>
                                                    <td className="p-4 text-center font-mono text-base">{res.second || '---'}</td>
                                                    <td className="p-4 text-center font-mono text-base">{res.third || '---'}</td>
                                                    <td className="p-4 text-center font-mono text-purple-400">{res.pick3 || '---'}</td>
                                                    <td className="p-4 text-center font-mono text-orange-400">{res.pick4 || '---'}</td>
                                                    <td className={`p-4 text-right font-mono font-bold ${payout > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {payout > 0 ? `-$${payout.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => handleEditInitiate(res)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-600 rounded transition-colors" title="Edit">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteInitiate(res.id)} className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {displayedResults.length === 0 && (
                                            <tr><td colSpan={9} className="p-12 text-center text-gray-500">No results found for {viewResultsDate}.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-red-600 rounded-xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-fade-in text-center">
                            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <h3 className="text-xl font-bold text-red-500 uppercase tracking-widest mb-1">Security Clearance</h3>
                            <p className="text-gray-400 text-sm mb-6">Enter PIN to authorize deletion.</p>
                            
                            <input 
                                type="password" 
                                autoFocus
                                value={deletePin}
                                onChange={e => setDeletePin(e.target.value)}
                                className="w-full bg-black border border-red-900 rounded p-3 text-center text-2xl tracking-[0.5em] text-red-500 font-mono focus:border-red-500 outline-none mb-6"
                                placeholder="******"
                            />
                            
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded transition-colors">CANCEL</button>
                                <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-black font-bold rounded transition-colors shadow-lg shadow-red-900/50">CONFIRM</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AUDIT LOG MODAL */}
                {isAuditLogOpen && (
                    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsAuditLogOpen(false)}>
                        <div className="bg-slate-950 w-full max-w-4xl h-[80vh] rounded-lg border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col font-mono text-xs" onClick={e => e.stopPropagation()}>
                            <div className="p-3 border-b border-green-900 bg-black flex justify-between items-center">
                                <h3 className="text-green-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 animate-pulse"></span>
                                    System Audit Log
                                </h3>
                                <button onClick={() => setIsAuditLogOpen(false)} className="text-green-700 hover:text-green-400">[CLOSE]</button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                                {auditLog.length === 0 ? (
                                    <p className="text-green-900 italic">No audit records found.</p>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="text-green-700 border-b border-green-900 sticky top-0 bg-slate-950">
                                            <tr>
                                                <th className="py-2 w-32">TIMESTAMP</th>
                                                <th className="py-2 w-20">USER</th>
                                                <th className="py-2 w-20">ACTION</th>
                                                <th className="py-2">DETAILS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-green-400 divide-y divide-green-900/30">
                                            {auditLog.map((log) => (
                                                <tr key={log.id} className="hover:bg-green-900/10 transition-colors">
                                                    <td className="py-2 pr-2 opacity-70">{new Date(log.timestamp).toLocaleString()}</td>
                                                    <td className="py-2 pr-2">{log.user}</td>
                                                    <td className="py-2 pr-2 font-bold">{log.action}</td>
                                                    <td className="py-2">{log.details}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TICKET DETAIL MODAL (FIXED MOBILE SCROLL) */}
                {selectedTicket && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTicket(null)}>
                        {/* CHANGED: overflow-y-auto on wrapper for mobile scroll, lg:overflow-hidden for desktop layout */}
                        <div className="bg-slate-800 w-full max-w-5xl h-[90vh] lg:h-[85vh] overflow-y-auto lg:overflow-hidden rounded-xl shadow-2xl flex flex-col lg:flex-row border border-slate-600" onClick={e => e.stopPropagation()}>
                            <div className="lg:w-1/3 bg-black p-4 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col items-center">
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 w-full text-center">Original Ticket Snapshot</h3>
                                {selectedTicket.ticketImage ? (
                                    <img src={selectedTicket.ticketImage} alt="Proof" className="w-full object-contain shadow-lg border border-slate-700" />
                                ) : (
                                    <div className="flex-grow flex items-center justify-center text-gray-500 italic py-10">No Image Available</div>
                                )}
                            </div>
                            <div className="lg:w-2/3 p-6 flex flex-col min-h-0">
                                <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Ticket #{selectedTicket.ticketNumber}</h2>
                                        <p className="text-gray-400 text-sm">{new Date(selectedTicket.transactionDateTime).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                        <p className="text-[10px] text-gray-500 uppercase">Bet Dates</p>
                                        <p className="text-sm font-bold text-white truncate">{selectedTicket.betDates.join(', ')}</p>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                        <p className="text-[10px] text-gray-500 uppercase">Tracks</p>
                                        <p className="text-sm font-bold text-white truncate" title={selectedTicket.tracks.join(', ')}>{selectedTicket.tracks.join(', ')}</p>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                        <p className="text-[10px] text-gray-500 uppercase">Grand Total</p>
                                        <p className="text-lg font-bold text-green-400">${selectedTicket.grandTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                        <p className="text-[10px] text-gray-500 uppercase">Total Plays</p>
                                        <p className="text-lg font-bold text-white">{selectedTicket.plays.length}</p>
                                    </div>
                                </div>

                                {/* CHANGED: Specific height on mobile to ensure scrolling within flex column */}
                                <div className="flex-grow overflow-y-auto bg-slate-900 rounded-lg border border-slate-700 min-h-[300px]">
                                    <table className="w-full text-xs text-left text-gray-300">
                                        <thead className="bg-slate-800 text-gray-500 uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-3">#</th>
                                                <th className="p-3">Bet</th>
                                                <th className="p-3">Mode</th>
                                                <th className="p-3 text-right">Str</th>
                                                <th className="p-3 text-right">Box</th>
                                                <th className="p-3 text-right">Com</th>
                                                <th className="p-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {selectedTicket.plays.map((play, i) => (
                                                <tr key={i} className="hover:bg-slate-800/50">
                                                    <td className="p-3">{i + 1}</td>
                                                    <td className="p-3 font-bold font-mono text-white text-sm">{play.betNumber}</td>
                                                    <td className="p-3">{play.gameMode}</td>
                                                    <td className="p-3 text-right font-mono">{play.straightAmount ? play.straightAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-mono">{play.boxAmount ? play.boxAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-mono">{play.comboAmount ? play.comboAmount.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right font-bold text-green-400">
                                                        ${calculateWinnings(play, {id:'mock', date:'', lotteryId:'', lotteryName:'', first:'', second:'', third:'', pick3:'', pick4:'', createdAt:''}, prizeTable).length > 0 ? 'WIN' : (play.totalAmount ? play.totalAmount.toFixed(2) : '-')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ADD RESULT MODAL (WITH AUTO-FILL) */}
                {isAddResultOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-800 w-full max-w-md p-6 rounded-xl border border-slate-600 shadow-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">Add Manual Result</h3>
                            <form onSubmit={handleSaveResult} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Date</label>
                                        <input type="date" required value={viewResultsDate} onChange={e=>setViewResultsDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Lottery</label>
                                        <select required value={newResultTrack} onChange={e=>setNewResultTrack(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">
                                            <option value="">Select...</option>
                                            {allTracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-blue-400 font-bold mb-1">1st</label>
                                        <input type="text" maxLength={2} required value={newResult1st} onChange={e=>setNewResult1st(e.target.value)} className="w-full bg-slate-900 border border-blue-500/50 rounded p-2 text-center text-xl font-bold text-white" placeholder="00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">2nd</label>
                                        <input type="text" maxLength={2} value={newResult2nd} onChange={e=>setNewResult2nd(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-center text-lg text-white" placeholder="00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">3rd</label>
                                        <input type="text" maxLength={2} value={newResult3rd} onChange={e=>setNewResult3rd(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-center text-lg text-white" placeholder="00" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-purple-400 mb-1">Pick 3</label>
                                        <input type="text" maxLength={3} value={newResultP3} onChange={e=>handleP3Change(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-center text-white font-mono" placeholder="000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-orange-400 mb-1">Pick 4</label>
                                        <input type="text" maxLength={4} value={newResultP4} onChange={e=>handleP4Change(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-center text-white font-mono" placeholder="0000" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button type="button" onClick={() => setIsAddResultOpen(false)} className="px-4 py-2 bg-slate-700 rounded text-gray-300">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-neon-cyan text-black font-bold rounded hover:brightness-110">Save Result</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* SCANNER OVERLAY */}
            {isScanning && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="p-4 flex justify-between items-center bg-black/80 absolute top-0 w-full z-10 backdrop-blur-sm">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
                            Scan Ticket QR
                        </h2>
                        <button onClick={stopScan} className="text-white bg-slate-800/80 rounded-full p-2 hover:bg-slate-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    
                    <div className="flex-grow relative bg-black">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"></video>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-neon-cyan rounded-xl relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-neon-cyan -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-neon-cyan -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-neon-cyan -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-neon-cyan -mb-1 -mr-1"></div>
                            </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>

                    <div className="p-6 bg-black/80 backdrop-blur-sm flex flex-col gap-4 items-center">
                        <p className="text-gray-300 text-sm">Point camera at QR code or upload image</p>
                        <input type="file" ref={qrFileInputRef} accept="image/*" className="hidden" onChange={handleQrFileUpload}/>
                        <button onClick={() => qrFileInputRef.current?.click()} className="w-full max-w-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg border border-slate-600 flex items-center justify-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            Upload Image from Gallery
                        </button>
                    </div>
                </div>
            )}

            {/* SUCCESS OVERLAY */}
            {showSuccessOverlay && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-xl border border-neon-green p-8 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.4)] flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-neon-green rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_theme(colors.neon-green)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Success</h2>
                        <p className="text-lg text-green-400 font-bold">{successCount} Results Saved</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
