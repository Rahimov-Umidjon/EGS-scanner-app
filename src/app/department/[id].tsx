import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import DepartmentUsersScreen from '@/screens/DepartmentUsersScreen';
import { DepartmentUser } from '@/types';

export default function DepartmentUsersRoute() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();

  const handleSelectUser = (user: DepartmentUser) => {
    router.push({
      pathname: '/user/[id]',
      params: {
        id: String(user.id),
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name ?? '' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <DepartmentUsersScreen departmentId={Number(id)} onSelectUser={handleSelectUser} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});
