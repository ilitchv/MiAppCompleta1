
# Active Context

## Estado Actual: v5.2.1 - Admin Polish & Surgical Success

**✅ ÉXITO QUIRÚRGICO:** Se completó la mejora del `AdminDashboard.tsx` (Plays View) aplicando estrictamente el protocolo de no-reescritura.
**Estado:** Estable. La vista de jugadas ahora muestra el jugador, y maneja correctamente los estados de ganancia/pérdida ignorando "meta-tracks" como Pulito/Venezuela.

### 🏆 Logros Consolidados (Funcionando)
1.  **Admin Power-Up (v5.2+):**
    *   **Plays View:** Columna "Player" agregada con Avatar/Nombre.
    *   **Lógica de Estado:** Eliminado "PENDING" falso en jugadas perdedoras (al ignorar Pulito/Venezuela como tracks).
    *   **Estética:** Estado "NO MATCH" en gris para perdedores (menos agresivo).
    *   **Audit Hub:** Centro de auditoría centralizado.
    *   **Bulk Payouts:** Selección masiva y pago de premios.
2.  **Reglas de Negocio:**
    *   **Validación Horses/Venezuela:** Implementada correctamente.
3.  **Seguridad:** Iron Gate y privacidad de tickets.

### 📅 Plan de Ejecución

#### FASE 3: Activación de Jerarquía (Siguiente Prioridad)
1.  **ReferralTree:** Conectar datos reales de usuarios en lugar de `MOCK_TREE`.
2.  **Edición Usuario:** Agregar campo "Sponsor" en el modal de creación/edición.

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI (>200 líneas) para cambios menores. Usar siempre el contexto actual.
2.  **Track vs Game Mode:** "Pulito" y "Venezuela" son modos de juego, no tracks. Deben excluirse de los bucles de verificación de resultados (`winningTracks`) para evitar que el sistema espere resultados inexistentes.
