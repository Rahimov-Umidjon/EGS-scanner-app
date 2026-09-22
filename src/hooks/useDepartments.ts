import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '../api/users';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });
}
