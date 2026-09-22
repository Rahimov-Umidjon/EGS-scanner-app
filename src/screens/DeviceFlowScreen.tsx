import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { File } from 'expo-file-system';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUserDevices } from '../hooks/useUserDevices';
import { useVerifyDevice } from '../hooks/useVerifyDevice';
import { useAssignDevice } from '../hooks/useAssignDevice';
import { DeviceStatus, Devices, SelectUser } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { toast, Toaster } from 'sonner-native';
import axios from 'axios';

type Props = {
  user: SelectUser;
  onBack: () => void;
};

type ScanMode = 'verify' | 'assign';

// Rasmdan o'qilgan matn ichidan "EGS-000528" kabi inventar kodini ajratib oladi.
// Shtrix kod shikastlangan bo'lsa ham, uning tagidagi matn OCR orqali o'qib olinadi.
function extractInventoryCode(text: string): string | null {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ');
  const matches = normalized.match(/[A-Z]{2,}[\s-]{0,2}\d{3,}/g);
  if (!matches || matches.length === 0) return null;

  const best = matches.sort((a, b) => b.length - a.length)[0];
  return best.replace(/\s+/g, '-').replace(/-{2,}/g, '-');
}

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

// deviceType.name (masalan "Noutbuk", "Sichqoncha") bo'yicha mos ikonkani tanlaydi
const DEVICE_TYPE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "noutbuk": "laptop",
  "sichqoncha": "mouse",
  "klaviatura": "keyboard",
  "monitor": "monitor",
  "system blok": "desktop-tower",
  "telefon": "cellphone",
  "quloqchin": "headphones",
  "printer": "printer",
};

function getDeviceTypeIcon(typeName?: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (!typeName) return "devices";
  return DEVICE_TYPE_ICON[typeName.trim().toLowerCase()] ?? "devices";
}

export default function DeviceFlowScreen({ user, onBack }: Props) {
  const { data, isLoading, isError, refetch } = useUserDevices(user.id);
  const verifyMutation = useVerifyDevice(user.id);
  const assignMutation = useAssignDevice(user.id);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('verify');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLock, setScanLock] = useState(false);
  const insets = useSafeAreaInsets();
  const [torchOn, setTorchOn] = useState(false);

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Klaviatura balandligini kuzatish
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const pendingDevices = useMemo(
    () => (data ?? []).filter((d) => !d.isVerified),
    [data]
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
      setTorchOn(false);
      setScanLock(false);
      setScannerOpen(true);
    },
    [permission, requestPermission]
  );

  const handleVerifyScan = useCallback(
    (barcode: string) => {
      if (!currentDevice) return;

      verifyMutation.mutate(
        { deviceId: currentDevice.id, barcode },
        {
          onSuccess: (res) => {
            if (res.success) {
              toast.success('Tasdiqlandi!', { description: res.message });
              setScannerOpen(false);

            } else if (!res.success) {
              toast.error('Topilmadi', {
                description: res.message || "Bu qurilma tizimda yo'q. Avval omborga qo'shing.",
              });
              setScannerOpen(false);
            }
          },
          onError: (error) => {
            if (axios.isAxiosError(error)) {
              toast.error('Topilmadi', {
                description: error.response?.data?.message || "Bu qurilma tizimda yo'q. Avval omborga qo'shing.",
              });
            } else {
              toast.error('Xatolik', { description: "Serverga ulanishda muammo bo'ldi." });
            }
             setScannerOpen(false);
            setScanLock(false);
          },
        }
      );
    },
    [currentDevice, verifyMutation]
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

      console.log(`[API ga yuborilayotgan kod] mode=${scanMode} code="${code.trim()}"`);

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

  // Shtrix kod shikastlangan bo'lsa, kamerani kod tagidagi matnga qaratib
  // suratga olamiz va OCR orqali matnni o'qib, tasdiqlash uchun maydonga qo'yamiz.
  const handleOcrScan = useCallback(async () => {
    if (!cameraRef.current || ocrLoading || scanLock) return;

    setOcrLoading(true);
    let photoUri: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      if (!photo?.uri) {
        throw new Error('no-photo');
      }
      photoUri = photo.uri;

      const result = await TextRecognition.recognize(photo.uri);
      const code = extractInventoryCode(result.text);

      console.log(`[OCR] o'qilgan xom matn: "${result.text}"`);
      console.log(`[OCR] ajratilgan kod: "${code ?? 'topilmadi'}"`);

      if (code) {
        setManualMode(true);
        setManualCode(code);
        toast.success('Matn topildi', { description: code });
      } else {
        toast.error('Matn topilmadi', {
          description: "Kodga yaqinroq va yorug'roq joyda qayta urinib ko'ring",
        });
      }
    } catch {
      toast.error('Xatolik', { description: "Rasmni o'qib bo'lmadi, qayta urinib ko'ring" });
    } finally {
      // Vaqtinchalik suratni kesh papkasidan darhol o'chiramiz — aks holda
      // har bir OCR urinishi telefon xotirasida rasm to'plab boradi.
      if (photoUri) {
        try {
          new File(photoUri).delete();
        } catch {
          // fayl allaqachon yo'q bo'lishi mumkin, e'tiborsiz qoldiramiz
        }
      }
      setOcrLoading(false);
    }
  }, [ocrLoading, scanLock]);


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

        {data?.map((device: Devices) => (
          <View key={device.id} style={styles.deviceRow}>
            <View style={styles.deviceTypeIcon}>
              <MaterialCommunityIcons
                name={getDeviceTypeIcon(device.deviceType?.name)}
                size={22}
                color="#4f46e5"
              />
            </View>

            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.deviceType?.name ?? device.qrCode}</Text>
              <Text style={styles.deviceSubText}>
                {device.qrCode} · {device.brand?.name}
              </Text>
            </View>

            {/* <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[device.status] },
              ]}
            /> */}

            <Ionicons
              name={device.isVerified ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={device.isVerified ? '#16a34a' : '#dc2626'}
              style={{ marginLeft: 8 }}
            />
          </View>
        ))}

        <Modal visible={scannerOpen} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar style="light" />
            <Toaster position="top-center" />

            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "code128", "code39", "qr"],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Kamera ustidagi qorong'i niqob + o'rtadagi skan ramkasi */}
            <View style={styles.scannerOverlay} pointerEvents="box-none">
              <View style={[styles.overlayTop, { paddingTop: insets.top + 8 }]}>
                <View style={styles.scannerTopBar}>
                  <TouchableOpacity
                    style={styles.iconCircleBtn}
                    onPress={() => setScannerOpen(false)}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.scannerTitleBox}>
                    <Text style={styles.scannerTitleText}>
                      {scanMode === 'verify' ? 'Qurilmani tekshirish' : 'Qurilmani biriktirish'}
                    </Text>
                    {scanMode === 'verify' && (
                      <Text style={styles.scannerProgressText}>
                        {doneCount}/{totalCount} tekshirildi
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.iconCircleBtn, torchOn && styles.iconCircleBtnActive]}
                    onPress={() => setTorchOn((p) => !p)}
                  >
                    <Ionicons
                      name={torchOn ? 'flashlight' : 'flashlight-outline'}
                      size={22}
                      color={torchOn ? '#1a1a1a' : '#fff'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.scanCornerTL]} />
                  <View style={[styles.scanCorner, styles.scanCornerTR]} />
                  <View style={[styles.scanCorner, styles.scanCornerBL]} />
                  <View style={[styles.scanCorner, styles.scanCornerBR]} />
                </View>
                <View style={styles.overlaySide} />
              </View>

              <View style={styles.overlayBottom}>
                <View style={styles.scanHintBox}>
                  <Text style={styles.scanText}>
                    QR yoki shtrix-kodni ramka ichiga joylashtiring
                  </Text>
                  {scanMode === 'verify' && currentDevice && (
                    <Text style={styles.currentDeviceText}>
                      Navbatda: {currentDevice.qrCode}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Qo'lda kiritish paneli — klaviatura balandligiga qarab ko'tariladi */}
            <View
              style={[
                styles.manualPanel,
                {
                  bottom: manualMode
                    ? keyboardHeight > 0
                      ? keyboardHeight + 30
                      : 130
                    : 130,
                },
              ]}
            >
              {!manualMode ? (
                <TouchableOpacity
                  style={styles.manualToggleBtn}
                  onPress={() => setManualMode(true)}
                >
                  <Ionicons name="create-outline" size={16} color="#fbbf24" />
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
                      <Ionicons name="arrow-up" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualCancelBtn}
                    onPress={() => {
                      setManualMode(false);
                      setManualCode('');
                      Keyboard.dismiss();
                    }}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Klaviatura ochiq bo'lganda pastki tugmani yashirish */}
            {keyboardHeight === 0 && (
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={styles.ocrBtn}
                  onPress={handleOcrScan}
                  disabled={ocrLoading || scanLock}
                >
                  {ocrLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="text-outline" size={22} color="#fff" />
                      <Text style={styles.ocrBtnText}>Matnni o'qish</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  deviceTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '500' },
  deviceSubText: { fontSize: 12, color: '#888', marginTop: 2 },
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
  // --- Skaner oynasi ustidagi niqob + ramka ---
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  overlayTop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleBtnActive: {
    backgroundColor: '#fbbf24',
  },
  scannerTitleBox: { alignItems: 'center' },
  scannerTitleText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scannerProgressText: { color: '#c7d2fe', fontSize: 12, marginTop: 2, fontWeight: '600' },
  overlayMiddle: {
    flexDirection: 'row',
    height: 240,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanFrame: {
    width: 260,
    height: 240,
  },
  scanCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#4f46e5',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 20,
  },
  scanHintBox: { alignItems: 'center', gap: 6 },
  scanText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  currentDeviceText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },

  // --- Pastki boshqaruv tugmalari ---
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  ocrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(79,70,229,0.85)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
  },
  ocrBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // --- Qo'lda kod kiritish paneli ---
  manualPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
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
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  manualSubmitBtn: {
    backgroundColor: '#4f46e5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualCancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});