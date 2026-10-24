import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ApiError } from './api/client'
import { theme } from './theme'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry network and server errors once; a 4xx won't fix itself.
        retry: (failureCount, error) =>
          failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  })
}

interface ProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
  /** "test" turns off Mantine transitions and portals for jsdom. */
  env?: 'default' | 'test'
}

export function Providers({ children, queryClient, env = 'default' }: ProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <MantineProvider theme={theme} forceColorScheme="light" env={env}>
        <ModalsProvider>
          <Notifications position="top-right" />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
