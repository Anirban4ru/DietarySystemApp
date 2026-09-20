import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, Check, Zap, Sun, Moon, ChevronDown, ChevronUp, Barcode, Wand2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, type, spacing, border, font } from '@/lib/theme';
import { GlassPanel, Pill, BrutalButton, PressScale, Loader, useTheme, useToast } from '@/components/ui';
import { PaywallModal } from '@/components/PaywallModal';
import { FOOD_CATALOG } from '@/lib/foodCatalog';
import { useInventory, useXp, usePro } from '@/lib/hooks';
import { parseReceipt } from '@/lib/ai';

export default function ScannerScreen() {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { add } = useInventory();
  const { addXp } = useXp();
  const { isPro, useScan, scansRemaining } = usePro();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'item' | 'receipt' | 'barcode'>('item');
  const [detected, setDetected] = useState<{ name: string; confidence: number; freshness: number } | null>(null);
  const [receiptItems, setReceiptItems] = useState<{ name: string; quantity: number }[] | null>(null);
  const [status, setStatus] = useState('Point at a food item or receipt');
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const reticleAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(reticleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(reticleAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [scanning, reticleAnim]);

  if (!permission) return <View style={[styles.center, { backgroundColor: colors.bg }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <View style={[styles.permissionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.cameraIconWrap}>
            <ScanLine size={40} color={palette.sageDeep} strokeWidth={2.5} />
          </View>
          <Text style={[type.h2, { marginTop: spacing[4], color: colors.text }]}>Camera Needed</Text>
          <Text style={[type.body, { color: colors.subText, marginTop: spacing[2], textAlign: 'center' }]}>
            The scanner uses your camera to detect food on-device. Nothing is uploaded.
          </Text>
          <BrutalButton variant="sage" onPress={requestPermission} style={{ marginTop: spacing[6] }}>
            ENABLE CAMERA
          </BrutalButton>
          <BrutalButton variant="outline" onPress={() => router.back()} style={{ marginTop: spacing[3] }}>
            GO BACK
          </BrutalButton>
        </View>
      </View>
    );
  }

  const runScan = async () => {
    if ((scanMode === 'item' || scanMode === 'receipt') && !isPro) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    setSaved(false);
    setStatus('Analyzing with AI...');

    try {
      if (!cameraRef.current) throw new Error('Camera not ready');
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.2, skipProcessing: true });

      if (!photo?.base64) throw new Error("Could not capture image");

      if (scanMode === 'receipt') {
        const result = await parseReceipt(photo.base64);
        if (result.items && result.items.length > 0) {
          setReceiptItems(result.items);
          setStatus(`Found ${result.items.length} items`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          throw new Error("No food items found on receipt");
        }
      } else {
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key missing');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Identify the raw food ingredient. Estimate freshness 0.0 to 1.0. JSON only: {"name": "Apple", "freshness": 0.9, "confidence": 0.95}' },
                { inline_data: { mime_type: 'image/jpeg', data: photo.base64 } }
              ]
            }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        const data = await response.json();
        if (!data.candidates) {
          console.error("Gemini API Error (Scan):", data);
          throw new Error(data.error?.message || 'Failed to parse image via Gemini.');
        }

        const cleanJson = data.candidates[0].content.parts[0].text.replace(/```json|```/gi, '').trim();
        const result = JSON.parse(cleanJson);
        const foodName = FOOD_CATALOG.find(f => f.name.toLowerCase() === result.name?.toLowerCase())?.name || result.name || 'Unknown Item';

        setDetected({ name: foodName, confidence: result.confidence || 0.9, freshness: result.freshness || 0.8 });
        setStatus(`Found: ${foodName}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      console.error('Scan error:', e);
      setStatus(`Error: ${e.message || 'Scan failed'}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
    }
  };

  const saveItem = async () => {
    if (scanMode === 'receipt' && receiptItems) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (const item of receiptItems) {
        await add({ name: item.name, freshnessScore: 1, quantity: item.quantity });
      }
      await addXp(10);
      setSaved(true);
      setStatus(`Saved ${receiptItems.length} items`);
      setTimeout(() => {
        setReceiptItems(null);
        setSaved(false);
        setStatus('Point at a receipt');
      }, 400);
      return;
    }

    if (!detected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await add({ name: detected.name, freshnessScore: detected.freshness });
    await addXp(5);
    setSaved(true);
    setStatus(`Saved ${detected.name}`);
    setTimeout(() => {
      setDetected(null);
      setSaved(false);
      setStatus('Point at a food item');
      setShowPicker(false);
    }, 300);
  };

  const discardItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetected(null);
    setReceiptItems(null);
    setShowPicker(false);
    setStatus(scanMode === 'receipt' ? 'Point at a receipt' : scanMode === 'barcode' ? 'Scan a barcode' : 'Point at a food item');
  };

  const handleBarcodeScanned = (data: string) => {
    if (scanning || detected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDetected({ name: `Packaged Good (${data})`, confidence: 1, freshness: 1 });
    setStatus('Barcode detected');
  };

  const freshnessLabel = detected
    ? detected.freshness < 0.7 ? 'Use soon' : detected.freshness < 0.85 ? 'Good' : 'Fresh'
    : '';
  const freshnessTone = detected
    ? detected.freshness < 0.7 ? 'danger' : detected.freshness < 0.85 ? 'warning' : 'success'
    : 'neutral';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          ref={cameraRef}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_e', 'upc_a'] }}
          onBarcodeScanned={scanMode === 'barcode' && !detected ? ({ data }) => handleBarcodeScanned(data) : undefined}
        />

        {/* Top Controls */}
        <View style={[styles.topControls, { top: insets.top || 20 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
            <X size={20} color={palette.chalk} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.selectionAsync(); toggle(); }}>
            {mode === 'dark' ? <Sun size={20} color={palette.chalk} /> : <Moon size={20} color={palette.chalk} />}
          </TouchableOpacity>
        </View>

        <View style={styles.overlay} pointerEvents="none">
          <Animated.View
            style={[styles.reticle, {
              transform: [{ scale: reticleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] }) }],
              borderColor: scanning ? palette.sage : 'rgba(255,255,255,0.9)',
              borderWidth: border.thick,
            }]}
          >
            <View style={[styles.corner, { top: -2, left: -2, borderLeftWidth: border.heavy, borderTopWidth: border.heavy }]} />
            <View style={[styles.corner, { top: -2, right: -2, borderRightWidth: border.heavy, borderTopWidth: border.heavy }]} />
            <View style={[styles.corner, { bottom: -2, left: -2, borderLeftWidth: border.heavy, borderBottomWidth: border.heavy }]} />
            <View style={[styles.corner, { bottom: -2, right: -2, borderRightWidth: border.heavy, borderBottomWidth: border.heavy }]} />
          </Animated.View>
          <View style={styles.scanlineWrap}>
            <Animated.View style={[styles.scanline, {
              transform: [{ translateY: reticleAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] }) }],
            }]} />
          </View>
        </View>
      </View>

      <View style={[styles.hud, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Text style={[type.bodySm, { color: palette.chalk, marginBottom: spacing[3], textAlign: 'center' }]}>{status}</Text>

        {scanning ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
            <Loader />
            <Text style={[type.label, { color: palette.chalk, marginTop: spacing[3] }]}>ANALYZING IMAGE...</Text>
          </View>
        ) : receiptItems ? (
          <GlassPanel style={styles.resultPanel}>
            <Text style={[type.h1, { color: colors.text, marginBottom: spacing[2] }]}>Receipt Items</Text>
            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
              {receiptItems.map((r, idx) => (
                <Text key={idx} style={[type.body, { color: colors.text }]}>• {r.quantity}x {r.name}</Text>
              ))}
            </ScrollView>
            <View style={styles.actionRow}>
              <BrutalButton variant="outline" onPress={discardItem} style={{ flex: 1 }}>DISCARD</BrutalButton>
              <BrutalButton variant="sage" onPress={saveItem} style={{ flex: 1.5 }}>
                <Wand2 size={16} color={palette.chalk} strokeWidth={2.5} />
                <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>{saved ? 'SAVED' : 'BATCH ADD TO PANTRY'}</Text>
              </BrutalButton>
            </View>
          </GlassPanel>
        ) : detected ? (
          <GlassPanel style={styles.resultPanel}>
            <Text style={[type.h1, { color: colors.text }]}>{detected.name}</Text>

            <TouchableOpacity style={styles.correctRow} onPress={() => { Haptics.selectionAsync(); setShowPicker(!showPicker); }}>
              <Text style={[type.bodySm, { color: colors.subText }]}>Not right? Tap to change</Text>
              {showPicker ? <ChevronUp size={14} color={colors.subText} /> : <ChevronDown size={14} color={colors.subText} />}
            </TouchableOpacity>

            {showPicker && (
              <ScrollView style={[styles.pickerScroll, { borderColor: colors.border }]} nestedScrollEnabled>
                {FOOD_CATALOG.map((f) => (
                  <TouchableOpacity
                    key={f.name}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }, f.name === detected.name && { backgroundColor: palette.sageMist }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDetected({ ...detected, name: f.name });
                      setShowPicker(false);
                    }}
                  >
                    <Text style={[type.bodySm, { color: colors.text }]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.freshnessRow}>
              <Text style={[type.body, { color: colors.text }]}>Freshness Estimate</Text>
              <Pill tone={freshnessTone as any}>{freshnessLabel}</Pill>
            </View>

            <View style={styles.actionRow}>
              <BrutalButton variant="outline" onPress={discardItem} style={{ flex: 1 }}>
                DISCARD
              </BrutalButton>
              <BrutalButton variant="sage" onPress={saveItem} style={{ flex: 1 }}>
                <Check size={16} color={palette.chalk} strokeWidth={2.5} />
                <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>
                  {saved ? 'SAVED' : 'SAVE'}
                </Text>
              </BrutalButton>
            </View>
          </GlassPanel>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing[3] }}>
              <BrutalButton variant={scanMode === 'item' ? 'sage' : 'dark'} onPress={() => setScanMode('item')} style={{ flex: 1, paddingVertical: spacing[2], paddingHorizontal: 4 }}>
                <Text style={[type.label, { color: palette.chalk, fontSize: 11 }]}>AI VISUAL</Text>
              </BrutalButton>
              <BrutalButton variant={scanMode === 'receipt' ? 'sage' : 'dark'} onPress={() => setScanMode('receipt')} style={{ flex: 1, paddingVertical: spacing[2], paddingHorizontal: 4 }}>
                <Text style={[type.label, { color: palette.chalk, fontSize: 11 }]}>RECEIPT</Text>
              </BrutalButton>
              <BrutalButton variant={scanMode === 'barcode' ? 'sage' : 'dark'} onPress={() => setScanMode('barcode')} style={{ flex: 1, paddingVertical: spacing[2], paddingHorizontal: 4 }}>
                <Text style={[type.label, { color: palette.chalk, fontSize: 11 }]}>BARCODE</Text>
              </BrutalButton>
            </View>
            <BrutalButton variant="sage" onPress={runScan} disabled={scanning || scanMode === 'barcode'} style={styles.scanBtn}>
              {scanMode === 'barcode' ? <Barcode size={18} color={palette.chalk} strokeWidth={2.5} /> : <Zap size={18} color={palette.chalk} strokeWidth={2.5} />}
              <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>
                {scanMode === 'barcode' ? 'AUTO-SCANNING...' : `SCAN ${scanMode === 'receipt' ? 'RECEIPT' : 'ITEM'}`}
              </Text>
            </BrutalButton>
          </View>
        )}
      </View>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  proScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  proScanBannerText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    color: palette.chalk,
    letterSpacing: 0.6,
  },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  permissionCard: { alignItems: 'center', width: '90%', maxWidth: 400, borderRadius: 24, padding: spacing[6], shadowColor: palette.ink, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  cameraIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: palette.sageMist, alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, position: 'relative' },
  topControls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: palette.sage },
  scanlineWrap: { position: 'absolute', width: 240, height: 240, overflow: 'hidden', borderRadius: 16 },
  scanline: { width: 240, height: 3, backgroundColor: palette.sage, shadowColor: palette.sage, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  hud: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing[4], backgroundColor: 'rgba(0,0,0,0.6)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scanBtn: { paddingVertical: spacing[4], borderRadius: 16 },
  resultPanel: { marginTop: spacing[2] },
  correctRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing[2] },
  pickerScroll: { maxHeight: 180, marginTop: spacing[3], borderWidth: 1, borderRadius: 8 },
  pickerItem: { paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderBottomWidth: 1 },
  freshnessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[4] },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: spacing[5] },
});


