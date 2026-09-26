import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { YOLOXDetection } from '@/lib/yolox';
import { palette, font } from '@/lib/theme';

interface BoundingBoxOverlayProps {
  boxes: YOLOXDetection[];
  viewWidth: number;
  viewHeight: number;
  onSelectBox?: (box: YOLOXDetection) => void;
}

export function BoundingBoxOverlay({
  boxes,
  viewWidth,
  viewHeight,
  onSelectBox,
}: BoundingBoxOverlayProps) {
  if (!boxes || boxes.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {boxes.map((box) => {
        const left = box.rect.x * viewWidth;
        const top = box.rect.y * viewHeight;
        const width = box.rect.width * viewWidth;
        const height = box.rect.height * viewHeight;

        const isHighConfidence = box.confidence >= 0.75;
        const borderColor = isHighConfidence ? palette.amber : palette.forestDeep;
        const badgeBg = isHighConfidence ? palette.amber : palette.forestDeep;

        return (
          <TouchableOpacity
            key={box.id}
            activeOpacity={0.8}
            onPress={() => onSelectBox?.(box)}
            style={[
              styles.box,
              {
                left,
                top,
                width,
                height,
                borderColor,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Detected ${box.label}, confidence ${Math.round(box.confidence * 100)} percent`}
          >
            {/* Top-left Corner Accent */}
            <View style={[styles.cornerTopLeft, { borderColor }]} />
            {/* Top-right Corner Accent */}
            <View style={[styles.cornerTopRight, { borderColor }]} />
            {/* Bottom-left Corner Accent */}
            <View style={[styles.cornerBottomLeft, { borderColor }]} />
            {/* Bottom-right Corner Accent */}
            <View style={[styles.cornerBottomRight, { borderColor }]} />

            {/* Label Chip */}
            <View style={[styles.labelTag, { backgroundColor: badgeBg }]}>
              <Text style={styles.labelText}>
                {box.label.toUpperCase()} {Math.round(box.confidence * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 51, 45, 0.08)',
  },
  labelTag: {
    position: 'absolute',
    top: -24,
    left: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: {
    fontFamily: font.monoBold,
    fontSize: 11,
    color: palette.chalk,
    letterSpacing: 0.5,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
});
