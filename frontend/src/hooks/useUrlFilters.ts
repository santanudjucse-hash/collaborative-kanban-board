import { useState, useEffect, useCallback } from 'react';
import { Priority, TaskFilters } from '../types/Task';

const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  priority: 'all',
  assignee: 'all',
};

/**
 * Synchronizes search, priority, and assignee filters with browser URL query parameters.
 * Supports page reload restoration and browser forward/back buttons.
 */
export function useUrlFilters() {
  // 1. Initialize state directly from URL query parameters
  const [filters, setFiltersState] = useState<TaskFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') || '';
    const rawPriority = params.get('priority');
    const priority: Priority | 'all' =
      rawPriority === 'low' || rawPriority === 'medium' || rawPriority === 'high'
        ? rawPriority
        : 'all';
    const assignee = params.get('assignee') || 'all';

    return { search, priority, assignee };
  });

  // 2. Synchronize URL when filters state changes
  const updateUrl = useCallback((newFilters: TaskFilters) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();

    if (newFilters.search.trim()) {
      params.set('search', newFilters.search.trim());
    }
    if (newFilters.priority !== 'all') {
      params.set('priority', newFilters.priority);
    }
    if (newFilters.assignee !== 'all') {
      params.set('assignee', newFilters.assignee);
    }

    const newQueryString = params.toString();
    const newRelativePathQuery =
      window.location.pathname + (newQueryString ? `?${newQueryString}` : '');

    // Avoid pushing duplicate states into browser history
    if (window.location.search !== (newQueryString ? `?${newQueryString}` : '')) {
      window.history.pushState({ ...newFilters }, '', newRelativePathQuery);
    }
  }, []);

  const setSearch = useCallback((search: string) => {
    setFiltersState((prev) => {
      const next = { ...prev, search };
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  const setPriority = useCallback((priority: Priority | 'all') => {
    setFiltersState((prev) => {
      const next = { ...prev, priority };
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  const setAssignee = useCallback((assignee: string) => {
    setFiltersState((prev) => {
      const next = { ...prev, assignee };
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    updateUrl(DEFAULT_FILTERS);
  }, [updateUrl]);

  // 3. Listen to browser back and forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search') || '';
      const rawPriority = params.get('priority');
      const priority: Priority | 'all' =
        rawPriority === 'low' || rawPriority === 'medium' || rawPriority === 'high'
          ? rawPriority
          : 'all';
      const assignee = params.get('assignee') || 'all';

      setFiltersState({ search, priority, assignee });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    filters,
    setSearch,
    setPriority,
    setAssignee,
    resetFilters,
  };
}
