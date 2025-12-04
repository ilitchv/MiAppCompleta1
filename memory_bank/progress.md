
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v5.2.1 - Admin Polish)

-   [x] **Admin Dashboard:**
    -   [x] **Plays View:** Columna Player, Lógica de Estados (No Match), Estética.
    -   [x] **Audit Hub:** Pestaña dedicada con filtros y logs detallados.
    -   [x] **Pagos:** Checkbox "Select All" para pagos masivos.
-   [x] **User Dashboard:** Diseño Grid, Auth Mock, Historial, Playback.
-   [x] **Reglas de Negocio:**
    -   [x] Validación: Bloquear Horses + Venezuela.
    -   [x] Lógica: Excluir Pulito/Venezuela de verificación de resultados.

### En Cola de Desarrollo (Pendientes Reales)

-   [ ] **Sistema de Referidos**
    -   [ ] Conectar Componente `ReferralTree` a `localDbService`.
    -   [ ] Asignar Sponsor al Crear/Editar Usuario (`UserSettingsModal` / `AdminDashboard`).
-   [ ] **Beast Ledger (Economía Segura)**
    -   [ ] Definir Hash Generation (Crypto).
    -   [ ] Backend: Tabla de Transacciones con ParentHash.

## Problemas Conocidos
1.  **Persistencia Local:** Al limpiar la caché del navegador, se pierden los logs de auditoría locales.
