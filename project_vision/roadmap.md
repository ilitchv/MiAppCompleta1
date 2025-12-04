
# Project Vision & Roadmap

Este documento describe la visión a largo plazo para **Beast Reader Lotto** y el plan para implementarla de forma modular.

## Visión Global

Transformar Beast Reader Lotto de una herramienta de gestión de apuestas a una plataforma completa para jugadores de lotería serios. Esto incluye no solo la creación de tickets, sino también el seguimiento de resultados, análisis de patrones y gestión de presupuesto.

## Plan de Implementación Modular

### Módulo 1: Cuentas de Usuario y Persistencia en la Nube (COMPLETADO PARCIALMENTE - Fase Mock)

**Objetivo:** Permitir a los usuarios crear cuentas para guardar sus jugadas y configuraciones de forma segura en la nube.
-   **Característica 1.1:** Implementar `AuthContext` y UI de Login/Dashboard. (Hecho - Mock)
-   **Característica 1.2:** Migrar la persistencia a Firebase (Auth + Firestore). (Pendiente)
-   **Característica 1.3:** Crear una página de perfil de usuario. (Hecho)

### Módulo 2: Historial de Apuestas y Reportes (COMPLETADO)

**Objetivo:** Proporcionar a los usuarios un historial completo.
-   **Característica 2.1:** Sección "Historial de Tickets" en Dashboard. (Hecho)
-   **Característica 2.2:** "Smart Viewer" (Ver detalles y estado Ganador/Perdedor). (Hecho)
-   **Característica 2.3:** Función "Playback" para repetir jugadas. (Hecho)

### Módulo 3: Analíticas y Estadísticas de Números

**Objetivo:** Ofrecer herramientas de análisis.
-   **Característica 3.1:** Integrar resultados históricos. (En Progreso)
-   **Característica 3.2:** Dashboard de "números calientes y fríos".
-   **Característica 3.3:** Alertas de cierre de sorteos.

### Módulo 4: Notificaciones y Alertas

**Objetivo:** Mantener a los usuarios informados.
-   **Característica 4.1:** Notificaciones Push para premios.
-   **Característica 4.2:** Alertas de saldo bajo.

### Módulo 5: Beast Office Command Center (COMPLETADO)

**Objetivo:** Un panel de administración total para gestionar el ecosistema de usuarios.

-   **Característica 5.1: Gestión de Usuarios (CRUD)**
    -   Crear, Editar y Desactivar usuarios. (Hecho v5.2)
    -   Audit Logs de cambios de perfil. (Hecho v5.3)

-   **Característica 5.2: Control Financiero**
    -   **Gestión de Saldo:** Botones para "Cargar Crédito" y "Debitar". (Hecho v5.2)
    -   **Pago de Premios:** Liberar saldo retenido de premios. (Hecho v5.3 Bulk Payouts)

-   **Característica 5.3: Gestión de Red (Referidos) - PRÓXIMO**
    -   Visualizar el árbol completo de referidos de la plataforma con datos reales.
    -   **Edición de Jerarquía:** Mover usuarios de un "padre" a otro (re-estructuración de red).

### Módulo 6: Beast Ledger (Economía Segura & Trazabilidad) - NUEVO

**Objetivo:** Garantizar que el dinero dentro del ecosistema sea infalsificable y 100% rastreable mediante criptografía (Hashes).

-   **Concepto Central:** Cada unidad de moneda es un "Token" con un Hash Único.
    -   **The Mint (La Casa de la Moneda):** Los tokens solo se pueden crear (Genesis Hash) por:
        1.  **Depósito Externo:** (Stripe, CashApp, Crypto) -> Crea dinero nuevo en el sistema.
        2.  **Premio Auditado:** (Admin aprueba ticket ganador) -> Convierte "Potencial" en "Saldo Real".
    
-   **Característica 6.1: Chain of Custody (Cadena de Custodia)**
    -   Si un usuario gasta una fracción de sus tokens (ej: apuesta $5 de un depósito de $10), los nuevos tokens resultantes heredan el hash original como "Parent Hash".
    -   Esto crea un árbol genealógico inmutable para cada centavo. Nadie puede "inyectar" saldo en la base de datos sin romper la cadena de hashes.

-   **Característica 6.2: The Eye (Visibilidad Total)**
    -   Herramienta visual para el Admin donde se puede inspeccionar cualquier transacción y ver su origen exacto ("Este dólar vino del depósito #554 de Juan, luego fue ganado por Pedro").
    -   Registro de identidad: Qué usuario o Admin firmó cada bloque de creación o división.
