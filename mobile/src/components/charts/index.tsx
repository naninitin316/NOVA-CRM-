import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { colors, borderRadius, typography } from '../theme';
import { Card } from './ui';

interface BarChartProps {
  data: { label: string; processed: number; rejected: number; onHold: number }[];
  title: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 80, 600);
  const chartHeight = 200;
  const barWidth = Math.min(40, (chartWidth - 60) / data.length - 10);
  const maxValue = Math.max(...data.map((d) => d.processed + d.rejected + d.onHold), 1);

  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Svg width={chartWidth} height={chartHeight + 30}>
        {data.map((item, i) => {
          const x = 50 + i * (barWidth + 15);
          const total = item.processed + item.rejected + item.onHold;
          const h = (total / maxValue) * chartHeight;
          const pH = total > 0 ? (item.processed / total) * h : 0;
          const rH = total > 0 ? (item.rejected / total) * h : 0;
          const oH = total > 0 ? (item.onHold / total) * h : 0;

          return (
            <G key={i}>
              <Rect x={x} y={chartHeight - pH} width={barWidth} height={pH} fill={colors.success} rx={4} />
              <Rect x={x} y={chartHeight - pH - rH} width={barWidth} height={rH} fill={colors.error} rx={4} />
              <Rect x={x} y={chartHeight - h} width={barWidth} height={oH} fill={colors.warning} rx={4} />
              <SvgText x={x + barWidth / 2} y={chartHeight + 18} fill={colors.textMuted} fontSize={10} textAnchor="middle">
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <LegendItem color={colors.success} label="Processed" />
        <LegendItem color={colors.error} label="Rejected" />
        <LegendItem color={colors.warning} label="On Hold" />
      </View>
    </Card>
  );
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, title }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 160;
  const center = size / 2;
  const radius = 60;
  const innerRadius = 40;

  let cumulativeAngle = -90;
  const segments = data.map((item) => {
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...item, startAngle, angle };
  });

  const polarToCartesian = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const start = polarToCartesian(startAngle, outerR);
    const end = polarToCartesian(endAngle, outerR);
    const innerStart = polarToCartesian(endAngle, innerR);
    const innerEnd = polarToCartesian(startAngle, innerR);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${end.x} ${end.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y} Z`;
  };

  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.donutContainer}>
        <Svg width={size} height={size}>
          {segments.map((seg, i) =>
            seg.angle > 0 ? (
              <Path
                key={i}
                d={describeArc(seg.startAngle, seg.startAngle + seg.angle, radius, innerRadius)}
                fill={seg.color}
              />
            ) : null
          )}
          <SvgText x={center} y={center - 6} fill={colors.text} fontSize={24} fontWeight="bold" textAnchor="middle">
            {total}
          </SvgText>
          <SvgText x={center} y={center + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Total
          </SvgText>
        </Svg>
        <View style={styles.donutLegend}>
          {data.map((item, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
};

interface HorizontalBarProps {
  data: { label: string; value: number; percentage: number }[];
  title: string;
  color?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarProps> = ({ data, title, color = colors.primary }) => (
  <Card style={styles.chartCard}>
    <Text style={styles.chartTitle}>{title}</Text>
    {data.map((item, i) => (
      <View key={i} style={styles.hBarRow}>
        <Text style={styles.hBarLabel} numberOfLines={1}>{item.label}</Text>
        <View style={styles.hBarTrack}>
          <View style={[styles.hBarFill, { width: `${item.percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.hBarValue}>{item.percentage}%</Text>
      </View>
    ))}
  </Card>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  chartCard: { marginBottom: 16 },
  chartTitle: { ...typography.h4, color: colors.text, marginBottom: 16 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...typography.caption, color: colors.textSecondary },
  legendValue: { ...typography.caption, color: colors.text, fontWeight: '600' },
  donutContainer: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  donutLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  hBarLabel: { width: 80, ...typography.caption, color: colors.textSecondary },
  hBarTrack: { flex: 1, height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  hBarFill: { height: '100%', borderRadius: 4 },
  hBarValue: { width: 40, ...typography.caption, color: colors.text, textAlign: 'right' },
});
