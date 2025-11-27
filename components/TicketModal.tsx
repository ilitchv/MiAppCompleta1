
import React, { useRef, useEffect, useState } from 'react';
import type { Play, ServerHealth } from '../types';
import { calculateRowTotal } from '../utils/helpers';
import { useSound } from '../hooks/useSound';

declare var QRCode: any;
declare var html2canvas: any;
declare var jspdf: any;

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    plays: Play[];
    selectedTracks: string[];
    selectedDates: string[];
    grandTotal: number;
    isConfirmed: boolean;
    setIsConfirmed: (isConfirmed: boolean) => void;
    ticketNumber: string;
    setTicketNumber: (ticketNumber: string) => void;
    ticketImageBlob: Blob | null;
    setTicketImageBlob: (blob: Blob | null) => void;
    terminalId: string;
    cashierId: string;
    onSaveTicket: (ticketData: any) => void;
    isSaving: boolean;
    serverHealth: ServerHealth;
    lastSaveStatus: 'success' | 'error' | null;
}

const TicketModal: React.FC<TicketModalProps> = ({ 
    isOpen, onClose, plays, selectedTracks, selectedDates, grandTotal, 
    isConfirmed, setIsConfirmed, ticketNumber, setTicketNumber, 
    ticketImageBlob, setTicketImageBlob, terminalId, cashierId,
    onSaveTicket, isSaving, serverHealth, lastSaveStatus
}) => {
    const ticketContentRef = useRef<HTMLDivElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { playSound } = useSound();

    // Generate a cryptographically secure, collision-resistant ID
    const generateSecureTicketId = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const length = 10;
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        
        let result = 'T-';
        for (let i = 0; i < length; i++) {
            result += chars[randomValues[i] % chars.length];
        }
        return result;
    };

    useEffect(() => {
        if (isConfirmed && ticketNumber && qrCodeRef.current) {
            qrCodeRef.current.innerHTML = '';
            new QRCode(qrCodeRef.current, {
                text: `Ticket #${ticketNumber}`,
                width: 128,
                height: 128,
            });
        }
    }, [isConfirmed, ticketNumber]);

    useEffect(() => {
        const modalElement = modalRef.current;
        if (isOpen && modalElement) {
            const handleWheel = (e: WheelEvent) => { e.stopPropagation(); };
            const handleTouchMove = (e: TouchEvent) => { e.stopPropagation(); };
            modalElement.addEventListener('wheel', handleWheel, { passive: true });
            modalElement.addEventListener('touchmove', handleTouchMove, { passive: true });
            return () => {
                modalElement.removeEventListener('wheel', handleWheel);
                modalElement.removeEventListener('touchmove', handleTouchMove);
            };
        }
    }, [isOpen]);


    const handleConfirmAndPrint = async () => {
        playSound('warp'); // Celebration Sound triggers here!
        const newTicketNumber = generateSecureTicketId();
        setIsConfirmed(true);
        setTicketNumber(newTicketNumber);
    
        setTimeout(async () => {
            const ticketElement = ticketContentRef.current;
            if (ticketElement && qrCodeRef.current) {
                qrCodeRef.current.innerHTML = '';
                new QRCode(qrCodeRef.current, {
                    text: `Ticket #${newTicketNumber}`,
                    width: 128,
                    height: 128,
                });
                
                await new Promise(resolve => setTimeout(resolve, 50));

                try {
                    // --- Step 1: Capture High-Res for User ---
                    const canvas = await html2canvas(ticketElement, { 
                        scale: 3, 
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        width: ticketElement.scrollWidth,
                        height: ticketElement.scrollHeight,
                        windowWidth: ticketElement.scrollWidth,
                        windowHeight: ticketElement.scrollHeight
                    });
    
                    const pngUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `ticket-${newTicketNumber}.png`;
                    link.href = pngUrl;
                    link.click();
    
                    const { jsPDF } = jspdf;
                    const imgData = canvas.toDataURL('image/jpeg', 0.9); 
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgProps = pdf.getImageProperties(imgData);
                    const aspectRatio = imgProps.height / imgProps.width;
                    let finalImgWidth = pdfWidth - 20; 
                    let finalImgHeight = finalImgWidth * aspectRatio;
                    if (finalImgHeight > pdfHeight - 20) {
                        finalImgHeight = pdfHeight - 20;
                        finalImgWidth = finalImgHeight / aspectRatio;
                    }
                    const x = (pdfWidth - finalImgWidth) / 2;
                    const y = 10; 
                    pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
                    const pdfBlob = pdf.output('blob');
                    setTicketImageBlob(pdfBlob);

                    // --- Step 2: Capture Optimized Low-Res for Database ---
                    const optimizedImageBase64 = canvas.toDataURL('image/jpeg', 0.6);

                    // --- Step 3: Send Data to Backend ---
                    const ticketData = {
                        ticketNumber: newTicketNumber,
                        transactionDateTime: new Date(),
                        betDates: selectedDates,
                        tracks: selectedTracks,
                        grandTotal: grandTotal,
                        plays: plays.map((p, i) => ({
                            ...p,
                            totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                            jugadaNumber: i + 1
                        })),
                        ticketImage: optimizedImageBase64
                    };
                    
                    onSaveTicket(ticketData);
    
                } catch (error) {
                    console.error("Error generating ticket image/pdf:", error);
                }
            }
        }, 200);
    };
    
    const handleRetrySave = async () => {
        const ticketElement = ticketContentRef.current;
        if (ticketElement) {
            try {
                 const canvas = await html2canvas(ticketElement, { 
                    scale: 1, 
                    backgroundColor: '#ffffff'
                });
                const optimizedImageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                
                const ticketData = {
                    ticketNumber: ticketNumber,
                    transactionDateTime: new Date(),
                    betDates: selectedDates,
                    tracks: selectedTracks,
                    grandTotal: grandTotal,
                    plays: plays.map((p, i) => ({
                        ...p,
                        totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                        jugadaNumber: i + 1
                    })),
                    ticketImage: optimizedImageBase64
                };
                onSaveTicket(ticketData);
            } catch(e) {
                console.error("Retry failed", e);
            }
        }
    };


    const handleShare = async () => {
        if (ticketImageBlob && navigator.share) {
            const file = new File([ticketImageBlob], `ticket-${ticketNumber}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({
                    title: `Lotto Ticket ${ticketNumber}`,
                    text: `Here is my ticket for a total of $${grandTotal.toFixed(2)}`,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing ticket:', error);
            }
        } else {
            alert('Sharing is not supported on this browser, or the file is not ready.');
        }
    };


    const formatTime = () => {
        return new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    if (!isOpen) return null;

    const isOnline = serverHealth === 'online';

    return (
        <div ref={modalRef} className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in" onClick={onClose}>
            {/* Reduced width to max-w-[350px] (approx 75% of previous md) */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-lg w-full max-w-[350px] max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header (Fixed) */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-neon-cyan">{isConfirmed ? 'Ticket Generated' : 'Confirm Ticket'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto p-4 flex-grow min-h-0 bg-gray-50 dark:bg-black/20">
                    {/* Ticket Visual */}
                    <div ref={ticketContentRef} className="bg-white p-3 text-black font-mono text-xs w-full mx-auto leading-normal shadow-sm">
                        <div className="text-center space-y-1 mb-4">
                            <p className="font-bold text-sm">BEAST READER</p>
                            <p className="text-[10px]">Terminal ID: {terminalId}</p>
                            <p className="text-[10px]">Cashier: {cashierId}</p>
                            <p>{formatTime().replace(',', ', ')}</p>
                            {isConfirmed && <p className="font-bold">TICKET# {ticketNumber}</p>}
                        </div>

                        <div className="space-y-2 mb-3 text-[11px]">
                             <p><span className="font-bold">DATES:</span> {selectedDates.join(', ')}</p>
                             <p><span className="font-bold">TRACKS:</span> {selectedTracks.filter(t => t !== 'Pulito' && t !== 'Venezuela' && t !== 'New York Horses').join(', ')}</p>
                        </div>

                        <div className="border-t border-b border-dashed border-gray-400 py-2">
                            <table className="w-full table-fixed">
                                <thead>
                                    <tr className="text-left !text-black">
                                        <th className="font-normal !text-black p-0 text-[10px] w-[8%]">#</th>
                                        <th className="font-normal !text-black p-0 text-[10px] w-[15%]">BET</th>
                                        <th className="font-normal !text-black p-0 text-[10px] w-[15%]">MODE</th>
                                        <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">STR</th>
                                        <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">BOX</th>
                                        <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">COM</th>
                                        <th className="font-normal !text-black p-0 text-[10px] text-right w-[20%]">TOT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plays.map((play, index) => (
                                        <tr key={play.id} className="border-t border-dashed border-gray-300 !text-black">
                                            <td className="py-1 px-0 text-[11px] align-top !text-black">{index + 1}</td>
                                            <td className="py-1 px-0 text-[11px] align-top !text-black font-bold">{play.betNumber}</td>
                                            <td className="py-1 px-0 text-[10px] align-top !text-black break-words">{play.gameMode}</td>
                                            <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.straightAmount ? play.straightAmount.toFixed(2) : '-'}</td>
                                            <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.boxAmount ? play.boxAmount.toFixed(2) : '-'}</td>
                                            <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.comboAmount ? play.comboAmount.toFixed(2) : '-'}</td>
                                            <td className="py-1 px-0 text-[11px] align-top !text-black text-right font-bold">${calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="text-center mt-4 space-y-2">
                            <p className="font-bold text-base">GRAND TOTAL: ${grandTotal.toFixed(2)}</p>
                            <div ref={qrCodeRef} className="flex justify-center pt-2 min-h-[128px]"></div>
                            <p className="text-[10px] pt-2">Please check your ticket, no claims for errors.</p>
                        </div>
                    </div>
                </div>

                {/* Footer with Action Buttons (Fixed) */}
                <div className="p-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    
                    {/* CONFIRMED STATE */}
                    {isConfirmed ? (
                        <div className="space-y-3">
                             {/* LARGE STATUS INDICATORS */}
                            {isSaving && (
                                <div className="w-full bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-blue-400 font-bold animate-pulse">Saving...</p>
                                </div>
                            )}
                            
                            {!isSaving && lastSaveStatus === 'success' && (
                                <div className="w-full bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-green-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="check" className="w-4 h-4"/> Saved
                                    </p>
                                </div>
                            )}

                            {!isSaving && lastSaveStatus === 'error' && (
                                <div className="w-full bg-red-500/20 border border-red-500 rounded-lg p-3 text-center space-y-2">
                                    <p className="text-sm text-red-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="wifi-off" className="w-4 h-4"/> Failed (Offline)
                                    </p>
                                    <button onClick={handleRetrySave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded shadow-lg transition-colors">
                                        RETRY
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={onClose} className="w-full px-4 py-3 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                    Done
                                </button>
                                <button onClick={handleShare} disabled={!ticketImageBlob} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-pink text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    Share
                                </button>
                            </div>
                        </div>
                    ) : (
                    /* PRE-CONFIRM STATE */
                         <div className="space-y-3">
                            {/* BIG VISIBLE SERVER STATUS */}
                            {!isOnline && (
                                <div className="w-full bg-red-500/10 border border-red-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-red-500 font-bold text-xs">OFFLINE MODE</span>
                                </div>
                            )}
                            {isOnline && (
                                <div className="w-full bg-green-500/10 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-green-500 font-bold text-xs">ONLINE</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={onClose} className="w-full px-2 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold flex items-center justify-center gap-2 text-sm">
                                    Edit
                                </button>
                                <button onClick={handleConfirmAndPrint} className="w-full px-2 py-3 rounded-lg bg-neon-green text-black font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm">
                                    <svg data-lucide="printer" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                                    Print
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
