
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v5.2 - Admin Power-Up)

-   [x] **Admin Dashboard:**
    -   [x] **Audit Hub:** Pestaña dedicada con filtros y logs detallados.
    -   [x] **Identidad:** Mostrar Avatar/Nombre en Ventas.
    -   [x] **Pagos:** Checkbox "Select All" para pagos masivos.
    -   [x] **Logs Usuarios:** Auditoría de cambios en perfiles.
-   [x] **User Dashboard:** Diseño Grid, Auth Mock, Historial, Playback.
-   [x] **Playground UI:** Layout estable.
-   [x] **Seguridad:** Iron Gate y Privacidad.

### En Cola de Desarrollo (Pendientes Reales)

-   [ ] **Reglas de Negocio (Logic Only)**
    -   [ ] Validación: Bloquear Horses + Venezuela en `handleGenerateTicket`.
-   [ ] **Sistema de Referidos**
    -   [ ] Conectar Árbol a Datos Reales.
    -   [ ] Asignar Sponsor al Crear/Editar Usuario.
-   [ ] **Beast Ledger (Economía Segura)**
    -   [ ] Definir Hash Generation (Crypto).
    -   [ ] Backend: Tabla de Transacciones con ParentHash.
    -   [ ] Admin: Visualizador de Trazabilidad (Money Genealogy).

## Problemas Conocidos

1.  **Riesgo de Regresión:** `PlaygroundApp.tsx` es un componente monolítico y frágil. Modificarlo requiere extremo cuidado con el JSX.
2.  **Persistencia Local:** Al limpiar la caché del navegador, se pierden los logs de auditoría locales. (Se solucionará al migrar a Mongo/Firebase).
