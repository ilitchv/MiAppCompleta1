
# Active Context

## Estado Actual: v5.3 - Admin Power-Up Complete

**⚠️ INCIDENTE RECIENTE (2024-05-XX):** Se intentó implementar una regla de validación en `PlaygroundApp.tsx` reescribiendo el archivo completo. Esto causó una regresión masiva en la UI.
**Lección:** Para cambios lógicos en componentes complejos (`PlaygroundApp`), usar ediciones quirúrgicas, NO reescrituras totales.

### 🏆 Logros Consolidados (Funcionando)
1.  **Admin Power-Up (v5.3):**
    *   **Audit Hub:** Centro de auditoría centralizado con filtros por tipo (Finanzas, Usuarios, Sistema).
    *   **Identidad en Ventas:** Visualización de Avatar y Nombre del cliente en la tabla de ventas.
    *   **Bulk Payouts:** Selección masiva y pago de premios con un solo clic.
    *   **Auditoría de Usuarios:** Registro automático de creación y edición de usuarios.
2.  **"New York Horses" como Track:** Ya está visible en selectores y tickets.
3.  **Seguridad:** Iron Gate y privacidad de tickets implementados.

### 📅 Plan de Ejecución (Priorizado)

#### 1. FASE 3: Activación de Jerarquía (Referidos)
*Objetivo: Conectar datos reales de usuarios para preparar el terreno financiero.*
1.  **Modelo de Datos:** Agregar `sponsorId` al esquema de usuario en `localDbService`.
2.  **Admin UI:** Agregar selector de "Sponsor" en el modal de Crear/Editar Usuario.
3.  **ReferralTree:** Conectar el componente visual a la base de datos real (recursividad real).

#### 2. FASE 4: Beast Ledger (Economía Segura) - NUEVO
*Objetivo: Implementar trazabilidad tipo Blockchain para el dinero.*
1.  **The Mint (Génesis):** Crear funciones que generen tokens SOLO desde depósitos externos o premios validados.
2.  **Chain of Custody:** Cada transacción guarda el `parentHash` del token origen.
3.  **Audit View:** Visualizador de trazabilidad en el Admin.

#### 3. FASE: Validación de Reglas (Surgical)
*Objetivo: Bloquear jugadas inválidas sin tocar la UI.*
1.  **Incompatibilidad Horses/Venezuela:** Insertar validación en `handleGenerateTicket`.

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI (>200 líneas) para cambios de lógica simple.
2.  **Single Source of Truth:** `localDbService` sigue siendo la autoridad.
