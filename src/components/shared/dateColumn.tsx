import { format, parse, isValid } from "date-fns";

// Helper to format date for display (dd/mm/yyyy)
export function formatDateForDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    if (!isValid(date)) return isoDate;
    return format(date, "dd/MM/yyyy");
  } catch {
    return isoDate;
  }
}

// Helper to parse user input back to ISO format
export function parseDateToISO(displayDate: string): string {
  if (!displayDate) return "";
  
  // If already in ISO format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return displayDate;
  }
  
  // Try to parse dd/mm/yyyy format
  try {
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // Fall through
  }
  
  // Try to parse d/m/yyyy format (flexible)
  try {
    const parsed = parse(displayDate, "d/M/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // Fall through
  }
  
  return displayDate;
}

// Custom date column definition for react-datasheet-grid
export const dateColumn = {
  component: ({ 
    rowData, 
    setRowData, 
    focus 
  }: { 
    rowData: string; 
    setRowData: (v: string) => void; 
    focus: boolean 
  }) => {
    const displayValue = formatDateForDisplay(rowData);
    
    return (
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          const isoValue = parseDateToISO(e.target.value);
          setRowData(isoValue);
        }}
        onBlur={(e) => {
          // On blur, ensure value is properly formatted
          const isoValue = parseDateToISO(e.target.value);
          if (isoValue !== rowData) {
            setRowData(isoValue);
          }
        }}
        placeholder="dd/mm/aaaa"
        autoFocus={focus}
        className="w-full h-full px-2 py-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
      />
    );
  },
  deleteValue: () => "",
  copyValue: ({ rowData }: { rowData: string }) => formatDateForDisplay(rowData),
  pasteValue: ({ value }: { value: string }) => parseDateToISO(value),
};
