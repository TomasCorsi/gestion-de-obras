# Análisis del sistema y plan de mejoras

## Estado actual (revisado hoy)

**Base de datos – salud: buena**
- Funcionando, sin reinicios, memoria 55%, disco 5%, conexiones 10/60. Tamaño 76 MB. Sin alertas de saturación en 48 h.
- Punto a vigilar: muchas operaciones canceladas acumuladas (~188 mil). Suele venir de guardados que fallan por permisos o reintentos; conviene identificar el origen.

**Seguridad**
- Escaneo de seguridad: solo 1 aviso abierto (la lista de tipos de material la ven todos los usuarios — es intencional, se comparte).
- Revisión automática de la base: 40 avisos de 3 tipos:
  - 4 vistas que saltean las reglas de acceso del usuario (ej. el selector de personal). Fueron hechas a propósito, pero hay que confirmar que no muestren datos sensibles (sueldos, DNI, teléfonos).
  - 15 funciones internas que se pueden llamar **sin iniciar sesión**. Riesgo más alto: cualquiera desde internet podría ejecutarlas.
  - 21 funciones internas que puede llamar cualquier usuario logueado (incluso empleados de campo), algunas deberían ser solo de admin (ej. recalcular horas, si no valida rol).
- El último escaneo profundo tiene 3 días y hubo cambios desde entonces: hay que volver a correrlo.
- Pendiente de versiones: navegación de la app (react-router 6) con 2 avisos moderados que solo se cierran con una actualización mayor.

**Fluidez / rendimiento**
- Hay ~20 archivos que piden todas las columnas de las tablas y ~68 con tipos poco estrictos: más datos de los necesarios y más chance de errores silenciosos.
- Pantallas muy pesadas (Documentos de empleado, Remitos, Partes diarios admin) concentran mucha lógica en un solo archivo: carga inicial más lenta en celulares.
- Tablero TV en tiempo real escucha 6 tablas; con mucho movimiento de remitos puede recargar seguido.

**Temas críticos funcionales**
- Pantalla en blanco en Android (rescate ya agregado; requiere publicar y confirmar en el celular).
- Notificaciones push: cada usuario debe reactivarlas tras el cambio de claves.
- Totales de combustible en administración: confirmar que ingresos a cisternas no se sumen como consumo.
- No hay pruebas automáticas de reglas de negocio clave (costos, anticipos, rentabilidad).

## Plan de trabajo propuesto

1. **Seguridad (prioridad alta)**
   - Quitar acceso sin sesión a las 15 funciones internas que no lo necesitan (mantener solo las del registro por legajo).
   - Restringir a admin las funciones administrativas y validar el rol dentro de ellas.
   - Revisar las 4 vistas y dejar solo columnas no sensibles.
   - Correr un escaneo de seguridad completo nuevo y reportar resultados.
2. **Estabilidad**
   - Investigar el origen de las operaciones canceladas (registros de la base) y corregir el guardado que falle.
   - Verificar en pantalla totales de combustible, Rentabilidad y RRHH con sesión de admin.
3. **Fluidez**
   - Pedir solo las columnas necesarias en las pantallas más usadas (remitos, partes, tablero).
   - Dividir las pantallas más pesadas para que carguen por partes.
   - Agrupar mejor las recargas del tablero en vivo.
4. **Pruebas**
   - Agregar pruebas chicas para: costo de órdenes sin IVA, anticipos en cotización, cálculo de rentabilidad y vacaciones por antigüedad.

## Detalles técnicos
- Migración: `REVOKE EXECUTE ... FROM anon` (y `authenticated` donde aplique) en funciones SECURITY DEFINER; `has_role(auth.uid(),'admin')` dentro de las administrativas.
- Vistas definer: auditar columnas de `personal_selector` y similares.
- Logs de Postgres para rollback; `security--run_security_scan` al final.
- Lazy-load con `React.lazy` y particionado de componentes grandes; `select` con columnas explícitas.
- Tests con vitest junto a los hooks existentes.
