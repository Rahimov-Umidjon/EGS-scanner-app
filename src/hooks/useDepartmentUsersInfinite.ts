import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchDepartmentUsers } from '../api/users';
import { DepartmentUsersResponse } from '@/types';

export function useDepartmentUsersInfinite(departmentId: number, search: string) {
  return useInfiniteQuery({
    queryKey: ['department-users', departmentId, search],
    queryFn: ({ pageParam }) => fetchDepartmentUsers({ departmentId, pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: DepartmentUsersResponse) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: Number.isFinite(departmentId),
  });
}
