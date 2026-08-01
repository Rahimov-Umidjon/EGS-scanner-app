import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view'; 
import DeviceFlowScreen from '@/screens/DeviceFlowScreen';

export default function UserDeviceScreen() {
  const { id, firstName, lastName } = useLocalSearchParams<{
    id: string;
    firstName: string;
    lastName: string;
  }>();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <DeviceFlowScreen
          user={{ id: Number(id), firstName, lastName }}
          onBack={() => router.back()}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});