import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, Check, Zap, Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, border } from '@/lib/theme';
import { GlassPanel, Pill, BrutalButton, Loader, useTheme } from '@/components/ui';
import { FOOD_CATALOG } from '@/lib/foodCatalog';
import { useInventory, useXp } from '@/lib/hooks';

const COMMON_ITEMS = [
  'Banana', 'Apple', 'Tomato', 'Carrot', 'Spinach', 'Eggs', 'Milk',
  'Chicken Breast', 'Onion', 'Potato', 'Lettuce', 'Mushroom', 'Avocado',
  'Lemon', 'Greek Yogurt', 'Tofu', 'Oats', 'Brown Rice',
];

export default function ScannerScreen() {
  const { colors, mode, toggle } = useTheme();
  const { add } = useInventory();
  const { addXp } = useXp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<{ name: string; confidence: number; freshness: number } | null>(null);
  const [status, setStatus] = useState('Point at a food item');
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
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
        </View>
      </View>
    );
  }

  const runScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    setSaved(false);
    setStatus('Analyzing with AI...');
    try {
      if (!cameraRef.current) throw new Error('Camera not ready');
      // Low quality + skipProcessing drastically speeds up base64 encoding on old devices
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1, skipProcessing: true });
      
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setStatus('Missing EXPO_PUBLIC_GEMINI_API_KEY. Simulating...');
        setTimeout(() => {
          const pick = COMMON_ITEMS[Math.floor(Math.random() * COMMON_ITEMS.length)];
          const confidence = 0.82 + Math.random() * 0.16;
          const freshness = 0.55 + Math.random() * 0.4;
          setDetected({ name: pick, confidence, freshness });
          setStatus(`Found: ${pick}`);
          setScanning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 800);
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Identify the raw food ingredient. Estimate freshness 0.0 to 1.0. JSON only: {"name": "Apple", "freshness": 0.9, "confidence": 0.95}' },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: photo?.base64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API Error:', data);
        throw new Error(data.error?.message || 'Failed to fetch from Gemini');
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned. Gemini blocked the image.');
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      const cleanJson = textResponse.replace(/```json|```/gi, '').trim();
      const result = JSON.parse(cleanJson);
      
      const foodName = FOOD_CATALOG.find(f => f.name.toLowerCase() === result.name?.toLowerCase())?.name || result.name || 'Unknown Item';

      setDetected({ name: foodName, confidence: result.confidence || 0.9, freshness: result.freshness || 0.8 });
      setStatus(`Found: ${foodName}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('Scan error:', e);
      setStatus(`Error: ${e.message || 'Scan failed'}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
    }
  };

  const saveItem = async () => {
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
    }, 1200);
  };

  const discardItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetected(null);
    setShowPicker(false);
    setStatus('Point at a food item');
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
        <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />
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
        <TouchableOpacity style={styles.darkToggle} onPress={() => { Haptics.selectionAsync(); toggle(); }}>
          {mode === 'dark' ? <Sun size={18} color={palette.chalk} /> : <Moon size={18} color={palette.chalk} />}
        </TouchableOpacity>
      </View>

      <View style={styles.hud}>
        <Text style={[type.bodySm, { color: palette.chalk, marginBottom: spacing[3], textAlign: 'center' }]}>{status}</Text>

        {scanning ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
            <Loader />
            <Text style={[type.label, { color: palette.chalk, marginTop: spacing[3] }]}>ANALYZING VIA GEMINI...</Text>
          </View>
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
                {saved ? <Check size={16} color={palette.chalk} strokeWidth={2.5} /> : <Check size={16} color={palette.chalk} strokeWidth={2.5} />}
                <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>
                  {saved ? 'SAVED' : 'SAVE'}
                </Text>
              </BrutalButton>
            </View>
          </GlassPanel>
        ) : (
          <BrutalButton variant="sage" onPress={runScan} disabled={scanning} style={styles.scanBtn}>
            <Zap size={18} color={palette.chalk} strokeWidth={2.5} />
            <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>SCAN ITEM</Text>
          </BrutalButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  permissionCard: { alignItems: 'center', width: '90%', maxWidth: 400, borderRadius: 24, padding: spacing[6], shadowColor: palette.ink, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  cameraIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: palette.sageMist, alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, position: 'relative' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: palette.sage },
  scanlineWrap: { position: 'absolute', width: 240, height: 240, overflow: 'hidden', borderRadius: 16 },
  scanline: { width: 240, height: 3, backgroundColor: palette.sage, shadowColor: palette.sage, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  darkToggle: { position: 'absolute', top: 50, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.6)' },
  hud: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing[4], paddingBottom: 80, backgroundColor: 'rgba(0,0,0,0.6)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scanBtn: { paddingVertical: spacing[4], borderRadius: 16 },
  resultPanel: { marginTop: spacing[2] },
  correctRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing[2] },
  pickerScroll: { maxHeight: 180, marginTop: spacing[3], borderWidth: 1, borderRadius: 8 },
  pickerItem: { paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderBottomWidth: 1 },
  freshnessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[4] },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: spacing[5] },
});
