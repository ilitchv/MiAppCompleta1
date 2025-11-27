
# Working Agreement & Lessons Learned

Este documento es nuestra fuente de verdad sobre cómo colaboramos. Su propósito es evitar repetir errores y asegurar una comunicación y un flujo de trabajo eficientes.

## Mis Compromisos como IA

1.  **Flujo de Trabajo Estricto (Planificar -> Aprobar -> Actuar):**
    -   **Paso 1 (Planificar):** Para cualquier solicitud de cambio, primero presentaré un plan detallado o una especificación en el chat para tu revisión.
    -   **Paso 2 (Esperar Aprobación):** **No procederé** a implementar ningún cambio en el código en el mismo paso que presento el plan. Esperaré tu autorización explícita en tu siguiente instrucción.
    -   **Paso 3 (Actuar):** Solo después de recibir tu aprobación, implementaré los cambios y actualizaré el Memory Bank.
2.  **Proactividad Controlada:** Mi proactividad se limitará a la calidad del código y a la propuesta de soluciones, no a la implementación de características no solicitadas. Cualquier idea nueva será presentada como una propuesta, siguiendo el flujo de trabajo anterior.
3.  **Verificación:** Antes de afirmar que un cambio está hecho, verificaré que el código refleja realmente ese cambio. Evitaré respuestas vacías o incorrectas.
4.  **Adherencia al Contexto:** Siempre me basaré en los archivos del Memory Bank y en cualquier archivo de referencia proporcionado por el usuario para asegurar la precisión y consistencia.
5.  **Comunicación Clara y Concisa:** Seré explícito sobre el alcance de los cambios. **NO** incluiré bloques de código extensos en el chat. Usaré enlaces a archivos o fragmentos muy breves si es necesario. El código completo irá solo en el bloque XML.
6.  **Aprendizaje Continuo:** Registraré nuevas lecciones aprendidas en este archivo para mejorar nuestro proceso.
7.  **Protocolo Ticolepe:** Si el usuario menciona la palabra clave "ticolepe", significa que un cambio previo no se aplicó correctamente o que estoy alucinando una implementación. Debo detenerme, reevaluar, forzar la actualización de los archivos y verificar rigurosamente antes de continuar.

## Lecciones Aprendidas (Lessons Learned)

-   **Lección #1 (2024-07-29):** La metodología del "Memory Bank" no es un único archivo, sino una **arquitectura de archivos de contexto**. Entender mal esta estructura fundamental lleva a una pérdida de tiempo y a una colaboración ineficiente.
    -   **Acción Correctiva:** Siempre seguir la estructura de archivos definida (`projectbrief`, `productContext`, etc.) y utilizar cada archivo para su propósito específico.

-   **Lección #2 (Añadida por el usuario):** Evitar repetir correcciones previamente confirmadas para ahorrar tiempo y recursos.
    -   **Acción Correctiva:** Consultar `progress.md` y `activeContext.md` para confirmar el estado actual antes de proponer o realizar cambios.

-   **Lección #3 (Añadida por el usuario):** Utilizar siempre los archivos de referencia externos proporcionados por el usuario para garantizar la restauración precisa del código.
    -   **Acción Correctiva:** Priorizar el contenido de los archivos que el usuario proporciona en el prompt sobre mi memoria de corto plazo de la sesión.

-   **Lección #4 (Añadida por el usuario):** Mantener una comunicación clara con el usuario sobre el alcance y la secuencia de los cambios.
    -   **Acción Correctiva:** Antes de generar el código, proporcionar una breve especificación de los cambios que se van a realizar, como se describe en mi directiva inicial.

-   **Lección #5 (2024-07-29):** No implementar características no solicitadas. La proactividad debe centrarse en la calidad y la propuesta, no en la ejecución unilateral.
    -   **Acción Correctiva:** Cualquier idea o mejora se presentará como una propuesta dentro del paso de planificación y esperará aprobación.

-   **Lección #6 (2024-07-29):** **No proponer y actuar en el mismo paso.** Es un error de procedimiento que elimina la oportunidad de revisión del usuario.
    -   **Acción Correctiva:** Seguir rigurosamente el flujo de trabajo de 3 pasos: **Planificar -> Esperar Aprobación -> Actuar**.

-   **Lección #7 (CRÍTICA):** **Reconocer el Entorno de Ejecución.** Este es un entorno sandbox web, NO un entorno de escritorio local.
    -   **Acción Correctiva:** NUNCA pedir al usuario que ejecute comandos de terminal.

-   **Lección #8 (DESPLIEGUE):** **Arquitectura Monolítica para Cloud Run.**
    -   Los servicios "One-Click Deploy" como Cloud Run ejecutan un solo contenedor.
    -   **Solución:** El archivo `server.js` debe configurarse para servir tanto la API como los archivos estáticos del Frontend (`dist`). `package.json` debe incluir un script `build` y ejecutarlo antes de iniciar el servidor. No se puede confiar en servidores de desarrollo separados (Vite + Node) en producción.

-   **Lección #9 (PERSISTENCIA):** **Verificación de Archivos de Infraestructura.**
    -   En entornos de chat, a veces los archivos nuevos (como `Dockerfile`) no se persisten en el primer intento.
    -   **Acción Correctiva:** Si el usuario reporta que faltan archivos, regenerarlos explícitamente en un nuevo bloque XML sin asumir que "ya deberían estar ahí".

-   **Lección #10 (UX/AI):** **La Latencia es el Enemigo de la Productividad.**
    -   Intentar usar IA (Gemini) para reconocimiento en tiempo real (letra por letra o línea por línea) rompe el flujo del usuario experto.
    -   Las librerías locales (Tesseract) son rápidas pero carecen de inteligencia contextual para formatos complejos.
    -   **Solución Maestra:** **Procesamiento por Lotes Híbrido.** Permitir al usuario trabajar rápido localmente (snapshots instantáneos) y delegar la inteligencia pesada a la IA en un solo evento final (Batch Processing). Esto optimiza costos, velocidad y precisión.
