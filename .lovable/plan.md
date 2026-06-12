Plan para corregir banner y notificación de documentos

1. Ajustar la carga de “Mis Documentos”
   - Hacer que `useMisDocumentos` espere a que la sesión y el perfil de empleado estén listos antes de consultar.
   - Consultar explícitamente por `personal_id` del empleado cuando esté disponible, en vez de depender solo de RLS.
   - Mantener soporte para administradores sin romper la vista actual.

2. Mostrar notificación al iniciar sesión
   - Cambiar la lógica actual: hoy solo avisa documentos nuevos después de la primera carga, por eso si el recibo/examen ya estaba cargado antes de iniciar sesión no muestra toast.
   - Al abrir la app o iniciar sesión, si hay documentos pendientes, mostrar un mensaje tipo:
     - “Tenés un examen médico para revisar”
     - “Tenés un recibo de sueldo para ver y firmar”
     - o un resumen si hay varios.
   - Evitar repetir el mismo aviso constantemente usando almacenamiento local por usuario/documento.

3. Hacer el banner de Parte Diario más confiable
   - Mantener el banner amarillo cuando haya pendientes.
   - Asegurar que espere el resultado real de documentos antes de decidir no mostrarse.
   - Dejar el acceso fijo a “Mis Documentos” aunque no haya pendientes.

4. Mejorar Realtime
   - Cuando se suba un documento mientras el usuario tiene la app abierta, invalidar la consulta y mostrar toast inmediato.
   - Evitar suscripciones si todavía no existe `personal_id`.

5. Validación
   - Revisar que `/mis-documentos`, el botón fijo, el badge, el banner y el toast usen el mismo contador de pendientes.
   - Verificar que recibos pendientes cuenten hasta ser firmados y exámenes médicos hasta ser vistos.