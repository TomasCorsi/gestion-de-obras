import { Bell, User, LogOut, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { AppLauncher } from "./AppLauncher";

interface TopNavbarProps {
  title?: string;
  subtitle?: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  capataz: 'Capataz',
  maquinista: 'Maquinista',
};

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Logo + Page Title */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-foreground tracking-tight text-sm">
              Calamina Sur
            </span>
          </div>
        </Link>

        {/* Divider & Page Title - only show if title provided */}
        {title && (
          <>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-semibold text-foreground line-clamp-1">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* App Launcher */}
        <AppLauncher />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(profile?.nombre_completo)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[100px]">
                  {profile?.nombre_completo || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {role && (
                    <>
                      <Shield className="w-3 h-3" />
                      {roleLabels[role] || role}
                    </>
                  )}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col">
                <span>{profile?.nombre_completo || 'Usuario'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {role && roleLabels[role]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-foreground focus:bg-accent cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
