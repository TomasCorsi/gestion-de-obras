import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export interface ColumnFilterConfig {
  column: string;
  title: string;
  getValue?: (row: any) => string;
}

interface GridFilterToolbarProps {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  columnFilters: Record<string, Set<string>>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  data: any[];
  filterConfigs: ColumnFilterConfig[];
  children?: React.ReactNode;
}

export function GridFilterToolbar({
  globalSearch,
  setGlobalSearch,
  columnFilters,
  setColumnFilters,
  data,
  filterConfigs,
  children,
}: GridFilterToolbarProps) {
  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(set => set.size > 0).length;
  }, [columnFilters]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setGlobalSearch("");
  }, [setColumnFilters, setGlobalSearch]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 max-w-xs min-w-[150px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="h-8 pl-7 pr-7 text-sm bg-card border-border"
        />
        {globalSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setGlobalSearch("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      
      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="h-6 gap-1">
          {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      
      {children}
    </div>
  );
}

// Hook for managing grid filters
export function useGridFilters<T extends Record<string, any>>(
  data: T[],
  filterConfigs: ColumnFilterConfig[],
  searchFields: (keyof T)[]
) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  const getUniqueValues = useCallback((column: string) => {
    const config = filterConfigs.find(c => c.column === column);
    const values = new Set<string>();
    
    data.forEach((row) => {
      let value: string;
      if (config?.getValue) {
        value = config.getValue(row);
      } else {
        value = String(row[column] || "");
      }
      if (value) {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  }, [data, filterConfigs]);

  const toggleColumnFilter = useCallback((column: string, value: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set();
      } else {
        newFilters[column] = new Set(newFilters[column]);
      }
      
      if (newFilters[column].has(value)) {
        newFilters[column].delete(value);
      } else {
        newFilters[column].add(value);
      }
      
      return newFilters;
    });
  }, []);

  const clearColumnFilter = useCallback((column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setGlobalSearch("");
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Global search
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase();
        const matchesSearch = searchFields.some(field => {
          const value = row[field];
          return value && String(value).toLowerCase().includes(searchLower);
        });
        if (!matchesSearch) return false;
      }
      
      // Column filters
      for (const [column, allowedValues] of Object.entries(columnFilters)) {
        if (allowedValues.size === 0) continue;
        
        const config = filterConfigs.find(c => c.column === column);
        let displayValue: string;
        
        if (config?.getValue) {
          displayValue = config.getValue(row);
        } else {
          displayValue = String(row[column] || "");
        }
        
        if (!allowedValues.has(displayValue)) return false;
      }
      
      return true;
    });
  }, [data, globalSearch, columnFilters, searchFields, filterConfigs]);

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(set => set.size > 0).length;
  }, [columnFilters]);

  return {
    globalSearch,
    setGlobalSearch,
    columnFilters,
    setColumnFilters,
    filteredData,
    activeFilterCount,
    getUniqueValues,
    toggleColumnFilter,
    clearColumnFilter,
    clearAllFilters,
  };
}

// Column header with filter icon
interface ColumnFilterHeaderProps {
  column: string;
  title: string;
  getUniqueValues: (column: string) => string[];
  columnFilters: Record<string, Set<string>>;
  toggleColumnFilter: (column: string, value: string) => void;
  clearColumnFilter: (column: string) => void;
}

export function ColumnFilterHeader({ 
  column, 
  title, 
  getUniqueValues, 
  columnFilters, 
  toggleColumnFilter, 
  clearColumnFilter 
}: ColumnFilterHeaderProps) {
  const uniqueValues = getUniqueValues(column);
  const activeFilter = columnFilters[column];
  const hasFilter = activeFilter && activeFilter.size > 0;
  
  return (
    <div className="flex items-center gap-1">
      <span>{title}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-5 w-5 p-0 ${hasFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-popover border-border z-50" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Filtrar por {title}</span>
              {hasFilter && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => clearColumnFilter(column)}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {uniqueValues.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin valores</p>
              ) : (
                uniqueValues.map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${column}-${value}`}
                      checked={activeFilter?.has(value) || false}
                      onCheckedChange={() => toggleColumnFilter(column, value)}
                    />
                    <label
                      htmlFor={`${column}-${value}`}
                      className="text-sm cursor-pointer flex-1 truncate"
                    >
                      {value || "(vacío)"}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
