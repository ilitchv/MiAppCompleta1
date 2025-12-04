
# Active Context

## Estado Actual: v5.2 - Estabilización Post-Incidente

**⚠️ INCIDENTE CRÍTICO RECIENTE (AdminDashboard):** Se intentó agregar columnas a la vista de jugadas en `AdminDashboard.tsx`. El modelo reescribió el componente completo basándose en una versión de memoria desactualizada, eliminando personalizaciones recientes (Tabs, Nombres, Estilos).
**Estado:** Se ha realizado un rollback a la versión estable anterior.
**Lección:** Prohibido reescribir componentes de UI complejos sin tener el contexto exacto línea por línea. Usar ediciones quirúrgicas o solicitar el contenido actualizado antes de tocar.

### 🏆 Logros Consolidados (Funcionando)
1.  **Reglas de Negocio:**
    *   **Validación Horses/Venezuela:** Implementada correctamente en `PlaygroundApp.tsx`. Bloquea la generación de tickets incompatibles.
2.  **Admin Power-Up (v5.2):**
    *   **Audit Hub:** Centro de auditoría centralizado.
    *   **Identidad en Ventas:** Visualización de Avatar y Nombre (Vista Tickets).
    *   **Bulk Payouts:** Selección masiva y pago de premios.
3.  **Seguridad:** Iron Gate y privacidad de tickets implementados.

### 📅 Plan de Ejecución (Re-evaluado)

#### 1. FASE: Mejoras de Admin (Re-intento con Cautela)
*Objetivo: Agregar datos faltantes sin romper el dashboard.*
1.  **Plays View Enrichment:** Agregar columnas "Player" y "Won ($)" a la tabla de jugadas en `AdminDashboard.tsx`. **ESTRATEGIA:** Edición quirúrgica de `<thead>` y `<tbody>` solamente. No tocar el resto del archivo.

#### 2. FASE 3: Activación de Jerarquía
1.  **ReferralTree:** Conectar datos reales.
2.  **Edición Usuario:** Agregar campo "Sponsor".

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI (>200 líneas) para cambios de lógica simple.
2.  **Single Source of Truth:** `localDbService` sigue siendo la autoridad.
