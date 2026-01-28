
# Plan: Restricción de Acceso para Empleados de Campo

## Resumen
Configurar el sistema para que los empleados registrados (Maquinista, Chofer, Mecánico, etc.) solo tengan acceso a la sección "Parte Diario" con una interfaz móvil simplificada, sin mostrar el menú de aplicaciones completo.

## Cambios a Implementar

### 1. Detectar si el Usuario es "Empleado de Campo"
Un empleado de campo es aquel que:
- Tiene un registro vinculado en la tabla `personal` (tiene `personal.user_id` igual a su `auth.uid()`)
- Su rol de personal NO es "administrativo" o "capataz con acceso admin"

La diferencia clave:
- **Usuario Admin/Capataz**: Puede acceder a todas las secciones según su rol
- **Empleado de Campo**: Solo puede acceder a `/parte-diario`

### 2. Modificar el Hook useEmpleadoProfile
Agregar una propiedad `isFieldEmployee` que indique si el usuario es un empleado de campo que debe tener acceso restringido.

### 3. Modificar TopNavbar
Para empleados de campo:
- Ocultar el botón `AppLauncher` (el grid de aplicaciones)
- Solo mostrar el logo, nombre del usuario y botón de cerrar sesión

### 4. Redirigir Automáticamente
Cuando un empleado de campo inicia sesión:
- Si intenta ir a `/` (Index), redirigir a `/parte-diario`
- Si intenta acceder a cualquier otra ruta, mostrar acceso denegado o redirigir

### 5. Crear Vista Móvil Dedicada para Empleados
Simplificar la interfaz para que en lugar del launcher completo, vean directamente el formulario de Parte Diario.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useEmpleadoProfile.ts` | Agregar flag `isFieldEmployee` |
| `src/components/layout/TopNavbar.tsx` | Ocultar AppLauncher para empleados de campo |
| `src/pages/Index.tsx` | Redirigir empleados de campo a `/parte-diario` |
| `src/App.tsx` | Agregar lógica de redirección para empleados de campo |

## Diseño de UI Móvil para Empleados

```text
┌──────────────────────────────────────┐
│ 🚜 Calamina Sur     [Juan P.] [X]   │  ← Navbar simplificado
├──────────────────────────────────────┤
│                                      │
│        📋 PARTE DIARIO               │
│        Hola, Juan (Maquinista)       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [Formulario del día]          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [Historial de partes]         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

## Sección Técnica

### Lógica de detección de empleado de campo
```typescript
// useEmpleadoProfile.ts
export function useEmpleadoProfile() {
  // ... código existente ...
  
  // Un empleado de campo es aquel que:
  // 1. Tiene registro en personal
  // 2. Su rol NO es administrativo
  const isFieldEmployee = empleado !== null && 
    !['administrativo'].includes(empleado.rol);
  
  return {
    // ... propiedades existentes ...
    isFieldEmployee, // true si solo debe ver Parte Diario
  };
}
```

### TopNavbar simplificado
```typescript
// TopNavbar.tsx
export function TopNavbar() {
  const { isFieldEmployee } = useEmpleadoProfile();
  
  return (
    <header>
      {/* Logo siempre visible */}
      
      {/* AppLauncher solo para usuarios NO de campo */}
      {!isFieldEmployee && <AppLauncher />}
      
      {/* Menú de usuario siempre visible */}
    </header>
  );
}
```

### Redirección en Index.tsx
```typescript
// Index.tsx
const Index = () => {
  const { isFieldEmployee, loading } = useEmpleadoProfile();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isFieldEmployee) {
      navigate('/parte-diario', { replace: true });
    }
  }, [isFieldEmployee, loading, navigate]);
  
  if (loading || isFieldEmployee) {
    return <LoadingScreen />;
  }
  
  // ... resto del componente para admin/capataz
};
```

## Resultado Esperado

1. **Empleados de campo** (Maquinista, Chofer, Mecánico, Sereno, Topógrafo, Ayudante):
   - Solo ven la página de Parte Diario
   - Navbar sin menú de aplicaciones
   - Interfaz 100% móvil
   
2. **Administradores y Capataces**:
   - Acceso completo al sistema
   - Ven el launcher con todas las aplicaciones
   - Pueden ver todos los partes diarios de todos los empleados
