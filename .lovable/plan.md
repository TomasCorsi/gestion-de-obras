
# Plan: Agregar enlace de instalación PWA en pantallas de autenticación

## Resumen
Agregar un apartado visible en las pantallas de **Login** y **Registro de Empleado** que invite a los usuarios a instalar la aplicación PWA en sus dispositivos móviles (iOS o Android).

## Diseño propuesto
Se agregará un banner compacto debajo del formulario principal con:
- Icono de smartphone
- Texto breve explicando el beneficio de instalar la app
- Enlace a la página `/install` existente

## Cambios necesarios

### 1. Modificar Login.tsx
Agregar un banner de instalación PWA después del formulario, dentro del CardFooter:

```text
+------------------------------------------+
|          [Logo Calamina Sur]             |
|                                          |
|  Email: [________________]               |
|  Contraseña: [________________]          |
|                                          |
|  [      Iniciar Sesión      ]            |
|                                          |
|  ¿Eres empleado? Registrarse con Legajo  |
|                                          |
+------------------------------------------+
|  📱 Instala la app en tu celular         |
|  Acceso rápido desde tu pantalla inicio  |
|  [Cómo instalar →]                       |
+------------------------------------------+
```

### 2. Modificar RegistroEmpleado.tsx
Agregar el mismo banner después del formulario de registro:

```text
+------------------------------------------+
|          [Logo Calamina Sur]             |
|          Registro de Empleado            |
|                                          |
|  Nombre: [________________]              |
|  Legajo: [________________]              |
|  Email:  [________________]              |
|  ...                                     |
|                                          |
|  [      Registrarme      ]               |
|                                          |
|  ¿Ya tiene cuenta? Iniciar Sesión        |
|                                          |
+------------------------------------------+
|  📱 Instala la app en tu celular         |
|  Acceso rápido desde tu pantalla inicio  |
|  [Cómo instalar →]                       |
+------------------------------------------+
```

## Componente reutilizable (opcional)
Crear un componente `InstallAppBanner` para evitar duplicación de código, que incluya:
- Detección automática de si ya está instalada (no mostrar si ya es PWA)
- Estilos consistentes con el diseño actual
- Icono de smartphone + texto + enlace

## Archivos a modificar
1. `src/pages/Login.tsx` - Agregar banner de instalación
2. `src/pages/RegistroEmpleado.tsx` - Agregar banner de instalación
3. (Nuevo) `src/components/auth/InstallAppBanner.tsx` - Componente reutilizable para el banner

## Consideraciones
- El banner solo se mostrará si la app **no está instalada** (detectado via `display-mode: standalone`)
- El enlace llevará a `/install` donde están las instrucciones completas para iOS y Android
- El diseño será sutil pero visible, sin interferir con el flujo principal de autenticación
- Se usará el icono `Smartphone` de lucide-react para mantener consistencia visual
