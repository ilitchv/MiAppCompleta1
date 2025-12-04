
# Active Context

## Estado Actual: v5.2 - Admin Power-Up Complete

**⚠️ INCIDENTE RECIENTE (2024-05-XX):** Se intentó implementar una regla de validación en `PlaygroundApp.tsx` reescribiendo el archivo completo. Esto causó una regresión masiva en la UI.
**Lección:** Para cambios lógicos en componentes complejos (`PlaygroundApp`), usar ediciones quirúrgicas, NO reescrituras totales.

### 🏆 Logros Consolidados (Funcionando)
1.  **Admin Power-Up (v5.2):**
    *   **Audit Hub:** Centro de auditoría centralizado con filtros por tipo (Finanzas, Usuarios, Sistema).
    *   **Identidad en Ventas:** Visualización de Avatar y Nombre del cliente en la tabla de ventas.
    *   **Bulk Payouts:** Selección masiva y pago de premios con un solo clic.
    *   **Auditoría de Usuarios:** Registro automático de creación y edición de usuarios.
2.  **"New York Horses" como Track:** Ya está visible en selectores y tickets.
3.  **Seguridad:** Iron Gate y privacidad de tickets implementados.

### 📅 Plan de Ejecución (Priorizado)

#### 1. FASE: Validación de Reglas (Re-intento Quirúrgico)
*Objetivo: Bloquear jugadas inválidas sin tocar la UI.*
1.  **Incompatibilidad Horses/Venezuela:** Insertar validación en `handleGenerateTicket` (PlaygroundApp) para bloquear la mezcla de Track "NY Horses" con Modo "Venezuela". **Hacerlo sin modificar el JSX/Renderizado.**

#### 2. FASE 3: Activación de Jerarquía
*Objetivo: Conectar datos reales.*
1.  **ReferralTree:** Conectar `ReferralTree.tsx` a `localDbService` para mostrar estructura real.
2.  **Edición Usuario:** Agregar campo "Sponsor" (Select) en el modal de crear/editar usuario en Admin.

#### 3. FASE 4: Beast Ledger (Economía Segura) - NUEVO
*Objetivo: Implementar trazabilidad tipo Blockchain.*
1.  **Diseño de Schema:** Definir estructura de `TokenTransaction` (Hash, ParentHash, Origin).
2.  **Minting Logic:** Crear funciones para generar tokens "Genesis" desde Depósitos o Premios.

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI (>200 líneas) para cambios de lógica simple.
2.  **Single Source of Truth:** `localDbService` sigue siendo la autoridad.
