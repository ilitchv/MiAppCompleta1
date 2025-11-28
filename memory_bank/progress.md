
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v3.5 - Beast Office Stable)

-   [x] **Núcleo del Playground:** Estructura base, gestión de jugadas, cálculos.
-   [x] **Unificación de Datos:** `RESULTS_CATALOG` como fuente única de verdad.
-   [x] **Identidad Visual:** Logos SVG vectoriales integrados.
-   [x] **Admin Dashboard ("Beast Office"):**
    -   [x] **UI Premium:** Diseño industrial, toggles de cápsula, tipografía técnica.
    -   [x] **Sales Panel:** Vista dual (Tickets/Plays), QR Scanner.
    -   [x] **Results Panel:** Gestión CRUD completa, Historial.
    -   [x] **Payouts Panel:** Calculadora manual, Configuración de reglas, Simulador de ganadores.
    -   [x] **OCR Panel (Avanzado):**
        -   [x] Motor Híbrido (Local Tesseract + Cloud AI).
        -   [x] Scroll infinito (corrección de layout).
        -   [x] Batch Save con validación.
-   [x] **Lógica de Negocio:**
    -   [x] Mapeo inteligente de "Jerga de Banca" (State, Horses, etc.).
    -   [x] Soporte de longitud variable para Horses.
-   [x] **Persistencia Local (LocalDB):** Servicio robusto.

### En Progreso / Wishlist

-   [ ] **Planificación de Wishlist del Usuario.**
-   [ ] **Módulo de Pagos:** Integración con pasarelas.
-   [ ] **Cuentas de Usuario:** Persistencia en la nube.

## Problemas Conocidos

-   **Reconocimiento de Voz (iOS):** Limitaciones conocidas con el idioma 'ht' en Safari.
