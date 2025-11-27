
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v3.1 - Admin Refinement)

-   [x] **Núcleo del Playground:** Estructura base, gestión de jugadas, cálculos.
-   [x] **Unificación de Datos:** `RESULTS_CATALOG` como fuente única de verdad para IDs y horarios.
-   [x] **Identidad Visual:** Logos SVG vectoriales (`LotteryLogos.tsx`) integrados en todo el sitio.
-   [x] **Admin Dashboard (Estructura):**
    -   [x] Panel de Ventas (Métricas, Listado, QR Scanner).
    -   [x] Panel de Resultados (Listado, Borrado, Agregado Manual).
    -   [x] Calculadora de Premios (Simulador de reglas NY/Non-NY).
    -   [x] **OCR Staging Area:** Interfaz para cargar imágenes/texto y mapear resultados.
-   [x] **Persistencia Local (LocalDB):** Servicio `localDbService` funcionando para Tickets y Resultados.
-   [x] **Herramientas de Entrada Rápida (User Side):** Wizard, Magic Slate, Chatbot.

### EN PROGRESO / DEPURACIÓN (PRIORIDAD ALTA)

-   [ ] **Admin OCR Batch Save:** El botón "Save All" en el Admin Dashboard falla silenciosamente. (Los guardados individuales funcionan).

### Pendiente (Roadmap Futuro)

-   [ ] **Módulo de Pagos: Integración con Shopify**.
-   [ ] **Módulo de Herramientas Premium: Generador de Números Estratégicos**.
-   [ ] **Módulo de Cuentas de Usuario (Login Real)**.
-   [ ] **Conexión a API de Resultados en Vivo (Externa)**.

## Problemas Conocidos

-   **OCR Save All:** Fallo lógico en la iteración de filas pendientes en `AdminDashboard.tsx`.
-   **Reconocimiento de Voz en iOS (Creole):** Limitaciones de Safari con el idioma 'ht'.
