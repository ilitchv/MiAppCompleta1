
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Play, OcrResult, WizardPlay, CopiedWagers, ImageInterpretationResult, ServerHealth } from './types';
import { MAX_PLAYS, TRACK_CATEGORIES, WAGER_LIMITS } from './constants';
import { getTodayDateString, calculateRowTotal, determineGameMode, fileToBase64, expandBetSequence } from './utils/helpers';
import { interpretTicketImage, interpretNaturalLanguagePlays } from './services/geminiService';
import { useSound } from './hooks/useSound';
import { localDbService } from './services/localDbService'; // IMPORT LOCAL DB

// Import components
import Header from './components/Header';
import TrackSelector from './components/TrackSelector';
import DatePicker from './components/DatePicker';
import ActionsPanel from './components/ActionsPanel';
import PlaysTable from './components/PlaysTable';
import TotalDisplay from './components/TotalDisplay';
import OcrModal from './components/OcrModal';
import WizardModal from './components/WizardModal';
import TicketModal from './components/TicketModal';
import ValidationErrorModal from './components/ValidationErrorModal';
import ChatbotModal from './components/ChatbotModal';
import CalculatorModal from './components/CalculatorModal'; // NEW IMPORT
import { CUTOFF_TIMES } from './constants';

const LOCAL_STORAGE_KEY = 'beastReaderLottoState';

const getDefaultNewYorkTrack = (): string => {
    const now = new Date();
    const cutoffTime = new Date();
    // Cutoff is 14:30 (2:30 PM)
    cutoffTime.setHours(14, 30, 0, 0); 
    return now < cutoffTime ? 'New York AM' : 'New York PM';
};

// Create a map for quick lookup of track names
const allTracksMap = new Map<string, string>();
TRACK_CATEGORIES.forEach(category => {
    category.tracks.forEach(track => {
        allTracksMap.set(track.name.toLowerCase(), track.name);
    });
});

interface ToastNotification {
    show: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
}

interface PlaygroundAppProps {
    onClose?: () => void;
    language?: 'en' | 'es' | 'ht';
}

const PlaygroundApp: React.FC<PlaygroundAppProps> = ({ onClose, language = 'en' }) => {
    // State management
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [plays, setPlays] = useState<Play[]>([]);
    const [selectedPlayIds, setSelectedPlayIds] = useState<number[]>([]);
    const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<string[]>([getTodayDateString()]);
    const [copiedWagers, setCopiedWagers] = useState<CopiedWagers | null>(null);
    const [pulitoPositions, setPulitoPositions] = useState<number[]>([]);
    
    // Sound Hook
    const { isMuted, toggleMute, playSound } = useSound();

    // Modal states
    const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
    const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isValidationErrorModalOpen, setIsValidationErrorModalOpen] = useState(false);
    const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
    const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false); // NEW STATE
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Ticket State
    const [isTicketConfirmed, setIsTicketConfirmed] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');
    const [ticketImageBlob, setTicketImageBlob] = useState<Blob | null>(null);
    const [terminalId, setTerminalId] = useState('');
    const [cashierId, setCashierId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState<'success' | 'error' | null>(null);


    // Toast Notification State
    const [toast, setToast] = useState<ToastNotification>({ show: false, message: '', type: 'success' });

    // Server Health State
    const [serverHealth, setServerHealth] = useState<ServerHealth>('checking');
    const [dbErrorMsg, setDbErrorMsg] = useState<string>('');


    // Refs and state for keyboard navigation
    const [lastAddedPlayId, setLastAddedPlayId] = useState<number | null>(null);
    const addPlayButtonRef = useRef<HTMLButtonElement>(null);

    const focusAddPlayButton = () => {
        addPlayButtonRef.current?.focus();
    };

    // --- INITIAL FOCUS EFFECT ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (addPlayButtonRef.current) {
                addPlayButtonRef.current.focus();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // --- HEALTH CHECKER EFFECT ---
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const data = await res.json();
                    if (data.server === 'online') {
                        if (data.database === 'connected') {
                            setServerHealth('online');
                            setDbErrorMsg('');
                        } else {
                            setServerHealth('db_error');
                            setDbErrorMsg(data.error ? String(data.error).substring(0, 40) : 'DB Connection Failed');
                        }
                    } else {
                        setServerHealth('offline');
                        setDbErrorMsg('Server returned offline status');
                    }
                } else {
                    setServerHealth('offline');
                    setDbErrorMsg(`HTTP ${res.status}: API unreachable`);
                }
            } catch (e) {
                setServerHealth('offline');
                const errMsg = e instanceof Error ? e.message : 'Unknown Network Error';
                setDbErrorMsg(errMsg);
                if (e instanceof Error && e.name !== 'AbortError') {
                    console.warn('Health check failed:', e);
                }
            }
        };
        checkHealth();
        const interval = setInterval(checkHealth, 5000); 
        return () => clearInterval(interval);
    }, []);


    // Load state from localStorage
    useEffect(() => {
        try {
            const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                setPlays(savedState.plays || []);
                if (savedState.selectedTracks && savedState.selectedTracks.length > 0) {
                    setSelectedTracks(savedState.selectedTracks);
                } else {
                    setSelectedTracks([getDefaultNewYorkTrack()]);
                }
                let loadedDates = savedState.selectedDates;
                if (Array.isArray(loadedDates)) {
                    loadedDates = loadedDates.filter((d: any) => typeof d === 'string' && d !== 'null' && d.match(/^\d{4}-\d{2}-\d{2}$/));
                } else {
                    loadedDates = [];
                }
                if (loadedDates.length > 0) {
                    setSelectedDates(loadedDates);
                } else {
                    setSelectedDates([getTodayDateString()]);
                }
                setCopiedWagers(savedState.copiedWagers || null);
                setPulitoPositions(savedState.pulitoPositions || []);
            } else {
                setSelectedTracks([getDefaultNewYorkTrack()]);
                setSelectedDates([getTodayDateString()]);
            }
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setSelectedTracks([getDefaultNewYorkTrack()]);
            setSelectedDates([getTodayDateString()]);
        }
    }, []);

    // Generate/load Terminal and Cashier IDs
     useEffect(() => {
        let termId = localStorage.getItem('terminalId');
        let cashId = localStorage.getItem('cashierId');
        if (!termId) {
            termId = `BR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            localStorage.setItem('terminalId', termId);
        }
        if (!cashId) {
            cashId = `local-user-${Math.random().toString(36).substring(2, 6)}`;
            localStorage.setItem('cashierId', cashId);
        }
        setTerminalId(termId);
        setCashierId(cashId);
    }, []);

    // Save state to localStorage
    useEffect(() => {
        try {
            const stateToSave = { plays, selectedTracks, selectedDates, copiedWagers, pulitoPositions };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
        }
    }, [plays, selectedTracks, selectedDates, copiedWagers, pulitoPositions]);

    // Theme toggle logic
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
    }, [theme]);

    const toggleTheme = () => {
        playSound('toggle');
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    
    const triggerToast = (message: string, type: 'success' | 'warning' | 'error') => {
        if (type === 'success') playSound('success');
        if (type === 'error') playSound('error');
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
    };

    const addPlay = () => {
        if (plays.length >= MAX_PLAYS) return;
        const newPlay: Play = {
            id: Date.now() + Math.random(),
            betNumber: '',
            gameMode: '-',
            straightAmount: null,
            boxAmount: null,
            comboAmount: null
        };
        setPlays(prev => [...prev, newPlay]);
        setLastAddedPlayId(newPlay.id);
    };

    const updatePlay = (id: number, updatedPlay: Partial<Play>) => {
        setPlays(prev => prev.map(p => {
            if (p.id !== id) return p;
            const newPlay = { ...p, ...updatedPlay };
            if (updatedPlay.betNumber !== undefined) {
                newPlay.gameMode = determineGameMode(newPlay.betNumber, selectedTracks, pulitoPositions);
            }
            let gameModeForLimits = newPlay.gameMode;
            if (gameModeForLimits.startsWith('Pulito')) gameModeForLimits = 'Pulito';
            const limits = WAGER_LIMITS[gameModeForLimits];
            if (limits) {
                if (newPlay.straightAmount !== null && limits.straight !== null && newPlay.straightAmount > limits.straight) newPlay.straightAmount = limits.straight;
                if (newPlay.boxAmount !== null && limits.box !== null && newPlay.boxAmount > limits.box) newPlay.boxAmount = limits.box;
                if (newPlay.comboAmount !== null && limits.combo !== null && newPlay.comboAmount > limits.combo) newPlay.comboAmount = limits.combo;
            }
            return newPlay;
        }));
    };

    const deletePlay = (id: number) => {
        playSound('delete');
        setPlays(prev => prev.filter(p => p.id !== id));
        setSelectedPlayIds(prev => prev.filter(playId => playId !== id));
    };

    const deleteSelectedPlays = () => {
        setPlays(prev => prev.filter(p => !selectedPlayIds.includes(p.id)));
        setSelectedPlayIds([]);
    };
    
    const resetAll = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setPlays([]);
        setSelectedTracks([getDefaultNewYorkTrack()]);
        setSelectedDates([getTodayDateString()]);
        setCopiedWagers(null);
        setSelectedPlayIds([]);
        setPulitoPositions([]);
    };

    const handleCopyWagers = (play: Play) => {
        playSound('click');
        setCopiedWagers({ straightAmount: play.straightAmount, boxAmount: play.boxAmount, comboAmount: play.comboAmount });
        triggerToast('Wagers copied!', 'success');
    };

    const handlePasteWagers = () => {
        if (!copiedWagers || selectedPlayIds.length === 0) return;
        setPlays(currentPlays =>
            currentPlays.map(p => {
                if (selectedPlayIds.includes(p.id)) {
                    const updatedPlay = { ...p };
                     if (copiedWagers.straightAmount !== null) updatedPlay.straightAmount = copiedWagers.straightAmount;
                    if (copiedWagers.boxAmount !== null) updatedPlay.boxAmount = copiedWagers.boxAmount;
                    if (copiedWagers.comboAmount !== null) updatedPlay.comboAmount = copiedWagers.comboAmount;
                    return updatedPlay;
                }
                return p;
            })
        );
    };
    
    const handleAddPlaysFromWizard = (wizardPlays: WizardPlay[]) => {
        playSound('add');
        const newPlays: Play[] = wizardPlays.map((p, i) => ({
            id: Date.now() + Math.random() + i,
            betNumber: p.betNumber,
            gameMode: p.gameMode,
            straightAmount: p.straight,
            boxAmount: p.box,
            comboAmount: p.combo,
        }));
        setPlays(prev => [...prev, ...newPlays].slice(0, MAX_PLAYS));
        setIsWizardModalOpen(false);
    };
    
    const handleInterpretationResult = (result: ImageInterpretationResult) => {
        playSound('add');
        if (result.detectedTracks.length > 0) {
            const validTracks = result.detectedTracks
                .map(trackName => allTracksMap.get(trackName.toLowerCase()))
                .filter((trackName): trackName is string => !!trackName);
            if (validTracks.length > 0) {
                const now = new Date();
                const todayStr = getTodayDateString();
                const isTodaySelected = selectedDates.includes(todayStr);
                const openTracks: string[] = [];
                let closedCount = 0;
                validTracks.forEach(trackId => {
                    let isExpired = false;
                    if (isTodaySelected) {
                        const cutoff = CUTOFF_TIMES[trackId];
                        if (cutoff) {
                            const [hours, minutes] = cutoff.split(':').map(Number);
                            const cutoffTime = new Date();
                            cutoffTime.setHours(hours, minutes, 0, 0);
                            if (now > cutoffTime) isExpired = true;
                        }
                    }
                    if (!isExpired) openTracks.push(trackId);
                    else closedCount++;
                });
                if (closedCount > 0) triggerToast(`Note: ${closedCount} detected tracks were ignored because they are closed.`, 'warning');
                if (openTracks.length > 0) setSelectedTracks(openTracks);
            }
        }
        if (result.detectedDate) {
            const todayStr = getTodayDateString();
            if (result.detectedDate >= todayStr) setSelectedDates([result.detectedDate]);
        }
        if (result.plays.length > 0) {
            const newPlays: Play[] = result.plays.flatMap((p, i) => {
                const expandedNumbers = expandBetSequence(p.betNumber);
                const normalizeAmount = (amount: number | null) => {
                    if (amount === null) return null;
                    if (amount >= 10 && Number.isInteger(amount)) return amount / 100;
                    return amount;
                };
                const normalizedStraight = normalizeAmount(p.straightAmount);
                const normalizedBox = normalizeAmount(p.boxAmount);
                const normalizedCombo = normalizeAmount(p.comboAmount);
                return expandedNumbers.map((num, subIndex) => {
                    const gameMode = determineGameMode(num, selectedTracks, pulitoPositions);
                    return {
                        id: Date.now() + Math.random() + i + subIndex,
                        betNumber: num,
                        gameMode: gameMode,
                        straightAmount: normalizedStraight,
                        boxAmount: normalizedBox,
                        comboAmount: normalizedCombo,
                    };
                });
            });
            setPlays(prev => [...prev, ...newPlays].slice(0, MAX_PLAYS));
        }
        setIsOcrModalOpen(false);
        setIsChatbotModalOpen(false);
    };
    
    const baseTotal = useMemo(() => {
        return plays.reduce((acc, play) => {
            const rowTotal = calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount);
            return acc + rowTotal;
        }, 0);
    }, [plays]);

    const trackMultiplier = useMemo(() => {
      const nonSpecialTracks = selectedTracks.filter(t => t !== 'Venezuela' && t !== 'Pulito' && t !== 'New York Horses');
      return Math.max(1, nonSpecialTracks.length);
    }, [selectedTracks]);
    
    const dateMultiplier = useMemo(() => Math.max(1, selectedDates.length), [selectedDates]);
    const grandTotal = useMemo(() => baseTotal * trackMultiplier * dateMultiplier, [baseTotal, trackMultiplier, dateMultiplier]);
    
    const handleGenerateTicket = () => {
        const errors: string[] = [];
        const todayStr = getTodayDateString();
        const now = new Date();
        const standardTracks = selectedTracks.filter(t => t !== 'Venezuela' && t !== 'Pulito' && t !== 'New York Horses');
        const hasSpecialTrack = selectedTracks.some(t => t === 'Venezuela' || t === 'Pulito' || t === 'New York Horses');
        
        if (selectedTracks.length === 0) errors.push('Please select at least one track.');
        else if (hasSpecialTrack && standardTracks.length === 0) errors.push('When selecting a special track (Pulito, Horses, Venezuela), you must also select at least one other standard track.');
        else if (standardTracks.length === 0 && !hasSpecialTrack) errors.push('Please select at least one valid track.');

        if (plays.length === 0) errors.push('Please add at least one play.');
        if (selectedDates.length === 0) errors.push('Please select at least one date.');

        selectedDates.forEach(dateStr => {
            if (dateStr < todayStr) errors.push(`Invalid Date: ${dateStr} is in the past. Please remove it.`);
            if (dateStr === todayStr) {
                 selectedTracks.forEach(trackId => {
                    const cutoff = CUTOFF_TIMES[trackId];
                    if (cutoff) {
                        const [hours, minutes] = cutoff.split(':').map(Number);
                        const cutoffTime = new Date();
                        cutoffTime.setHours(hours, minutes, 0, 0);
                        if (now > cutoffTime) errors.push(`Track "${trackId}" has closed (${cutoff}). Remove it to generate ticket.`);
                    }
                });
            }
        });
        
        plays.forEach((play, index) => {
            if (!play.betNumber.trim()) errors.push(`Play #${index + 1}: Bet number is empty.`);
            else if (play.gameMode === '-') errors.push(`Play #${index + 1}: Bet number "${play.betNumber}" is invalid for the selected tracks.`);
            const total = calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount);
            if (total <= 0) errors.push(`Play #${index + 1}: Must have an amount greater than $0.`);

            let gameModeForLimits = play.gameMode;
            if (gameModeForLimits.startsWith('Pulito')) gameModeForLimits = 'Pulito';
            
            const limits = WAGER_LIMITS[gameModeForLimits];
            if (limits) {
                if (play.straightAmount !== null && limits.straight !== null && play.straightAmount > limits.straight) errors.push(`Play #${index + 1}: Straight wager $${play.straightAmount} exceeds limit ($${limits.straight}).`);
                if (play.boxAmount !== null && limits.box !== null && play.boxAmount > limits.box) errors.push(`Play #${index + 1}: Box wager $${play.boxAmount} exceeds limit ($${limits.box}).`);
                if (play.comboAmount !== null && limits.combo !== null && play.comboAmount > limits.combo) errors.push(`Play #${index + 1}: Combo wager $${play.comboAmount} exceeds limit ($${limits.combo}).`);
            }
        });

        if (errors.length > 0) {
            playSound('error');
            setValidationErrors(errors);
            setIsValidationErrorModalOpen(true);
        } else {
            playSound('open'); 
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ plays, selectedTracks, selectedDates, copiedWagers, pulitoPositions }));
            setIsTicketConfirmed(false);
            setLastSaveStatus(null);
            setTicketImageBlob(null);
            setTicketNumber('');
            setIsTicketModalOpen(true);
        }
    };

    const saveTicketToBackend = async (ticketData: any) => {
        setIsSaving(true);
        setLastSaveStatus(null);
        
        // INJECT PLAY METADATA
        const enrichedTicketData = {
            ...ticketData,
            plays: ticketData.plays.map((p: any, idx: number) => ({
                ...p,
                jugadaNumber: idx + 1,
                timestamp: new Date().toISOString()
            }))
        };
        
        // SAVE TO LOCAL DB
        localDbService.saveTicket(enrichedTicketData);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(enrichedTicketData),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to save ticket.');
            }
            console.log('Ticket saved to database successfully.');
            triggerToast('✅ Ticket saved to database.', 'success');
            setLastSaveStatus('success');
        } catch (error) {
            console.warn('Backend unavailable, ticket saved locally only.', error);
            triggerToast('⚠️ Offline Mode: Ticket saved locally.', 'warning');
            setLastSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const isTicketGenerationDisabled = useMemo(() => {
        if (plays.length === 0 || selectedDates.length === 0 || selectedTracks.length === 0) return true;
        const standardTracksCount = selectedTracks.filter(t => t !== 'Venezuela' && t !== 'Pulito' && t !== 'New York Horses').length;
        const hasSpecialTrack = selectedTracks.some(t => t === 'Venezuela' || t === 'Pulito' || t === 'New York Horses');
        if (hasSpecialTrack && standardTracksCount === 0) return true;
        if (standardTracksCount === 0 && !hasSpecialTrack) return true;
        return false;
    }, [plays.length, selectedDates.length, selectedTracks]);

    return (
        <div className="bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-200 min-h-screen p-2 sm:p-4 font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-4">
                <Header theme={theme} toggleTheme={toggleTheme} onClose={onClose} />
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-4">
                        <DatePicker selectedDates={selectedDates} onDatesChange={setSelectedDates} />
                        <TrackSelector 
                            selectedTracks={selectedTracks} 
                            onSelectionChange={(tracks) => { playSound('click'); setSelectedTracks(tracks); }}
                            selectedDates={selectedDates}
                            pulitoPositions={pulitoPositions}
                            onPulitoPositionsChange={(pos) => { playSound('click'); setPulitoPositions(pos); }}
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        <ActionsPanel 
                            onAddPlay={addPlay}
                            onDeleteSelected={deleteSelectedPlays}
                            onReset={resetAll}
                            onOpenOcr={() => setIsOcrModalOpen(true)}
                            onOpenWizard={() => setIsWizardModalOpen(true)}
                            onOpenChatbot={() => setIsChatbotModalOpen(true)}
                            onGenerateTicket={handleGenerateTicket}
                            isTicketGenerationDisabled={isTicketGenerationDisabled}
                            onPasteWagers={handlePasteWagers}
                            hasCopiedWagers={copiedWagers !== null}
                            hasSelectedPlays={selectedPlayIds.length > 0}
                            addPlayButtonRef={addPlayButtonRef}
                        />
                        
                        <div className="w-full flex justify-center items-center gap-4 mt-2 mb-4 relative z-20">
                             <div className={`px-4 py-0.5 rounded-full text-[10px] font-mono font-bold backdrop-blur-md border shadow-sm flex items-center gap-2 transition-all duration-500 ${serverHealth === 'online' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 opacity-80' : 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'}`} title={dbErrorMsg}>
                                <div className={`w-2 h-2 rounded-full ${serverHealth === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span>{serverHealth === 'online' ? 'SYSTEM ONLINE' : serverHealth === 'db_error' ? `DB ERROR: ${dbErrorMsg}` : serverHealth === 'checking' ? 'CONNECTING...' : dbErrorMsg ? `OFFLINE: ${dbErrorMsg}` : 'OFFLINE MODE'}</span>
                            </div>
                            
                            {/* Unified Tool Capsule */}
                            <div className="flex items-center gap-1 bg-gray-200 dark:bg-white/5 p-1 rounded-full border border-gray-300 dark:border-white/10 backdrop-blur-md shadow-sm">
                                {/* Calculator Button */}
                                <button onClick={() => { playSound('open'); setIsCalculatorModalOpen(true); }} className="p-2 rounded-full transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-white hover:bg-neon-cyan/20 hover:shadow-[0_0_10px_theme(colors.neon-cyan)]" title="Calculator">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="14"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                                </button>
                                
                                <div className="w-px h-4 bg-gray-400 dark:bg-white/20"></div>

                                {/* Sound Button (Holographic Wave) */}
                                <button onClick={toggleMute} className={`p-2 rounded-full transition-all duration-200 group ${isMuted ? 'text-gray-400 hover:text-gray-500' : 'text-neon-cyan hover:text-white hover:shadow-[0_0_10px_theme(colors.neon-cyan)] hover:bg-neon-cyan/20'}`} title={isMuted ? "Unmute" : "Mute"}>
                                    {isMuted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:animate-pulse"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <PlaysTable 
                            plays={plays} updatePlay={updatePlay} deletePlay={deletePlay} selectedPlayIds={selectedPlayIds} setSelectedPlayIds={setSelectedPlayIds} onCopyWagers={handleCopyWagers} lastAddedPlayId={lastAddedPlayId} focusAddPlayButton={focusAddPlayButton} selectedTracks={selectedTracks} pulitoPositions={pulitoPositions}
                        />
                        <TotalDisplay baseTotal={baseTotal} trackMultiplier={trackMultiplier} dateMultiplier={dateMultiplier} grandTotal={grandTotal} />
                    </div>
                </main>

                <OcrModal isOpen={isOcrModalOpen} onClose={() => setIsOcrModalOpen(false)} onSuccess={handleInterpretationResult} interpretTicketImage={interpretTicketImage} fileToBase64={fileToBase64} />
                <WizardModal isOpen={isWizardModalOpen} onClose={() => setIsWizardModalOpen(false)} onAddPlays={handleAddPlaysFromWizard} selectedTracks={selectedTracks} pulitoPositions={pulitoPositions} />
                 <TicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} plays={plays.filter(p => calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount) > 0)} selectedTracks={selectedTracks} selectedDates={selectedDates} grandTotal={grandTotal} isConfirmed={isTicketConfirmed} setIsConfirmed={setIsTicketConfirmed} ticketNumber={ticketNumber} setTicketNumber={setTicketNumber} ticketImageBlob={ticketImageBlob} setTicketImageBlob={setTicketImageBlob} terminalId={terminalId} cashierId={cashierId} onSaveTicket={saveTicketToBackend} isSaving={isSaving} serverHealth={serverHealth} lastSaveStatus={lastSaveStatus} />
                <ValidationErrorModal isOpen={isValidationErrorModalOpen} onClose={() => setIsValidationErrorModalOpen(false)} errors={validationErrors} />
                <ChatbotModal isOpen={isChatbotModalOpen} onClose={() => setIsChatbotModalOpen(false)} onSuccess={handleInterpretationResult} interpretTicketImage={interpretTicketImage} interpretNaturalLanguagePlays={interpretNaturalLanguagePlays} fileToBase64={fileToBase64} language={language} />
                <CalculatorModal isOpen={isCalculatorModalOpen} onClose={() => setIsCalculatorModalOpen(false)} />

                {toast.show && (
                    <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-[60] transition-all duration-300 animate-fade-in flex items-center gap-2 font-bold backdrop-blur-sm border ${toast.type === 'success' ? 'bg-green-500/90 text-white border-green-400' : toast.type === 'warning' ? 'bg-yellow-500/90 text-black border-yellow-400' : 'bg-red-500/90 text-white border-red-400'}`}>
                        <span>{toast.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaygroundApp;
