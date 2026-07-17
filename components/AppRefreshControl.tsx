import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useRefresh } from '@/context/RefreshContext';

type AppRefreshControlProps = Omit<RefreshControlProps, 'refreshing'> & {
  onRefresh: () => Promise<void> | void;
};

export function AppRefreshControl({ onRefresh, ...props }: AppRefreshControlProps) {
  const { isRefreshing, executeRefresh } = useRefresh();

  const handleRefresh = () => {
    executeRefresh(async () => {
      await onRefresh();
    });
  };

  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      colors={['#0A2540']} // Android
      tintColor="#0A2540"  // iOS
      {...props}
    />
  );
}