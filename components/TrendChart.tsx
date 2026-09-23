import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { palette, font, type, spacing } from '@/lib/theme';
import { useTheme } from './ui';

export interface DataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: (DataPoint | number)[];
  labels?: string[];
  height?: number;
  color?: string;
  strokeColor?: string;
  fillColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  unit?: string;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  chartType?: 'area' | 'bar' | 'line';
}

export function TrendChart({
  data,
  labels,
  height = 140,
  color,
  strokeColor,
  fillColor,
  gradientFrom,
  gradientTo = 'transparent',
  unit = '',
  title,
  subtitle,
  style,
  chartType = 'area',
}: TrendChartProps) {
  const { colors, mode } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 72; // Account for card padding
  const activeColor = strokeColor ?? color ?? palette.sageDeep;
  const activeGradFrom = fillColor ?? gradientFrom ?? activeColor;

  // Normalize data into DataPoint[]
  const normalizedData: DataPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item, index) => {
      if (typeof item === 'number') {
        return {
          label: labels && labels[index] ? labels[index] : String(index + 1),
          value: item,
        };
      }
      return item;
    });
  }, [data, labels]);

  const { points, minVal, maxVal, pathD, areaD, barWidth } = useMemo(() => {
    if (normalizedData.length === 0) {
      return { points: [], minVal: 0, maxVal: 1, pathD: '', areaD: '', barWidth: 10 };
    }

    const values = normalizedData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max === min ? 1 : max - min;
    const paddingY = 16;
    const availableH = height - paddingY * 2;
    const stepX = (chartWidth - 24) / Math.max(1, normalizedData.length - 1);

    const calculatedPoints = normalizedData.map((d, index) => {
      const x = 12 + index * stepX;
      const normalizedY = (d.value - min) / range;
      const y = height - paddingY - normalizedY * availableH;
      return { x, y, value: d.value, label: d.label };
    });

    if (calculatedPoints.length < 2) {
      return {
        points: calculatedPoints,
        minVal: min,
        maxVal: max,
        pathD: '',
        areaD: '',
        barWidth: 20,
      };
    }

    // Build curved SVG path
    let p = `M ${calculatedPoints[0].x} ${calculatedPoints[0].y}`;
    for (let i = 0; i < calculatedPoints.length - 1; i++) {
      const p0 = calculatedPoints[i];
      const p1 = calculatedPoints[i + 1];
      const cx = (p0.x + p1.x) / 2;
      p += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const first = calculatedPoints[0];
    const last = calculatedPoints[calculatedPoints.length - 1];
    const a = `${p} L ${last.x} ${height} L ${first.x} ${height} Z`;

    const bWidth = Math.max(12, (chartWidth / normalizedData.length) * 0.5);

    return {
      points: calculatedPoints,
      minVal: min,
      maxVal: max,
      pathD: p,
      areaD: a,
      barWidth: bWidth,
    };
  }, [normalizedData, height, chartWidth]);

  if (normalizedData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }, style]}>
        <Text style={[type.bodySm, { color: colors.subText }]}>No data points yet</Text>
      </View>
    );
  }

  const isDark = mode === 'dark';
  const baselineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`${title ?? 'Trend chart'}: ranging from ${minVal.toFixed(1)}${unit} to ${maxVal.toFixed(1)}${unit}`}
    >
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={[type.h3, { color: colors.text }]}>{title}</Text>}
          {subtitle && <Text style={[type.bodySm, { color: colors.subText }]}>{subtitle}</Text>}
        </View>
      )}

      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={activeGradFrom} stopOpacity={isDark ? '0.35' : '0.25'} />
            <Stop offset="1" stopColor={gradientTo} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        <Line x1="0" y1={height - 16} x2={chartWidth} y2={height - 16} stroke={baselineColor} strokeWidth={1} />
        <Line x1="0" y1={height / 2} x2={chartWidth} y2={height / 2} stroke={baselineColor} strokeWidth={1} strokeDasharray="4 4" />

        {(chartType === 'area' || chartType === 'line') && pathD ? (
          <>
            {/* Area fill */}
            <Path d={areaD} fill="url(#chartGradient)" />
            {/* Line stroke */}
            <Path d={pathD} fill="none" stroke={activeColor} strokeWidth={2.5} strokeLinecap="round" />
            {/* Data points */}
            {points.map((pt, idx) => (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={idx === points.length - 1 ? 4.5 : 3}
                fill={idx === points.length - 1 ? activeColor : colors.surface}
                stroke={activeColor}
                strokeWidth={2}
              />
            ))}
          </>
        ) : (
          /* Bar representation */
          points.map((pt, idx) => {
            const barH = height - 16 - pt.y;
            return (
              <React.Fragment key={idx}>
                <Path
                  d={`M ${pt.x - barWidth / 2} ${height - 16} L ${pt.x - barWidth / 2} ${pt.y} Q ${pt.x - barWidth / 2} ${pt.y - 4} ${pt.x} ${pt.y - 4} Q ${pt.x + barWidth / 2} ${pt.y - 4} ${pt.x + barWidth / 2} ${pt.y} L ${pt.x + barWidth / 2} ${height - 16} Z`}
                  fill={activeColor}
                />
                <Line
                  x1={pt.x}
                  y1={height - 16}
                  x2={pt.x}
                  y2={pt.y}
                  stroke={activeColor}
                  strokeWidth={barWidth}
                  strokeLinecap="round"
                />
              </React.Fragment>
            );
          })
        )}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.labelsRow}>
        {normalizedData.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.axisLabel,
              {
                color: i === normalizedData.length - 1 ? activeColor : colors.subText,
                fontFamily: i === normalizedData.length - 1 ? font.sansBold : font.sans,
              },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[2],
  },
  header: {
    marginBottom: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 10,
  },
});
