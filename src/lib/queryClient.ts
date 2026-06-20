import { QueryClient } from '@tanstack/react-query';

const DAY = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: DAY,
            gcTime: DAY,
        },
    },
});
