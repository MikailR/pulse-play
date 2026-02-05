import React from 'react';

// Mock QueryClient
export class QueryClient {
  defaultOptions: Record<string, unknown>;

  constructor(options?: { defaultOptions?: Record<string, unknown> }) {
    this.defaultOptions = options?.defaultOptions || {};
  }

  clear() {}
  cancelQueries() {
    return Promise.resolve();
  }
  invalidateQueries() {
    return Promise.resolve();
  }
  refetchQueries() {
    return Promise.resolve();
  }
  fetchQuery() {
    return Promise.resolve();
  }
  prefetchQuery() {
    return Promise.resolve();
  }
  getQueryData() {
    return undefined;
  }
  setQueryData() {}
  getQueryState() {
    return undefined;
  }
  removeQueries() {}
  resetQueries() {
    return Promise.resolve();
  }
  isFetching() {
    return 0;
  }
  isMutating() {
    return 0;
  }
  getDefaultOptions() {
    return this.defaultOptions;
  }
  setDefaultOptions(options: Record<string, unknown>) {
    this.defaultOptions = options;
  }
  getMutationDefaults() {
    return {};
  }
  setMutationDefaults() {}
  getQueryDefaults() {
    return {};
  }
  setQueryDefaults() {}
  mount() {}
  unmount() {}
}

// Mock QueryClientProvider
export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
  client: QueryClient;
}) {
  return React.createElement(React.Fragment, null, children);
}

// Mock useQuery
export function useQuery() {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    status: 'idle',
    refetch: jest.fn(),
  };
}

// Mock useMutation
export function useMutation() {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    data: undefined,
    error: null,
    isLoading: false,
    isPending: false,
    isError: false,
    isSuccess: false,
    status: 'idle',
    reset: jest.fn(),
  };
}

// Mock useQueryClient
export function useQueryClient() {
  return new QueryClient();
}
