import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard } from 'react-native';

import { searchUsers, type SearchUser } from '@/lib/auth';

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
  const [query, setQueryState] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClosingRef = useRef(false);

  const setQuery = useCallback((value: string) => {
    const normalizedValue = value;
    const trimmed = normalizedValue.trim();
    setQueryState(normalizedValue);
    setIsVisible(trimmed.length > 0);

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
  }, []);

  const open = useCallback(() => {
    if (isClosingRef.current) return;
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    isClosingRef.current = true;
    setIsVisible(false);
    setIsLoading(false);
    setErrorMessage(null);
    Keyboard.dismiss();

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

    let isActive = true;
    const timeoutId = setTimeout(() => {
      searchUsers(normalizedQuery, 20)
        .then((users) => {
          if (isActive) {
            setResults(users);
          }
        })
        .catch((error: unknown) => {
          if (!isActive) {
            return;
          }

          const message = error instanceof Error ? error.message : 'Không thể tìm người dùng lúc này.';
          setErrorMessage(message);
          setResults([]);
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isVisible, query]);

  const handleSelectUser = useCallback((user: SearchUser) => {
    setIsVisible(false);
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: String(user.id),
        name: user.full_name,
        initials: `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase(),
        preview: user.bio || 'Opened from search results.',
        bio: user.bio || 'Opened from search results.',
      },
    });
  }, []);

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
        isLoading={isLoading}
        onClose={close}
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
