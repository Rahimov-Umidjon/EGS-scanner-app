// app/index.tsx
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import UserSelectScreen from '@/screens/UserSelectScreen';
import { SelectUser } from '@/types';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const handleSelectUser = (user: SelectUser) => {
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
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <UserSelectScreen onSelectUser={handleSelectUser} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});