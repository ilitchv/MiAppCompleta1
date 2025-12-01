
# Active Context

## Estado Actual: PLAN TICOLEPE COMPLETED (STABILIZED)

The application has undergone a critical stabilization phase ("Plan Ticolepe") to correct UX regressions, logic fragmentation, and visualization issues. The system is now in a "Golden State" regarding betting logic and admin reporting.

### 🔒 Core Architectural Decisions (DO NOT CHANGE)

1.  **Centralized Math ("The No-Guard Policy"):**
    *   **Architecture:** The `AdminDashboard` **MUST NOT** filter or block plays based on "compatibility" (removed `isCompatible` function).
    *   **Rule:** All plays + results are sent blindly to `prizeCalculator`.
    *   **Authority:** The `prizeCalculator` is the **sole source of truth**. It decides if a play wins or loses.
    *   **Exceptions:** Logic like "Venezuela doesn't pay in Horses" is handled *inside* `prizeCalculator`, not in the UI.

2.  **Result Derivation (USA -> General):**
    *   **Logic:** The system automatically extracts "1st, 2nd, 3rd" positions from USA "Pick 3" and "Pick 4" numbers.
    *   **Impact:** This allows **Venezuela**, **Palé**, **Pulito**, and **RD-Quiniela** modes to calculate winnings correctly against USA tracks without manual data entry.

3.  **Palé Math Dynamics:**
    *   **Combo Calculation:** NOT a fixed multiplier.
        *   Mixto-Mixto (e.g., 12-34) = 4 Combinations.
        *   Mixto-Doble (e.g., 12-22) = 2 Combinations.
        *   Doble-Doble (e.g., 22-55) = 1 Combination.

### 🛠️ Implemented Fixes (Ticolepe Manifest)

#### 1. UX/UI (Playground)
*   **Layout:** `TotalDisplay` is positioned **below** the `PlaysTable`.
*   **Persistence:** `localStorage` saves/restores plays, tracks, dates, and Pulito positions automatically. "Reset All" clears this.
*   **Reactivity:** Existing plays update their Game Mode automatically if the user toggles "Pulito" or "Venezuela" tracks.
*   **Ticket Modal:**
    *   **User Flow:** 2-Step (Preview -> Receipt). Includes auto-download on print.
    *   **Visual:** Shows thermal ticket strip only.

#### 2. Admin Dashboard (Sales Tab)
*   **Consolidated View:** Rows are grouped by Play (not duplicated per track).
*   **Columns:** "Tracks" column is pluralized (e.g., "NY PM, GA Eve").
*   **Winning Status:**
    *   **WINNER:** Green badge + Amount (Calculated across all tracks).
    *   **LOSER:** Red badge (Results exist, $0 win).
    *   **PENDING:** Yellow badge (Results missing).
*   **Ticket Modal (Admin Variant):**
    *   **Dual View:** Thermal Ticket (Left) + Data Table (Right).
    *   **Live Calc:** Calculates winnings in real-time using the **FULL** database (ignoring dashboard date filters).

### 🧪 Validation Checklist (For Next Session)

When restarting, verify these specific behaviors:
1.  **Venezuela Win:** Play "Venezuela" in "New York". Result "123-4567". Dashboard MUST show **WINNER** (derived from 23/45/67).
2.  **Horses Exception:** Play "Venezuela" in "Horses". Result "123". Dashboard MUST show **LOSER ($0)** (Explicit incompatibility).
3.  **Pulito/Single Action:** Play these modes in "New York". They MUST calculate correctly (No "Pending" false positives).
4.  **Palé Combo:** Play "12-34" Combo. Cost should be Base * 4. Play "22-55" Combo. Cost should be Base * 1.

### 🎯 Current Focus
Code is stable. Next steps involve rigorous testing of the points above and proceeding with the Wishlist (once confirmed).
