import { useState, useEffect, useCallback } from 'react';
import {
  DIR_COLUMN_VISIBILITY_STORAGE_KEY,
  DEFAULT_VISIBLE_COLUMNS,
  CONFIGURABLE_COLUMNS,
  DIR_ALL_COLUMNS,
} from '../constants/dir-column-visibility';

const STORAGE_VERSION = 'v1'; // For future migrations

export const useDirColumnVisibility = () => {
  const [visibleColumns, setVisibleColumnsState] = useState(DEFAULT_VISIBLE_COLUMNS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DIR_COLUMN_VISIBILITY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.columns)) {
          // Validate columns exist
          const validColumns = parsed.columns.filter(col =>
            CONFIGURABLE_COLUMNS.includes(col)
          );
          if (validColumns.length > 0) {
            setVisibleColumnsState(validColumns);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load column visibility from localStorage:', error);
      // Fall back to defaults
    }
  }, []);

  // Save to localStorage whenever visibleColumns changes
  const setVisibleColumns = useCallback((columns) => {
    try {
      const data = {
        version: STORAGE_VERSION,
        columns,
        timestamp: Date.now(),
      };
      localStorage.setItem(DIR_COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(data));
      setVisibleColumnsState(columns);
    } catch (error) {
      console.warn('Failed to save column visibility to localStorage:', error);
      // Still update state even if storage fails
      setVisibleColumnsState(columns);
    }
  }, []);

  // Get all columns with visibility status
  const getAllColumnsWithVisibility = useCallback(() => {
    return Object.values(DIR_ALL_COLUMNS).map(column => ({
      ...column,
      isVisible: visibleColumns.includes(column.key),
    }));
  }, [visibleColumns]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, [setVisibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    getAllColumnsWithVisibility,
    resetToDefaults,
    configurableColumns: CONFIGURABLE_COLUMNS,
  };
};
