
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
                    const amount = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, 
                        prizeAmount: play.straightAmount * amount, 
                        matchType: 'Exact Order'
                    });
                }
            }

            // 2. BOX (Strict Math: 700/3 or 700/6)
            if (play.boxAmount && play.boxAmount > 0 && !isTriple) {
                if (isPermutation(betNum, winningNum)) {
                    const perms = getPermutationType(winningNum, 3);
                    let prizeUnit = 0;
                    let type = '';

                    // Logic: 3-Way means double (112), 6-Way means unique (123)
                    // The prize is $700 divided by the number of combinations.
                    // This applies to both NY and Others in the "Beast" logic usually, 
                    // unless "Others" strictly implies a lower fixed table. 
                    // Assuming "Efectivo al 2-17-25" implies universal 700 rule for now.
                    
                    if (perms === 6) { prizeUnit = 700.0 / 6.0; type = 'Box 6-Way'; }
                    else if (perms === 3) { prizeUnit = 700.0 / 3.0; type = 'Box 3-Way'; }

                    if (prizeUnit > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * prizeUnit, matchType: type
                        });
                    }
                }
            }

            // 3. COMBO (Pays Straight if ANY permutation matches)
            if (play.comboAmount && play.comboAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    // Combo wager effectively covers all straight permutations.
                    // If result matches any permutation, exactly ONE straight wager wins.
                    // Prize is the straight payout * combo wager.
                    const amount = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'COMBO', wagerAmount: play.comboAmount, 
                        prizeAmount: play.comboAmount * amount, 
                        matchType: 'Combo Win (Straight Payout)'
                    });
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
                    if (!isNY) multiplier = multiplier / 2; 
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * multiplier, matchType: 'Exact Order'
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

                    if (!isNY) { multiplier = multiplier / 2; type += ' (Non-NY)'; }

                    if (multiplier > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * multiplier, matchType: type
                        });
                    }
                }
            }

            // 3. COMBO
            if (play.comboAmount && play.comboAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    let multiplier = table.STRAIGHT || 5000;
                    if (!isNY) multiplier = multiplier / 2; 
                    
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'COMBO', wagerAmount: play.comboAmount, 
                        prizeAmount: play.comboAmount * multiplier, 
                        matchType: 'Combo Win (Straight Payout)'
                    });
                }
            }
        }
    } 
    // -------------------------
    // VENEZUELA (1=P3 Last 2, 2=W4 First 2, 3=W4 Last 2)
    // -------------------------
    else if (play.gameMode === 'Venezuela') {
        const betNum = clean(play.betNumber).slice(-2);
        const win1 = result.first ? clean(result.first).slice(-2) : '';
        const win2 = result.second ? clean(result.second).slice(-2) : '';
        const win3 = result.third ? clean(result.third).slice(-2) : '';

        // STRAIGHT
        if (play.straightAmount && play.straightAmount > 0) {
            if (betNum === win1) winners.push({ ...baseWin(play, result, play.straightAmount * (table.FIRST || 55), '1st Prize') });
            if (betNum === win2) winners.push({ ...baseWin(play, result, play.straightAmount * (table.SECOND || 15), '2nd Prize') });
            if (betNum === win3) winners.push({ ...baseWin(play, result, play.straightAmount * (table.THIRD || 10), '3rd Prize') });
        }
        // BOX (Permutations allowed, Half Prize)
        if (play.boxAmount && play.boxAmount > 0) {
            if (isPermutation(betNum, win1)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.FIRST_BOX || 27.5), '1st Box') });
            if (isPermutation(betNum, win2)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.SECOND_BOX || 7.5), '2nd Box') });
            if (isPermutation(betNum, win3)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.THIRD_BOX || 5), '3rd Box') });
        }
    }
    // -------------------------
    // PALE USA (Venezuela Positions)
    // -------------------------
    else if (play.gameMode === 'Palé') {
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2) {
            const p1 = parts[0];
            const p2 = parts[1];
            const win1 = result.first ? clean(result.first).slice(-2) : 'XX';
            const win2 = result.second ? clean(result.second).slice(-2) : 'YY';
            const win3 = result.third ? clean(result.third).slice(-2) : 'ZZ';

            // Check if user's pair set {p1, p2} is found in the set of winning positions {w1, w2, w3}
            // Need to match any 2 positions.
            
            // Helper to check if a specific pair matches a winning number (Straight or Box)
            const matchS = (myNum: string, winNum: string) => myNum === winNum;
            const matchB = (myNum: string, winNum: string) => isPermutation(myNum, winNum);

            // STRAIGHT ($700): Any combination of positions (1+2, 1+3, 2+3)
            if (play.straightAmount && play.straightAmount > 0) {
                // Check permutations of pair vs result-positions
                // Case 1: p1=wA, p2=wB OR p1=wB, p2=wA
                const checkStraightPair = (wA: string, wB: string) => (matchS(p1, wA) && matchS(p2, wB)) || (matchS(p1, wB) && matchS(p2, wA));
                
                if (checkStraightPair(win1, win2) || checkStraightPair(win1, win3) || checkStraightPair(win2, win3)) {
                     winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_FULL || 700), 'Palé Straight') });
                }
            }

            // BOX ($175): Permutations of numbers in any combination of positions
            if (play.boxAmount && play.boxAmount > 0) {
                const checkBoxPair = (wA: string, wB: string) => (matchB(p1, wA) && matchB(p2, wB)) || (matchB(p1, wB) && matchB(p2, wA));
                
                if (checkBoxPair(win1, win2) || checkBoxPair(win1, win3) || checkBoxPair(win2, win3)) {
                     winners.push({ ...baseWin(play, result, play.boxAmount * (table.WIN_BOX || 175), 'Palé Box') });
                }
            }
        }
    }
    // -------------------------
    // RD QUINIELA
    // -------------------------
    else if (play.gameMode === 'RD-Quiniela') {
        const betNum = clean(play.betNumber).slice(-2);
        const win1 = result.first ? clean(result.first).slice(-2) : '';
        const win2 = result.second ? clean(result.second).slice(-2) : '';
        const win3 = result.third ? clean(result.third).slice(-2) : '';

        // STRAIGHT
        if (play.straightAmount && play.straightAmount > 0) {
            if (betNum === win1) winners.push({ ...baseWin(play, result, play.straightAmount * (table.FIRST || 56), '1st Prize') });
            if (betNum === win2) winners.push({ ...baseWin(play, result, play.straightAmount * (table.SECOND || 12), '2nd Prize') });
            if (betNum === win3) winners.push({ ...baseWin(play, result, play.straightAmount * (table.THIRD || 4), '3rd Prize') });
        }
        // BOX
        if (play.boxAmount && play.boxAmount > 0) {
            if (isPermutation(betNum, win1)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.FIRST_BOX || 28), '1st Box') });
            if (isPermutation(betNum, win2)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.SECOND_BOX || 6), '2nd Box') });
            if (isPermutation(betNum, win3)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.THIRD_BOX || 2), '3rd Box') });
        }
    }
    // -------------------------
    // PALE-RD (Santo Domingo Palé - STRICT RULES)
    // -------------------------
    else if (play.gameMode === 'Pale-RD') {
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2) {
            const p1 = parts[0];
            const p2 = parts[1];
            const win1 = result.first ? clean(result.first).slice(-2) : 'XX';
            const win2 = result.second ? clean(result.second).slice(-2) : 'YY';
            const win3 = result.third ? clean(result.third).slice(-2) : 'ZZ';

            // Helpers
            const exact = (a:string, b:string) => a === b;
            const perm = (a:string, b:string) => isPermutation(a, b);
            
            // STRAIGHT LOGIC
            if (play.straightAmount && play.straightAmount > 0) {
                // FULL: 1st + 2nd ONLY
                if ((exact(p1, win1) && exact(p2, win2)) || (exact(p1, win2) && exact(p2, win1))) {
                    winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_FULL || 1300), 'Palé Full (1st+2nd)') });
                }
                // PARCIAL: (1st + 3rd) OR (2nd + 3rd)
                else {
                    const match13 = (exact(p1, win1) && exact(p2, win3)) || (exact(p1, win3) && exact(p2, win1));
                    const match23 = (exact(p1, win2) && exact(p2, win3)) || (exact(p1, win3) && exact(p2, win2));
                    if (match13 || match23) {
                        winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_PARCIAL || 200), 'Palé Parcial') });
                    }
                }
            }

            // BOX LOGIC
            if (play.boxAmount && play.boxAmount > 0) {
                // BOX FULL: 1st + 2nd (Permuted)
                if ((perm(p1, win1) && perm(p2, win2)) || (perm(p1, win2) && perm(p2, win1))) {
                    winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX_FULL || 325), 'Box Full (1st+2nd)') });
                }
                // BOX PARCIAL: (1st+3rd) OR (2nd+3rd) (Permuted)
                else {
                    const match13 = (perm(p1, win1) && perm(p2, win3)) || (perm(p1, win3) && perm(p2, win1));
                    const match23 = (perm(p1, win2) && perm(p2, win3)) || (perm(p1, win3) && perm(p2, win2));
                    if (match13 || match23) {
                        winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX_PARCIAL || 50), 'Box Parcial') });
                    }
                }
            }
        }
    }
    // -------------------------
    // PULITO (4 Positions)
    // -------------------------
    else if (play.gameMode.startsWith('Pulito')) {
        const specifiedPositions = play.gameMode.split('-')[1]?.split(',').map(Number) || [1];
        const betNum = clean(play.betNumber).slice(-2);
        
        // 4 Positions:
        // 1: P3 First 2
        // 2: P3 Last 2
        // 3: W4 First 2
        // 4: W4 Last 2
        const p3 = result.pick3 ? clean(result.pick3) : '';
        const p4 = result.pick4 ? clean(result.pick4) : '';
        
        const winVals: {[k:number]: string} = {
            1: p3.length >= 2 ? p3.slice(0, 2) : '',
            2: p3.length >= 3 ? p3.slice(-2) : '',
            3: p4.length >= 2 ? p4.slice(0, 2) : '',
            4: p4.length >= 4 ? p4.slice(-2) : '',
        };

        specifiedPositions.forEach(pos => {
            const winVal = winVals[pos];
            if (!winVal) return;

            // Straight
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winVal) {
                    winners.push({ ...baseWin(play, result, play.straightAmount * (table.STRAIGHT || 80), `Pulito Pos ${pos}`) });
                }
            }
            // Box
            if (play.boxAmount && play.boxAmount > 0) {
                if (isPermutation(betNum, winVal)) {
                    winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX || 40), `Pulito Box Pos ${pos}`) });
                }
            }
        });
    }
    // -------------------------
    // SINGLE ACTION (Positional Match)
    // -------------------------
    else if (play.gameMode === 'Single Action') {
        // Just checking basic match for now as UI doesn't pass explicit positions cleanly yet
        // If betNumber is "5", check if "5" exists in result? No, usually specific position.
        // Skipping implementation until UI supports position input.
    }

    return winners;
};

// Helper for standard winner object construction
const baseWin = (play: Play, result: WinningResult, amount: number, type: string): CalculationResult => ({
    ticketNumber: '', 
    playNumber: 0, 
    trackName: result.lotteryName, 
    betNumber: play.betNumber, 
    gameMode: play.gameMode,
    wagerType: type.includes('Box') ? 'BOX' : 'STRAIGHT', 
    wagerAmount: type.includes('Box') ? (play.boxAmount||0) : (play.straightAmount||0),
    prizeAmount: amount, 
    matchType: type
});
