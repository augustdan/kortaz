import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LayoutDashboard } from 'lucide-react-native';
import { ClientBookingScreen } from './src/screens/ClientBookingScreen';
import { BarberConsoleScreen } from './src/screens/BarberConsoleScreen';
import { COLORS } from './src/theme';

export default function App() {
  const [tab, setTab] = useState<'client' | 'barber'>('client');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor={COLORS.bg} />

        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoK}>K</Text>
            </View>
            <Text style={styles.brandName}>
              KOR<Text style={{ color: COLORS.bronze }}>TAZ</Text>
            </Text>
          </View>
          <Text style={styles.modeTag}>
            {tab === 'client' ? 'Modo Cliente' : 'Modo Barbeiro'}
          </Text>
        </View>

        {/* Active Screen */}
        <View style={styles.body}>
          {tab === 'client' ? <ClientBookingScreen /> : <BarberConsoleScreen />}
        </View>

        {/* Bottom Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, tab === 'client' && styles.tabItemActive]}
            onPress={() => setTab('client')}
          >
            <Calendar color={tab === 'client' ? COLORS.bronze : COLORS.muted} size={18} />
            <Text style={[styles.tabText, tab === 'client' && styles.tabTextActive]}>
              Agendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, tab === 'barber' && styles.tabItemActive]}
            onPress={() => setTab('barber')}
          >
            <LayoutDashboard color={tab === 'barber' ? COLORS.bronze : COLORS.muted} size={18} />
            <Text style={[styles.tabText, tab === 'barber' && styles.tabTextActive]}>
              Painel
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.sidebar,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    height: 32,
    width: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoK: { fontSize: 16, fontWeight: '800', color: COLORS.bronze },
  brandName: { fontSize: 16, fontWeight: '800', letterSpacing: 2, color: COLORS.text },
  modeTag: { fontSize: 11, fontWeight: '600', color: COLORS.muted },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.sidebar,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabItemActive: { backgroundColor: COLORS.cardElevated },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.bronze, fontWeight: '700' },
});
