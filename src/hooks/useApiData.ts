import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/utils/authFetch';

export function useApiData<T>(endpoint: string) {
    const query = useQuery<T>({
        queryKey: [endpoint],
        queryFn: async () => {
            const response = await authFetch(endpoint);
            if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
            return response.json() as Promise<T>;
        },
    });

    return {
        data: query.data ?? null,
        loading: query.isPending,
        error: query.error,
        refetch: query.refetch,
    };
}
