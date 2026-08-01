import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useDebounce } from 'use-debounce';
import { useUsersInfinite } from '../hooks/useUsersInfinite'; 
import { SelectUser } from '@/types';

type Props = {
  onSelectUser: (user: SelectUser) => void;
};

export default function UserSelectScreen({ onSelectUser }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 400);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useUsersInfinite(debouncedSearch);

  const users = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  const handleEndReached = useCallback(() => {
    console.log(hasNextPage ,  !isFetchingNextPage)
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: SelectUser }) => (
      <TouchableOpacity style={styles.userRow} onPress={() => onSelectUser(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName?.[0]}
            {item.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.userName}>
          {item.firstName} {item.lastName}
        </Text>
      </TouchableOpacity>
    ),
    [onSelectUser]
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Foydalanuvchini qidirish..."
        value={searchInput}
        onChangeText={setSearchInput}
        autoCorrect={false}
      />

      {isLoading && !isRefetching ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" />
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Xatolik yuz berdi</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={{ color: '#fff' }}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Hech kim topilmadi</Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f1f4',
    fontSize: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '600' },
  userName: { fontSize: 16, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#888' },
  centerBox: { alignItems: 'center', marginTop: 32 },
  errorText: { color: 'red', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});