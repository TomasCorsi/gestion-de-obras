import * as React from "react";
import { Combobox } from "./combobox";

// Compatibility adapter for existing simple Select forms, retaining their
// values, optional sentinels, disabled state and selection callbacks.
type PartProps = { children?: React.ReactNode; value?: string; searchValue?: string; className?: string; placeholder?: string; disabled?: boolean };
export function SelectContent({ children }: PartProps) { return <>{children}</>; }
export function SelectItem({ children }: PartProps) { return <>{children}</>; }
export function SelectTrigger({ children }: PartProps) { return <>{children}</>; }
export function SelectValue(_props: PartProps) { return null; }

function text(node: React.ReactNode): string {
  return React.Children.toArray(node).map((child): string => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return React.isValidElement<PartProps>(child) ? text(child.props.children) : "";
  }).join("");
}

export function Select({ children, value = "", onValueChange, disabled }: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const options: { value: string; label: string; searchValue?: string }[] = [];
  let className: string | undefined;
  let placeholder: string | undefined;
  function visit(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement<PartProps>(node)) return;
      if (node.type === SelectItem && node.props.value !== undefined) {
        options.push({ value: node.props.value, label: text(node.props.children), searchValue: node.props.searchValue });
      } else {
        if (node.type === SelectTrigger) className = node.props.className;
        if (node.type === SelectValue) placeholder = node.props.placeholder;
        visit(node.props.children);
      }
    });
  }
  visit(children);
  return <Combobox options={options} value={value} onValueChange={(next) => onValueChange?.(next)} disabled={disabled} className={className} placeholder={placeholder} />;
}