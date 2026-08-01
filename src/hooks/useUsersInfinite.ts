import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchUsersSelect } from '../api/users';
import { UsersSelectResponse } from '@/types';

export function useUsersInfinite(search: string) {
  return useInfiniteQuery({
    queryKey: ['users-select', search],
    queryFn: ({ pageParam }) => fetchUsersSelect({ pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage:UsersSelectResponse ) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}