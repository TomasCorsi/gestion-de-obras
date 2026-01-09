import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  onSubmit?: () => void;
  submitLabel?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  onSubmit,
  submitLabel = "Guardar",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} bg-card border-border`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-4">{children}</div>
        </ScrollArea>
        {onSubmit && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} className="bg-primary hover:bg-primary/90">
              {submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
