
# Progress Tracker: Beast Reader Lotto

## Estado Actual de las Características

### Completado (v5.3 - Admin Power-Up)

-   [x] **Admin Dashboard:**
    -   [x] **Audit Hub:** Pestaña dedicada con filtros y logs detallados.
    -   [x] **Identidad:** Mostrar Avatar/Nombre en Ventas.
    -   [x] **Pagos:** Checkbox "Select All" para pagos masivos.
    -   [x] **Logs Usuarios:** Auditoría de cambios en perfiles.
-   [x] **User Dashboard:** Diseño Grid, Auth Mock, Historial, Playback.
-   [x] **Playground UI:** Layout estable.
-   [x] **Seguridad:** Iron Gate y Privacidad.

### En Cola de Desarrollo (Pendientes Reales)

-   [ ] **Sistema de Referidos (Jerarquía)**
    -   [ ] Agregar `sponsorId` a User Schema.
    -   [ ] UI: Asignar Sponsor en Admin.
    -   [ ] UI: Visualizar Árbol Real en User Dashboard.
-   [ ] **Beast Ledger (Economía Segura)**
    -   [ ] Diseño de Hash/Token Schema.
    -   [ ] Lógica "The Mint" (Creación Génesis).
    -   [ ] Lógica "Chain" (Herencia de Hash).
    -   [ ] Admin: Visualizador de Trazabilidad.
-   [ ] **Reglas de Negocio**
    -   [ ] Validación: Bloquear Horses + Venezuela.

## Problemas Conocidos

1.  **Riesgo de Regresión:** `PlaygroundApp.tsx` es un componente monolítico y frágil. Modificarlo requiere extremo cuidado con el JSX.
2.  **Persistencia Local:** Al limpiar la caché del navegador, se pierden los logs de auditoría locales.
