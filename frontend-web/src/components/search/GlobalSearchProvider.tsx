'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { searchUsers, type SearchUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';

import { SearchUsersModal } from './SearchUsersModal';

type GlobalSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  open: () => void;
  close: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

type GlobalSearchProviderProps = {
  children: ReactNode;
};

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
  const router = useRouter();
  const [query, setQueryState] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const isClosingRef = useRef(false);
  const requestIdRef = useRef(0);

  const setQuery = useCallback((value: string) => {
    const normalizedValue = value;
    const trimmed = normalizedValue.trim();
    setQueryState(normalizedValue);
    setIsVisible(trimmed.length > 0);

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsLoadingMore(false);
      setErrorMessage(null);
      setPage(1);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    setIsLoadingMore(false);
    setErrorMessage(null);
    setPage(1);
    setTotalPages(0);
  }, []);

  const open = useCallback(() => {
    if (isClosingRef.current) return;
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    isClosingRef.current = true;
    setIsVisible(false);
    setIsLoading(false);
    setIsLoadingMore(false);
    setErrorMessage(null);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setTimeout(() => {
      isClosingRef.current = false;
    }, 300);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeoutId = setTimeout(() => {
      searchUsers(normalizedQuery, 1, 20)
        .then((response) => {
          if (requestIdRef.current === requestId) {
            setResults(response.items);
            setPage(response.page);
            setTotalPages(response.total_pages);
          }
        })
        .catch((error: unknown) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          const message = error instanceof Error ? error.message : 'Không thể tìm người dùng lúc này.';
          setErrorMessage(message);
          setResults([]);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible, query]);

  const loadMore = useCallback(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2 || isLoading || isLoadingMore || page >= totalPages) {
      return;
    }

    const nextPage = page + 1;
    setIsLoadingMore(true);
    setErrorMessage(null);

    searchUsers(normalizedQuery, nextPage, 20)
      .then((response) => {
        setResults((currentResults) => {
          const existingIds = new Set(currentResults.map((user) => user.id));
          const newItems = response.items.filter((user) => !existingIds.has(user.id));
          return [...currentResults, ...newItems];
        });
        setPage(response.page);
        setTotalPages(response.total_pages);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Không thể tải thêm người dùng lúc này.';
        setErrorMessage(message);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [isLoading, isLoadingMore, page, query, totalPages]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, isVisible]);

  const handleSelectUser = useCallback(
    (user: SearchUser) => {
      setIsVisible(false);
      const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
      router.push(
        ROUTES.profileDetail(String(user.id), {
          name: user.full_name,
          initials,
          preview: user.bio || 'Opened from search results.',
          bio: user.bio || 'Opened from search results.',
        })
      );
    },
    [router]
  );

  const contextValue = useMemo<GlobalSearchContextValue>(
    () => ({
      query,
      setQuery,
      open,
      close,
    }),
    [close, open, query, setQuery]
  );

  return (
    <GlobalSearchContext.Provider value={contextValue}>
      {children}
      <SearchUsersModal
        errorMessage={errorMessage}
        hasMore={page < totalPages}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onClose={close}
        onLoadMore={loadMore}
        onSelectUser={handleSelectUser}
        query={query}
        setQuery={setQuery}
        users={results}
        visible={isVisible}
      />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  }

  return context;
}
