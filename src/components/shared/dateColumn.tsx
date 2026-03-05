import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";

// Helper to format date for display (dd/mm/yyyy)
export function formatDateForDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate + "T12:00:00");
    if (!isValid(date)) return isoDate;
    return format(date, "dd/MM/yyyy");
  } catch {
    return isoDate;
  }
}

// Helper to parse user input back to ISO format
export function parseDateToISO(displayDate: string): string {
  if (!displayDate) return "";
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return displayDate;
  }
  
  try {
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch { /* Fall through */ }
  
  try {
    const parsed = parse(displayDate, "d/M/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch { /* Fall through */ }
  
  return displayDate;
}

// Component that uses local state to avoid corrupting partial input
const DateCellComponent = ({ 
  rowData, 
  setRowData, 
  focus,
  stopEditing,
}: { 
  rowData: string; 
  setRowData: (v: string) => void; 
  focus: boolean;
  active: boolean;
  stopEditing: (opts?: { nextRow?: boolean }) => void;
}) => {
  const [localValue, setLocalValue] = useState(() => formatDateForDisplay(rowData));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from external changes (e.g. undo, paste from outside)
  useEffect(() => {
    setLocalValue(formatDateForDisplay(rowData));
  }, [rowData]);

  useEffect(() => {
    if (focus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [focus]);

  const commitValue = (val: string) => {
    const iso = parseDateToISO(val);
    if (iso !== rowData) {
      setRowData(iso);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => commitValue(localValue)}
      onKeyDown={(e) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          commitValue(localValue);
          stopEditing({ nextRow: e.key === 'Enter' });
        }
        if (e.key === 'Escape') {
          setLocalValue(formatDateForDisplay(rowData));
          stopEditing();
        }
      }}
      placeholder="dd/mm/aaaa"
      style={{ 
        width: '100%', 
        height: '100%', 
        padding: '4px 8px',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      }}
    />
  );
};

export const dateColumn = {
  component: DateCellComponent,
  deleteValue: () => "",
  copyValue: ({ rowData }: { rowData: string }) => formatDateForDisplay(rowData),
  pasteValue: ({ value }: { value: string }) => parseDateToISO(value),
  disableKeys: true,
  keepFocus: true,
};
