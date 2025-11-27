

import { Play, WinningResult, PrizeTable, CalculationResult } from '../types';

// Helper to normalize any bet string to pure digits
const clean = (s: string) => s.replace(/\D/g, '');

// Helper to check permutations between two sets of digits
// Checks if set A contains same digits as set B regardless of order
const isPermutation = (numA: string, numB: string): boolean => {
    if (numA.length !== numB.length) return false;
    return numA.split('').sort().join('') === numB.split('').sort().join('');
};

// Helper to count unique digits to determine box type
const getPermutationType = (numStr: string, length: number): number => {
    const freq: {[k:string]:number} = {};
    for(const char of numStr) freq[char] = (freq[char] || 0) + 1;
    
    // Factorial calc
    const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
    
    // N! / (n1! * n2! ...)
    const denom = Object.values(freq).reduce((acc, val) => acc * fact(val), 1);
    return fact(length) / denom;
};

const isNewYorkTrack = (trackName: string): boolean => {
    const lower = trackName.toLowerCase();
    return lower.includes('new york') || lower.includes('horses');
};

export const calculateWinnings = (
    play: Play,
    result: WinningResult,
    prizeTable: PrizeTable
): CalculationResult[] => {
    const winners: CalculationResult[] = [];
    const table = prizeTable[play.gameMode];
    const isNY = isNewYorkTrack(result.lotteryName);
    
    if (!table) return [];

    // -------------------------
    // PICK 3
    // -------------------------
    if (play.gameMode === 'Pick 3') {
        const winningNum = result.pick3 ? clean(result.pick3) : '';
        if (winningNum.length === 3) {
            const betNum = clean(play.betNumber);
            const isTriple = betNum[0] === betNum[1] && betNum[1] === betNum[2];

            // 1. STRAIGHT
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winningNum) {
                    // Rule: Triple pays $500, Regular pays $700
                    const amount = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
                    
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, 
                        prizeAmount: play.straightAmount * amount, 
                        matchType: 'Exact Order'
                    });
                }
            }

            // 2. BOX (Triples don't have box)
            if (play.boxAmount && play.boxAmount > 0 && !isTriple) {
                if (isPermutation(betNum, winningNum)) {
                    // Other States: Flat rate (usually $116.67 for 6-way equivalent)
                    // NY: Differentiated
                    
                    const perms = getPermutationType(winningNum, 3);
                    let multiplier = 0;
                    let type = '';

                    if (isNY) {
                        if (perms === 6) { multiplier = table.BOX_6WAY || 116.67; type = 'Box 6-Way'; }
                        else if (perms === 3) { multiplier = table.BOX_3WAY || 233.33; type = 'Box 3-Way'; }
                    } else {
                        // Other states logic: User specified "$116.67" for Box.
                        // Usually 3-way is double of 6-way. 
                        // If table.BOX_6WAY is ~116, we use that base.
                        if (perms === 6) { multiplier = table.BOX_6WAY || 116.67; type = 'Box 6-Way (Non-NY)'; }
                        else if (perms === 3) { multiplier = (table.BOX_6WAY || 116.67) * 2; type = 'Box 3-Way (Non-NY)'; } 
                    }

                    if (multiplier > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * multiplier, matchType: type
                        });
                    }
                }
            }
        }
    } 
    // -------------------------
    // WIN 4
    // -------------------------
    else if (play.gameMode === 'Win 4') {
        const winningNum = result.pick4 ? clean(result.pick4) : '';
        if (winningNum.length === 4) {
            const betNum = clean(play.betNumber);

            // 1. STRAIGHT
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winningNum) {
                    let multiplier = table.STRAIGHT || 5000;
                    if (!isNY) multiplier = multiplier / 2; // Half rule for non-NY

                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, 
                        prizeAmount: play.straightAmount * multiplier, 
                        matchType: 'Exact Order'
                    });
                }
            }

            // 2. BOX
            if (play.boxAmount && play.boxAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    const perms = getPermutationType(winningNum, 4);
                    let multiplier = 0;
                    let type = '';

                    if (perms === 24) { multiplier = table.BOX_24WAY || 200; type = 'Box 24-Way'; }
                    else if (perms === 12) { multiplier = table.BOX_12WAY || 400; type = 'Box 12-Way'; }
                    else if (perms === 6) { multiplier = table.BOX_6WAY || 800; type = 'Box 6-Way'; }
                    else if (perms === 4) { multiplier = table.BOX_4WAY || 1200; type = 'Box 4-Way'; }

                    // Apply Half Rule for Non-NY
                    if (!isNY) {
                        multiplier = multiplier / 2;
                        type += ' (Non-NY)';
                    }

                    if (multiplier > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * multiplier, matchType: type
                        });
                    }
                }
            }
        }
    } 
    // -------------------------
    // VENEZUELA
    // -------------------------
    else if (play.gameMode === 'Venezuela') {
        if (play.straightAmount && play.straightAmount > 0) {
            const betNum = clean(play.betNumber).slice(-2);
            
            const win1 = result.first ? clean(result.first).slice(-2) : '';
            const win2 = result.second ? clean(result.second).slice(-2) : '';
            const win3 = result.third ? clean(result.third).slice(-2) : '';

            if (betNum === win1) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.FIRST || 55), matchType: '1st Prize'
                });
            }
            if (betNum === win2) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.SECOND || 15), matchType: '2nd Prize'
                });
            }
            if (betNum === win3) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.THIRD || 10), matchType: '3rd Prize'
                });
            }
        }
    }
    // -------------------------
    // PALE (USA - Venezuela Positions)
    // -------------------------
    else if (play.gameMode === 'Palé') {
        // betNumber format: "12-34"
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2) {
            const p1 = parts[0];
            const p2 = parts[1];
            const win1 = result.first ? clean(result.first).slice(-2) : 'XX';
            const win2 = result.second ? clean(result.second).slice(-2) : 'YY';
            const win3 = result.third ? clean(result.third).slice(-2) : 'ZZ';

            // STRAIGHT (FULL)
            if (play.straightAmount && play.straightAmount > 0) {
                // 1st + (2nd OR 3rd) Exact Order not strictly required for 'Full' usually, but 'Exact' implies position matching logic if strict
                // Standard Pale Full: You have the two numbers that came out in 1st and (2nd or 3rd).
                if ((p1 === win1 && (p2 === win2 || p2 === win3)) || (p2 === win1 && (p1 === win2 || p1 === win3))) {
                     winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.WIN_FULL || 700), matchType: 'Palé Full'
                    });
                }
            }

            // BOX (Any combo of the two numbers appearing in 1st + (2nd or 3rd) positions, including flips)
            // Actually "Pale Box" typically means you played 45-67 but result was 54-76 or any permutation that results in a Pale.
            if (play.boxAmount && play.boxAmount > 0) {
                // Check if p1 is permutation of win1 OR p2 is permutation of win1...
                // Simplified: Check if {p1, p2} permutations match {w1, w2} OR {w1, w3}
                
                const checkMatch = (myP1: string, myP2: string, resA: string, resB: string) => {
                    // Check standard permutation match for the set
                    return (isPermutation(myP1, resA) && isPermutation(myP2, resB)) || (isPermutation(myP1, resB) && isPermutation(myP2, resA));
                };

                const match12 = checkMatch(p1, p2, win1, win2);
                const match13 = checkMatch(p1, p2, win1, win3);

                if (match12 || match13) {
                     winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * (table.WIN_BOX || 175), matchType: 'Palé Box'
                    });
                }
            }
        }
    }
    // -------------------------
    // RD QUINIELA (Using RD-Quiniela)
    // -------------------------
    else if (play.gameMode === 'RD-Quiniela') {
        if (play.straightAmount && play.straightAmount > 0) {
            const betNum = clean(play.betNumber).slice(-2);
            const win1 = result.first ? clean(result.first).slice(-2) : '';
            const win2 = result.second ? clean(result.second).slice(-2) : '';
            const win3 = result.third ? clean(result.third).slice(-2) : '';

            if (betNum === win1) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.FIRST || 56), matchType: '1st Prize'
                });
            }
            if (betNum === win2) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.SECOND || 12), matchType: '2nd Prize'
                });
            }
            if (betNum === win3) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.THIRD || 4), matchType: '3rd Prize'
                });
            }
        }
    }
    // -------------------------
    // PALE-RD (Santo Domingo Palé)
    // -------------------------
    else if (play.gameMode === 'Pale-RD') {
        // betNumber format: "12-34"
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2 && play.straightAmount && play.straightAmount > 0) {
            const p1 = parts[0];
            const p2 = parts[1];
            const win1 = result.first ? clean(result.first).slice(-2) : 'XX';
            const win2 = result.second ? clean(result.second).slice(-2) : 'YY';
            const win3 = result.third ? clean(result.third).slice(-2) : 'ZZ';

            // STRAIGHT CHECK
            // 1st + 2nd (Full)
            if ((p1 === win1 && p2 === win2) || (p1 === win2 && p2 === win1)) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.WIN_FULL || 1300), matchType: 'Palé Full (1st+2nd)'
                });
            }
            // 1st + 3rd (Full)
            else if ((p1 === win1 && p2 === win3) || (p1 === win3 && p2 === win1)) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.WIN_FULL || 1300), matchType: 'Palé Full (1st+3rd)'
                });
            }
            // 2nd + 3rd (Parcial)
            else if ((p1 === win2 && p2 === win3) || (p1 === win3 && p2 === win2)) {
                winners.push({
                    ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                    wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.WIN_PARCIAL || 200), matchType: 'Palé Parcial (2nd+3rd)'
                });
            }
        }
    }
    // -------------------------
    // PULITO
    // -------------------------
    else if (play.gameMode.startsWith('Pulito')) {
        // Format: "Pulito-1" or "Pulito-1,2"
        const specifiedPositions = play.gameMode.split('-')[1]?.split(',').map(Number) || [1];
        const betNum = clean(play.betNumber).slice(-2);
        
        // Map positions to winning numbers. 1=Pick3 First 2, 2=Pick3 Last 2, 3=Win4 First 2
        // We need advanced parsing of result.pick3 and result.pick4 if available
        const p3 = result.pick3 ? clean(result.pick3) : '';
        const p4 = result.pick4 ? clean(result.pick4) : '';
        
        const pos1Val = p3.length >= 2 ? p3.slice(0,2) : '';
        const pos2Val = p3.length >= 3 ? p3.slice(-2) : '';
        const pos3Val = p4.length >= 2 ? p4.slice(0,2) : '';
        
        const winVals = { 1: pos1Val, 2: pos2Val, 3: pos3Val };

        // Check each specified position
        specifiedPositions.forEach(pos => {
            const winVal = winVals[pos as 1|2|3];
            if (!winVal) return;

            // Straight
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winVal) {
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * (table.STRAIGHT || 80), matchType: `Pos ${pos} Straight`
                    });
                }
            }
            // Box
            if (play.boxAmount && play.boxAmount > 0) {
                if (isPermutation(betNum, winVal)) {
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * (table.BOX || 40), matchType: `Pos ${pos} Box`
                    });
                }
            }
        });
    }
    // -------------------------
    // SINGLE ACTION
    // -------------------------
    else if (play.gameMode === 'Single Action') {
        // Logic: Match specific digit in specific position of Pick 3 / Win 4
        // Usually Single Action specifies position 1-7. 
        // For now, we assume simple match if not positional encoded.
        // Since current frontend doesn't support position input for Single Action easily, 
        // we might skip complex validation or assume match if ANY digit matches? 
        // User prompt said: "Se juega single action en base a los 7 dígitos...".
        // Without position data in 'play', we can't accurately calculate Single Action.
        // Skipping implementation to avoid false positives until UI supports position selection.
    }

    return winners;
};
