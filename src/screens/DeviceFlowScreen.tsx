import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUserDevices } from '../hooks/useUserDevices';
import { useVerifyDevice } from '../hooks/useVerifyDevice';
import { useAssignDevice } from '../hooks/useAssignDevice';
import { DeviceStatus, SelectUser } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { toast, Toaster } from 'sonner-native';

type Props = {
  user: SelectUser;
  onBack: () => void;
};

type ScanMode = 'verify' | 'assign';

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  in_stock: "Omborda",
  assigned: "Biriktirilgan",
  in_repair: "Ta'mirda",
  lost: "Yo'qolgan",
  decommissioned: "Hisobdan chiqarilgan",
  damaged: "Shikastlangan",
  in_storage: 'nomalum',
  broken: 'broken',
  returned_for_verification: "Tekshiruvga qaytarildi",
};

export const STATUS_COLOR: Record<DeviceStatus, string> = {
  in_stock: "#16a34a",
  assigned: "#2563eb",
  in_repair: "#f59e0b",
  lost: "#b5dc26",
  returned_for_verification: "#dc2626",
  decommissioned: "#6b7280",
  broken: "#1daca5",
  damaged: "#ea580c",
  in_storage: "#950cea",
};

export default function DeviceFlowScreen({ user, onBack }: Props) {
  const { data, isLoading, isError, refetch } = useUserDevices(user.id);
  const verifyMutation = useVerifyDevice(user.id);
  const assignMutation = useAssignDevice(user.id);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('verify');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLock, setScanLock] = useState(false);
  const insets = useSafeAreaInsets();
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [verifiedIds, setVerifiedIds] = useState<Set<number>>(new Set());

  const { id } = useLocalSearchParams();

  const pendingDevices = useMemo(
    () => (data ?? []).filter((d) => !verifiedIds.has(d.id)),
    [data, verifiedIds]
  );
  const totalCount = data?.length ?? 0;
  const currentDevice = pendingDevices[0];
  const doneCount = totalCount - pendingDevices.length;

  const openScanner = useCallback(
    async (mode: ScanMode) => {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert("Ruxsat kerak", "Skanerlash uchun kamera ruxsati zarur.");
          return;
        }
      }
      setScanMode(mode);
      setFlash("off");
      setScanLock(false);
      setScannerOpen(true);
    },
    [permission, requestPermission]
  );

  const handleVerifyScan = useCallback(
    (barcode: string) => {
      if (id == null) return;

      verifyMutation.mutate(
        { deviceId: id, barcode },
        {
          onSuccess: (res) => {
            if (res.success) {
              toast.success('Tasdiqlandi!', { description: res.message });
              setScannerOpen(false);

            }
          },
          onError: () => {
            toast.error('Xatolik', { description: "Serverga ulanishda muammo bo'ldi." });
            setScanLock(false);
          },
        }
      );
    },
    [id, verifyMutation]
  );

  const handleAssignScan = useCallback(
    (barcode: string) => {
      assignMutation.mutate(
        { barcode, userId: user.id },
        {
          onSuccess: (res) => {
            if (res.success) {
              toast.success('Biriktirildi!', { description: res.message });
              setScannerOpen(false);
              refetch();
            } else if (res.notFound) {
              toast.error('Topilmadi', {
                description: "Bu qurilma tizimda yo'q. Avval omborga qo'shing.",
              });
              setScanLock(false);
              // Agar xohlasangiz, shu yerda yangi qurilma qo'shish ekraniga
              // navigate qilish mumkin, masalan:
              // router.push({ pathname: '/devices/new', params: { qrCode: res.barcode } });
            } else {
              toast.error('Xato', { description: res.message });
              setScanLock(false);
            }
          },
          onError: () => {
            toast.error('Xatolik', { description: "Serverga ulanishda muammo bo'ldi." });
            setScanLock(false);
          },
        }
      );
    },
    [user.id, assignMutation, refetch]
  );

  // Skan va qo'lda kiritishning umumiy logikasi
  const processCode = useCallback(
    (code: string) => {
      if (!code.trim()) return;
      setScanLock(true);

      if (scanMode === 'verify') {
        handleVerifyScan(code.trim());
      } else {
        handleAssignScan(code.trim());
      }
    },
    [scanMode, handleVerifyScan, handleAssignScan]
  );

  const handleBarcodeScanned = useCallback(
    ({ data: barcode }: { data: string }) => {
      if (scanLock || manualMode) return;
      processCode(barcode);
    },
    [scanLock, manualMode, processCode]
  );


  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) {
      toast.error('Xatolik', { description: "Inventar raqamini kiriting" });
      return;
    }
    processCode(manualCode);
    setManualCode('');
  }, [manualCode, processCode]);


  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }




  if (isError || !data) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Ma'lumotlarni yuklab bo'lmadi</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={{ color: '#fff' }}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBusy = verifyMutation.isPending || assignMutation.isPending;

  return (
    <>
      <ScrollView style={styles.container}>
        <Stack.Screen
          options={{
            headerTitle: () => (
              <Text style={styles.userTitle}>
                {user.firstName} {user.lastName}
              </Text>
            ),
          }}
        />

        {data?.map((device) => (
          <View key={device.id} style={styles.deviceRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[device.status] },
              ]}
            />
            <Text style={styles.deviceName}>{device.qrCode}</Text>
            <Text style={[styles.statusLabel, { color: device.isVerified ? '#16a34a' : '#dc2626' }]}>
              {/* {verifiedIds.has(device.id) ? '✓ Tasdiqlandi' : STATUS_LABEL[device.status]} */}
              {device.isVerified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
            </Text>
          </View>
        ))}

        <Modal visible={scannerOpen} animationType="fade">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <StatusBar style="light" />
            <Toaster position="top-center" />

            <CameraView
              style={{ flex: 1 }}
              facing="back"
              flash={flash}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "code128", "code39", "qr"],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            <TouchableOpacity
              style={styles.closeScannerBtn}
              onPress={() => setScannerOpen(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>Yopish</Text>
            </TouchableOpacity>

            {/* Qo'lda kiritish paneli */}
            <View style={styles.manualPanel}>
              {!manualMode ? (
                <TouchableOpacity
                  style={styles.manualToggleBtn}
                  onPress={() => setManualMode(true)}
                >
                  <Text style={styles.manualToggleText}>
                    Kod o'qilmayaptimi? Inventar raqamini kiriting
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.manualInputRow}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Inventar raqami (masalan INV-0001)"
                    placeholderTextColor="#999"
                    value={manualCode}
                    onChangeText={setManualCode}
                    autoCapitalize="characters"
                    autoFocus
                    editable={!scanLock}
                    onSubmitEditing={handleManualSubmit}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.manualSubmitBtn}
                    onPress={handleManualSubmit}
                    disabled={scanLock}
                  >
                    {scanLock ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Yuborish</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualCancelBtn}
                    onPress={() => {
                      setManualMode(false);
                      setManualCode('');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setFlash((p) => (p === "off" ? "on" : "off"))}
              >
                <Text style={{ color: "#fff", fontSize: 18 }}>
                  {flash === "on" ? "🔦 ON" : "🔦 OFF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setScannerOpen(false)}
              >
                <Text style={{ color: "#fff", fontSize: 18 }}>✕ Yopish</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>

      {pendingDevices.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <TouchableOpacity
            style={[styles.scanBtn, { bottom: insets.bottom }]}
            onPress={() => openScanner('verify')}
            disabled={isBusy}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanBtnText}>Tasdiqlash</Text>
            )}
          </TouchableOpacity>

        </View>
      ) : (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>✓ Barcha jihozlar tasdiqlandi</Text>
        </View>
      )}
    </>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  userTitle: { fontSize: 22, fontWeight: '700' },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  deviceName: { flex: 1, fontSize: 16 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  scanBtn: {
    marginTop: 24,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '90%',
  },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneBox: { marginTop: 24, alignItems: 'center' },
  doneText: { fontSize: 16, color: '#16a34a', fontWeight: '600' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeScannerBtn: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  progressBox: {
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  currentDeviceText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '700',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: 220,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scanFrame: {
    width: 280,
    borderRadius: 16,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  scanText: {
    color: "#fff",
    marginBottom: -35,
    fontSize: 16,
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlBtn: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
  },

  manualPanel: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
  },
  manualToggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  manualToggleText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  manualSubmitBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualCancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

});



