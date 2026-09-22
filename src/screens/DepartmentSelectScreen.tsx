import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useDepartments } from '../hooks/useDepartments';
import { Department, DepartmentsSummary } from '@/types';

type Props = {
  onSelectDepartment: (department: Department) => void;
};

// Audit foizi bo'yicha holat rangi va uning ustidagi och fon (meter track'i uchun)
function auditStatus(percent: number) {
  if (percent >= 100) return { fill: '#16a34a', track: '#dcfce7' };
  if (percent >= 50) return { fill: '#d97706', track: '#fef3c7' };
  return { fill: '#dc2626', track: '#fee2e2' };
}

function SummaryCard({
  summary,
  inspectionTitle,
}: {
  summary: DepartmentsSummary;
  inspectionTitle?: string;
}) {
  const status = auditStatus(summary.auditPercent);

  const tiles = [
    { label: 'Foydalanuvchilar', value: summary.totalUsers },
    { label: 'Qurilmalar', value: summary.totalDevices },
    { label: 'Tekshirilgan', value: summary.checkedDevices },
    { label: 'Qolgan', value: summary.remainingDevices },
  ];

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeaderRow}>
        <Text style={styles.summaryTitle}>{inspectionTitle || 'Umumiy audit'}</Text>
        <Text style={[styles.summaryPercent, { color: status.fill }]}>
          {summary.auditPercent}%
        </Text>
      </View>

      <View style={[styles.meterTrack, { backgroundColor: status.track }]}>
        <View
          style={[
            styles.meterFill,
            { width: `${Math.min(100, summary.auditPercent)}%`, backgroundColor: status.fill },
          ]}
        />
      </View>

      <View style={styles.tileRow}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DepartmentSelectScreen({ onSelectDepartment }: Props) {
  const { data, isLoading, isError, refetch, isRefetching } = useDepartments();
  const [searchInput, setSearchInput] = useState('');

  const departments = data?.data ?? [];

  const filteredDepartments = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(query));
  }, [departments, searchInput]);

  const renderItem = ({ item }: { item: Department }) => (
    <TouchableOpacity style={styles.row} onPress={() => onSelectDepartment(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.[0]}</Text>
      </View>
      <Text style={styles.name}>{item.name}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{item.userCount}</Text>
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <>
      {data?.summary ? (
        <SummaryCard summary={data.summary} inspectionTitle={data.activeInspection?.title} />
      ) : null}

      <TextInput
        style={styles.searchInput}
        placeholder="Bo'limni qidirish..."
        value={searchInput}
        onChangeText={setSearchInput}
        autoCorrect={false}
      />
    </>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" />
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Xatolik yuz berdi</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={{ color: '#fff' }}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDepartments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Bo'limlar topilmadi</Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  inspectionBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  inspectionText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#52514e' },
  summaryPercent: { fontSize: 24, fontWeight: '700' },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: { alignItems: 'center', flex: 1 },
  tileValue: { fontSize: 18, fontWeight: '700', color: '#201f26' },
  tileLabel: { fontSize: 11, color: '#898781', marginTop: 2, textAlign: 'center' },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f1f4',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '600' },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f1f4',
    alignItems: 'center',
  },
  countText: { fontSize: 13, fontWeight: '600', color: '#4f46e5' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#888' },
  centerBox: { alignItems: 'center', marginTop: 32 },
  errorText: { color: 'red', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
