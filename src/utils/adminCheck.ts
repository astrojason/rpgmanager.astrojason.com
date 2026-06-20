import { useUserRole } from './role';

export function useIsAdmin(): boolean {
    const role = useUserRole();
    return role === 'admin';
}
