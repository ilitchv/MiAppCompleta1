
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import TrackSelector from './components/TrackSelector';
import DatePicker from './components/DatePicker';
import ActionsPanel from './components/ActionsPanel';
import PlaysTable from './components/PlaysTable';
import TotalDisplay from './components/TotalDisplay';
import TicketModal from './components/TicketModal';
import OcrModal from './components/OcrModal';
import WizardModal from './components/WizardModal';
import ChatbotModal from './components/ChatbotModal';
import CalculatorModal from './components/CalculatorModal';
import ValidationErrorModal from './components/ValidationErrorModal';
import { MAX_PLAYS, WAGER_LIMITS } from './constants';
import { Play, ImageInterpretationResult, WizardPlay, ServerHealth, CopiedWagers } from './types';
import { calculateRowTotal, getTodayDateString, fileToBase64, determineGameMode } from './utils/helpers';
import { interpretTicketImage, interpretNaturalLanguagePlays } from './services/geminiService';
import { localDbService } from './services/localDbService';
import { useSound } from './hooks/useSound';

interface PlaygroundAppProps {
    onClose: () => void;
    language: 'en' | 'es' | 'ht';
}

const PlaygroundApp: React.FC<PlaygroundAppProps> = ({ onClose, language }) => {
    // --- STATE ---
    const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<string[]>([getTodayDateString()]);
    const [plays, setPlays] = useState<Play[]>([]);
    const [selectedPlayIds, setSelectedPlayIds] = useState<number[]>([]);
    const [pulitoPositions, setPulitoPositions] = useState<number[]>([]);
    
    // Modals
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isValidationErrorOpen, setIsValidationErrorOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Ticket State
    const [ticketNumber, setTicketNumber] = useState('');
    const [ticketImageBlob, setTicketImageBlob] = useState<Blob | null>(null);
    const [isTicketConfirmed, setIsTicketConfirmed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState<'success' | 'error' | null>(null);
    const [serverHealth, setServerHealth] = useState<ServerHealth>('checking');

    // Utils
    const [copiedWagers, setCopiedWagers] = useState<CopiedWagers | null>(null);
    const [lastAddedPlayId, setLastAddedPlayId] = useState<number | null>(null);
    const addPlayButtonRef = useRef<HTMLButtonElement>(null);
    const { playSound, isMuted, toggleMute } = useSound();

    // --- EFFECTS ---
    useEffect(() => {
        checkServerHealth();
    }, []);

    // --- REACTIVE GAME MODE SYNCHRONIZATION (PICK 2 FIX) ---
    // Automatically updates existing plays when user changes Tracks or Pulito Positions
    useEffect(() => {
        setPlays(prevPlays => {
            let hasChanges = false;
            const updatedPlays = prevPlays.map(play => {
                // Skip empty plays or non-changeable ones
                if (!play.betNumber) return play;

                // Re-calculate mode based on NEW track selection
                const newMode = determineGameMode(play.betNumber, selectedTracks, pulitoPositions);

                // If the mode is different (e.g. was 'Pick 2', now becomes 'Venezuela'), update it
                if (newMode !== play.gameMode) {
                    hasChanges = true;
                    return { ...play, gameMode: newMode };
                }
                return play;
            });

            // Only trigger a re-render if data actually changed
            return hasChanges ? updatedPlays : prevPlays;
        });
    }, [selectedTracks, pulitoPositions]);

    // --- HELPERS ---
    const checkServerHealth = async () => {
        try {
            const res = await fetch('/api/health');
            if (res.ok) setServerHealth('online');
            else setServerHealth('offline');
        } catch {
            setServerHealth('offline');
        }
    };

    const getNextId = () => {
        return plays.length > 0 ? Math.max(...plays.map(p => p.id)) + 1 : 1;
    };

    // --- HANDLERS ---

    const handleAddPlay = () => {
        if (plays.length >= MAX_PLAYS) {
            alert(`Maximum of ${MAX_PLAYS} plays reached.`);
            return;
        }
        const newId = getNextId();
        const newPlay: Play = {
            id: newId,
            betNumber: '',
            gameMode: '-',
            straightAmount: null,
            boxAmount: null,
            comboAmount: null
        };
        setPlays(prev => [...prev, newPlay]);
        setLastAddedPlayId(newId);
    };

    const handleUpdatePlay = (id: number, updatedFields: Partial<Play>) => {
        setPlays(prev => prev.map(play => {
            if (play.id !== id) return play;
            
            const updatedPlay = { ...play, ...updatedFields };
            
            // Auto-detect game mode if betNumber changed
            if (updatedFields.betNumber !== undefined) {
                updatedPlay.gameMode = determineGameMode(updatedPlay.betNumber, selectedTracks, pulitoPositions);
            }

            return updatedPlay;
        }));
    };

    const handleDeletePlay = (id: number) => {
        setPlays(prev => prev.filter(p => p.id !== id));
        setSelectedPlayIds(prev => prev.filter(pid => pid !== id));
    };

    const handleDeleteSelected = () => {
        if (selectedPlayIds.length === 0) return;
        setPlays(prev => prev.filter(p => !selectedPlayIds.includes(p.id)));
        setSelectedPlayIds([]);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to clear all plays and selections?')) {
            setPlays([]);
            setSelectedTracks([]);
            setPulitoPositions([]);
            setSelectedDates([getTodayDateString()]);
            setSelectedPlayIds([]);
            setTicketNumber('');
            setIsTicketConfirmed(false);
            setTicketImageBlob(null);
        }
    };

    // --- INTEGRATIONS ---

    const handleOcrSuccess = (result: ImageInterpretationResult) => {
        // Merge Logic
        if (result.detectedDate) {
            setSelectedDates([result.detectedDate]);
        }
        if (result.detectedTracks.length > 0) {
            // Logic to map OCR track names to IDs would go here.
        }

        const newPlays: Play[] = result.plays.map((p, index) => {
            const betNumber = p.betNumber.replace(/[^0-9-xX]/g, '');
            return {
                id: getNextId() + index,
                betNumber: betNumber,
                gameMode: determineGameMode(betNumber, selectedTracks, pulitoPositions),
                straightAmount: p.straightAmount,
                boxAmount: p.boxAmount,
                comboAmount: p.comboAmount
            };
        });

        setPlays(prev => [...prev, ...newPlays]);
        playSound('success');
    };

    const handleWizardAddPlays = (wizardPlays: WizardPlay[]) => {
        const newPlays: Play[] = wizardPlays.map((wp, index) => ({
            id: getNextId() + index,
            betNumber: wp.betNumber,
            gameMode: wp.gameMode,
            straightAmount: wp.straight,
            boxAmount: wp.box,
            comboAmount: wp.combo
        }));
        setPlays(prev => [...prev, ...newPlays]);
        setIsWizardOpen(false);
        playSound('add');
    };

    // --- COPY / PASTE ---
    const handleCopyWagers = (play: Play) => {
        setCopiedWagers({
            straightAmount: play.straightAmount,
            boxAmount: play.boxAmount,
            comboAmount: play.comboAmount
        });
        playSound('click');
    };

    const handlePasteWagers = () => {
        if (!copiedWagers || selectedPlayIds.length === 0) return;
        
        setPlays(prev => prev.map(p => {
            if (selectedPlayIds.includes(p.id)) {
                return {
                    ...p,
                    ...copiedWagers
                };
            }
            return p;
        }));
        playSound('pop');
    };

    // --- TICKET GENERATION & VALIDATION ---

    const handleGenerateTicket = () => {
        const errors: string[] = [];

        if (selectedTracks.length === 0) errors.push("Please select at least one track/lottery.");
        if (selectedDates.length === 0) errors.push("Please select at least one date.");
        if (plays.length === 0) errors.push("Please add at least one play.");

        // Validation logic
        plays.forEach((play, index) => {
            if (!play.betNumber.trim()) errors.push(`Play #${index + 1}: Bet number is empty.`);
            else if (play.gameMode === '-') errors.push(`Play #${index + 1}: Bet number "${play.betNumber}" is invalid for the selected tracks.`);
            
            // CRITICAL VALIDATION: Pick 2 is a transitional state. Block it.
            if (play.gameMode === 'Pick 2') {
                errors.push(`Play #${index + 1}: 'Pick 2' is ambiguous. Please select 'Venezuela' or 'Pulito' track to define 2-digit plays.`);
            }

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
            setValidationErrors(errors);
            setIsValidationErrorOpen(true);
            playSound('error');
            return;
        }

        // All good
        setTicketNumber(''); // Will be generated in modal or backend
        setIsTicketConfirmed(false);
        setTicketImageBlob(null);
        setLastSaveStatus(null);
        setIsTicketModalOpen(true);
    };

    const handleSaveTicket = async (ticketData: any) => {
        setIsSaving(true);
        
        // 1. Save locally first (Optimistic UI)
        localDbService.saveTicket(ticketData);

        // 2. Try to sync with server
        try {
            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData),
            });

            if (response.ok) {
                setLastSaveStatus('success');
                playSound('success');
            } else {
                setLastSaveStatus('error');
                // Even if server fails, it's saved locally.
            }
        } catch (error) {
            console.error("Save error:", error);
            setLastSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- CALCULATIONS ---
    const baseTotal = plays.reduce((acc, p) => acc + calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount), 0);
    
    const trackMultiplier = selectedTracks.length > 0 ? selectedTracks.length : 1;
    const dateMultiplier = selectedDates.length > 0 ? selectedDates.length : 1;
    
    // Refined Grand Total Calculation
    const grandTotal = plays.reduce((acc, p) => {
        const rowTotal = calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount);
        if (p.gameMode.startsWith('Pulito')) {
            // Pulito implies the Pulito track is selected. Track multiplier doesn't apply the same way (it's 1 track).
            return acc + (rowTotal * dateMultiplier);
        }
        return acc + (rowTotal * trackMultiplier * dateMultiplier);
    }, 0);


    return (
        <div className="flex flex-col h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* 1. Header (Inside App) */}
            <div className="flex-shrink-0">
                <Header theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} toggleTheme={() => { /* Handled by MainApp */ }} onClose={onClose} />
            </div>

            {/* 2. Main Scrollable Area */}
            <div className="flex-grow overflow-y-auto p-2 sm:p-4 space-y-4">
                
                <TrackSelector 
                    selectedTracks={selectedTracks} 
                    onSelectionChange={setSelectedTracks}
                    selectedDates={selectedDates}
                    pulitoPositions={pulitoPositions}
                    onPulitoPositionsChange={setPulitoPositions}
                />

                <DatePicker 
                    selectedDates={selectedDates}
                    onDatesChange={setSelectedDates}
                />

                <ActionsPanel 
                    onAddPlay={handleAddPlay}
                    onDeleteSelected={handleDeleteSelected}
                    onReset={handleReset}
                    onOpenOcr={() => setIsOcrOpen(true)}
                    onOpenWizard={() => setIsWizardOpen(true)}
                    onOpenChatbot={() => setIsChatbotOpen(true)}
                    onGenerateTicket={handleGenerateTicket}
                    isTicketGenerationDisabled={plays.length === 0}
                    onPasteWagers={handlePasteWagers}
                    hasCopiedWagers={!!copiedWagers}
                    hasSelectedPlays={selectedPlayIds.length > 0}
                    addPlayButtonRef={addPlayButtonRef}
                />

                {/* UTILITY BAR (RESTORED) */}
                <div className="flex justify-between items-center px-1 animate-fade-in">
                    <div className="flex gap-2">
                        <button 
                            onClick={toggleMute}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs font-bold ${isMuted ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                        >
                            {isMuted ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
                                    Muted
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                                    Sound On
                                </>
                            )}
                        </button>
                        
                        <button 
                            onClick={() => setIsCalculatorOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-xs font-bold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="14"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                            Payouts
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/10 dark:bg-black/30 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/5">
                        <div className={`w-2 h-2 rounded-full ${serverHealth === 'online' ? 'bg-green-500 shadow-[0_0_5px_theme(colors.green.500)]' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-mono font-bold opacity-70 uppercase tracking-wider">
                            {serverHealth === 'online' ? 'DB Online' : 'DB Offline'}
                        </span>
                    </div>
                </div>

                <PlaysTable 
                    plays={plays}
                    updatePlay={handleUpdatePlay}
                    deletePlay={handleDeletePlay}
                    selectedPlayIds={selectedPlayIds}
                    setSelectedPlayIds={setSelectedPlayIds}
                    onCopyWagers={handleCopyWagers}
                    lastAddedPlayId={lastAddedPlayId}
                    focusAddPlayButton={() => addPlayButtonRef.current?.focus()}
                    selectedTracks={selectedTracks}
                    pulitoPositions={pulitoPositions}
                />

                <TotalDisplay 
                    baseTotal={baseTotal}
                    trackMultiplier={trackMultiplier}
                    dateMultiplier={dateMultiplier}
                    grandTotal={grandTotal}
                />
            </div>

            {/* 3. Modals */}
            <OcrModal 
                isOpen={isOcrOpen} 
                onClose={() => setIsOcrOpen(false)}
                onSuccess={handleOcrSuccess}
                interpretTicketImage={interpretTicketImage}
                fileToBase64={fileToBase64}
            />

            <WizardModal 
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onAddPlays={handleWizardAddPlays}
                selectedTracks={selectedTracks}
                pulitoPositions={pulitoPositions}
            />

            <ChatbotModal 
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                onSuccess={handleOcrSuccess}
                interpretTicketImage={interpretTicketImage}
                interpretNaturalLanguagePlays={interpretNaturalLanguagePlays}
                fileToBase64={fileToBase64}
                language={language}
            />

            <CalculatorModal 
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />

            <TicketModal 
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                plays={plays}
                selectedTracks={selectedTracks}
                selectedDates={selectedDates}
                grandTotal={grandTotal}
                isConfirmed={isTicketConfirmed}
                setIsConfirmed={setIsTicketConfirmed}
                ticketNumber={ticketNumber}
                setTicketNumber={setTicketNumber}
                ticketImageBlob={ticketImageBlob}
                setTicketImageBlob={setTicketImageBlob}
                terminalId="TERM-001"
                cashierId="USER-A"
                onSaveTicket={handleSaveTicket}
                isSaving={isSaving}
                serverHealth={serverHealth}
                lastSaveStatus={lastSaveStatus}
            />

            <ValidationErrorModal 
                isOpen={isValidationErrorOpen}
                onClose={() => setIsValidationErrorOpen(false)}
                errors={validationErrors}
            />
        </div>
    );
};

export default PlaygroundApp;
