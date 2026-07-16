import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { StatCard, LoadingScreen } from '../components/ui';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/charts';
import { useAnalytics } from '../hooks/useApi';

export const ProgressScreen: React.FC = () => {
  const { data: analytics, isLoading } = useAnalytics();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (isLoading) return <LoadingScreen />;

  const overview = analytics?.overview;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageDescription}>
        Track team performance, task distribution, and completion metrics
      </Text>

      {/* Overview stats */}
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        <StatCard
          title="Total Tasks"
          value={overview?.total || 0}
          color={colors.primary}
          icon={<Ionicons name="layers" size={20} color={colors.primary} />}
        />
        <StatCard
          title="Processed"
          value={overview?.processed || 0}
          subtitle={`${overview?.completionPercentage || 0}% completion`}
          color={colors.success}
          icon={<Ionicons name="checkmark-circle" size={20} color={colors.success} />}
        />
        <StatCard
          title="Rejected"
          value={overview?.rejected || 0}
          color={colors.error}
          icon={<Ionicons name="close-circle" size={20} color={colors.error} />}
        />
        <StatCard
          title="On Hold"
          value={overview?.onHold || 0}
          color={colors.warning}
          icon={<Ionicons name="pause-circle" size={20} color={colors.warning} />}
        />
      </View>

      {/* Charts */}
      <View style={[styles.chartsGrid, isMobile && styles.chartsGridMobile]}>
        <View style={styles.chartCol}>
          <BarChart
            title="Monthly Performance"
            data={(analytics?.monthlyPerformance || []).map((m) => ({
              label: m.month,
              processed: m.processed,
              rejected: m.rejected,
              onHold: m.onHold,
            }))}
          />
        </View>
        <View style={styles.chartCol}>
          <DonutChart
            title="Task Distribution"
            data={(analytics?.statusDistribution || []).map((s) => ({
              label: s.status.replace('_', ' '),
              value: s.count,
              color: s.color,
            }))}
          />
        </View>
      </View>

      <View style={[styles.chartsGrid, isMobile && styles.chartsGridMobile]}>
        <View style={styles.chartCol}>
          <DonutChart
            title="Status Analytics"
            data={(analytics?.priorityDistribution || []).map((p, i) => ({
              label: p.priority,
              value: p.count,
              color: [colors.textMuted, colors.info, colors.warning, colors.error][i],
            }))}
          />
        </View>
        <View style={styles.chartCol}>
          <HorizontalBarChart
            title="Department Performance"
            data={(analytics?.departmentPerformance || []).map((d) => ({
              label: d.department,
              value: d.processed,
              percentage: d.percentage,
            }))}
            color={colors.secondary}
          />
        </View>
      </View>

      {/* Team performance */}
      {(analytics?.teamPerformance || []).length > 0 && (
        <HorizontalBarChart
          title="Team Performance"
          data={(analytics?.teamPerformance || []).map((m) => ({
            label: m.name,
            value: m.processed,
            percentage: m.percentage,
          }))}
          color={colors.accent}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  pageDescription: { ...typography.body, color: colors.textSecondary, marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statsGridMobile: { flexDirection: 'column' },
  chartsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  chartsGridMobile: { flexDirection: 'column' },
  chartCol: { flex: 1 },
});
