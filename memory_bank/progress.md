
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v4.0 - Ticolepe Stable)

-   [x] **Core Playground:**
    -   [x] Restored `TotalDisplay` position.
    -   [x] Implemented robust `localStorage` persistence.
    -   [x] Reactive Game Mode detection (Pulito/Venezuela toggle).
    -   [x] Restored 2-step Ticket Modal flow (Preview/Receipt).
-   [x] **Math Engine (`prizeCalculator`):**
    -   [x] **Dynamic Palé Combos:** Correct math (4x, 2x, 1x) based on digit repetition.
    -   [x] **Position Derivation:** Auto-extract 1st/2nd/3rd from USA P3/P4.
    -   [x] **Business Rules:** Explicit block for "Venezuela on Horses".
    -   [x] **Normalization:** Whitespace trimming and mode string cleaning.
-   [x] **Admin Dashboard:**
    -   [x] **Consolidated Lists:** Grouped plays by Ticket (no track duplication).
    -   [x] **Unified Calculation:** Removed `isCompatible` guard. All plays calculate against all results.
    -   [x] **Admin Ticket Viewer:** Dual-pane layout (Visual + Data) with live winning calculation.
    -   [x] **Result Mapping:** Full map support for all tracks (USA New, SD, Special).

### En Progreso / Wishlist

-   [ ] **Planificación de Wishlist del Usuario.**
-   [ ] **Módulo de Pagos:** Integración con pasarelas.
-   [ ] **Cuentas de Usuario:** Persistencia en la nube.

## Problemas Conocidos

-   **Reconocimiento de Voz (iOS):** Limitaciones conocidas con el idioma 'ht' en Safari.
