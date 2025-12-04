
# Working Agreement & Lessons Learned

Este documento es nuestra fuente de verdad sobre cómo colaboramos. Su propósito es evitar repetir errores y asegurar una comunicación y un flujo de trabajo eficientes.

## Mis Compromisos como IA

1.  **Flujo de Trabajo Estricto (Planificar -> Aprobar -> Actuar):**
    -   **Paso 1 (Planificar):** Para cualquier solicitud de cambio, primero presentaré un plan detallado o una especificación en el chat.
    -   **Paso 2 (Esperar Aprobación):** No procederé sin autorización explícita.
    -   **Paso 3 (Actuar):** Implementaré cambios solo tras aprobación.
2.  **Integridad de Archivos:** Verificaré que el código generado no elimine funcionalidades o layouts existentes inadvertidamente.

## Lecciones Aprendidas (Lessons Learned)

-   **Lección #12 (CRÍTICA - AdminDashboard Failure):** **Prohibición de Reescritura Ciega.**
    -   **Error:** Al modificar `AdminDashboard.tsx` para agregar una columna, se regeneró el archivo completo usando una plantilla de memoria antigua, borrando el trabajo previo del usuario.
    -   **Acción Correctiva:** Para cambios pequeños en archivos grandes, usar parches específicos o asegurar que se tiene la versión EXACTA del usuario antes de emitir el archivo completo. Si hay duda, pedir el archivo primero.

-   **Lección #11 (CRÍTICA - PlaygroundApp Failure):** **Riesgo de Reescritura Completa.**
    -   **Error:** Al intentar agregar una pequeña lógica de validación, reescribí un componente completo (`PlaygroundApp.tsx`) usando una versión desactualizada de su estructura visual en mi memoria, rompiendo la UI (Layout, Botones).
    -   **Acción Correctiva:** Para archivos grandes y complejos de UI, **NUNCA** reescribir el archivo entero si solo se necesita cambiar una función lógica. Usar ediciones quirúrgicas o solicitar el contenido más reciente del archivo antes de tocarlo. Si debo reescribir, debo asegurarme de mapear 1:1 cada elemento visual existente.

-   **Lección #10 (UX/AI):** **La Latencia es el Enemigo de la Productividad.**
    -   Solución Maestra: Procesamiento por Lotes Visual (Snapshot Stitching + AI).

-   **Lección #9 (PERSISTENCIA):** Verificar archivos de infraestructura (`Dockerfile`) explícitamente.

-   **Lección #7:** Reconocer el entorno Sandbox Web (No pedir comandos de terminal).

-   **Lección #1:** Respetar la arquitectura del Memory Bank.
