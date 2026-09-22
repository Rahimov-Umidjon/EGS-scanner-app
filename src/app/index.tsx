// app/index.tsx
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import DepartmentSelectScreen from '@/screens/DepartmentSelectScreen';
import { Department } from '@/types';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const handleSelectDepartment = (department: Department) => {
    router.push({
      pathname: '/department/[id]',
      params: {
        id: String(department.id),
        name: department.name,
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <DepartmentSelectScreen onSelectDepartment={handleSelectDepartment} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});