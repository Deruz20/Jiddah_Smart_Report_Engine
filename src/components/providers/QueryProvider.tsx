'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { OFFLINE_SYNC_EVENT, OfflineSyncStatusSnapshot } from '@/lib/offline-sync';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 1,
            networkMode: 'offlineFirst',
          },
          mutations: {
            retry: 0,
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  useEffect(() => {
    // Hook TanStack Query's onlineManager to the custom offline-sync engine & browser events
    let cleanup: (() => void) | undefined;
    onlineManager.setEventListener((setOnline) => {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);
      const handleSyncStatus = (event: Event) => {
        const custom = event as CustomEvent<OfflineSyncStatusSnapshot>;
        if (custom.detail?.isOnline !== undefined) {
          setOnline(custom.detail.isOnline);
        }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener(OFFLINE_SYNC_EVENT, handleSyncStatus);

      cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener(OFFLINE_SYNC_EVENT, handleSyncStatus);
      };

      return cleanup;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
