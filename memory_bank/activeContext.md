
# Active Context

## Estado Actual: BEAST OFFICE STABILIZED (GOLD STANDARD)

El usuario ha restaurado manualmente el **Admin Dashboard** a su versión "Beast Office" definitiva. Este estado se considera el "Gold Standard" de diseño y funcionalidad.

### 🔒 Elementos Críticos (NO MODIFICAR)
1.  **Diseño "Beast Office":** Estética industrial/futurista, header "Admin Command Center", logo "BO".
2.  **Sales Tab:** Toggle de cápsula ("Ticket View" / "Play Analysis") sin emojis. Escáner QR integrado.
3.  **OCR Tab:**
    *   **Motor Híbrido:** Botones explícitos para "Local (Fast)" y "AI (Smart)".
    *   **Layout:** Altura dinámica que permite scroll de página completa (no confinado a `100vh`).
    *   **Lógica:** Reglas de mapeo "Banker Logic" (State -> NY Eve, Horses -> Var Length) inyectadas en `geminiService` y `localOcrService`.
4.  **Estructura:** Navegación por pestañas (Sales, Results, OCR, Payouts) preservada.

### 🎯 Enfoque Actual
El código base está **CONGELADO** en cuanto a refactorización de UI existente.
Estamos entrando en la fase de **Planificación de Wishlist**.

### Pasos Siguientes
1.  **Planificación:** Analizar y desglosar los ítems de la "Wishlist" del usuario.
2.  **Implementación Modular:** Añadir nuevas funcionalidades sin alterar la estética o lógica "Beast Office" recuperada.

### Notas Técnicas Recientes
-   Se confirmó que el OCR local (Tesseract) y el OCR AI (Gemini) conviven en la interfaz.
-   La tabla de "Staging" del OCR guarda correctamente los resultados en `localDbService` tras validación manual.
