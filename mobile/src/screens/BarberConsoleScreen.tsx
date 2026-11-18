import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Check, DollarSign, LogOut, Users } from 'lucide-react-native';
import {
  fetchWorkspaceState,
  loginMobile,
  logoutMobile,
  updateAppointmentStatus,
  type MobileWorkspaceState,
} from '../api/client';
import { COLORS, formatBRL } from '../theme';

export function BarberConsoleScreen() {
  const [workspace, setWorkspace] = useState<MobileWorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  async function loadWorkspace() {
    try {
      const data = await fetchWorkspaceState();
      setWorkspace(data);
    } catch {
      setWorkspace(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Login', 'Informe e-mail e senha.');
      return;
    }
    setLoggingIn(true);
    try {
      await loginMobile(email.trim(), password);
      await loadWorkspace();
    } catch (err) {
      Alert.alert('Falha ao entrar', err instanceof Error ? err.message : 'Verifique seus dados.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleStatus(
    id: string,
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ) {
    try {
      await updateAppointmentStatus(id, status);
      await loadWorkspace();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar.');
    }
  }

  const metrics = useMemo(() => {
    if (!workspace) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAppts = workspace.appointments.filter(
      (a) => a.starts_at.slice(0, 10) === todayStr && a.status !== 'cancelled'
    );
    const revenueCompleted = workspace.appointments
      .filter((a) => a.status === 'completed')
      .reduce((acc, a) => acc + a.total_amount, 0);

    return {
      todayCount: todayAppts.length,
      customersCount: workspace.customers.length,
      revenueCompleted,
      upcoming: [...workspace.appointments]
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
        .slice(0, 12),
    };
  }, [workspace]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={COLORS.bronze} size="large" />
      </View>
    );
  }

  if (!workspace || !metrics) {
    return (
      <View style={styles.container}>
        <View style={styles.loginBox}>
          <Text style={styles.eyebrow}>PAINEL DO ESTABELECIMENTO</Text>
          <Text style={styles.title}>Entrar no Kortaz</Text>
          <Text style={styles.mutedText}>
            Gerencie agendamentos, clientes e faturamento direto do celular.
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { marginTop: 18 }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
            style={[styles.input, { marginTop: 10 }]}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 16, opacity: loggingIn ? 0.6 : 1 }]}
            disabled={loggingIn}
            onPress={handleLogin}
          >
            <Text style={styles.primaryBtnText}>{loggingIn ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getCustomerName = (id: string) =>
    workspace.customers.find((c) => c.id === id)?.full_name || 'Cliente';
  const getBarberName = (id: string) =>
    workspace.barbers.find((b) => b.id === id)?.name || 'Profissional';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={COLORS.bronze}
          onRefresh={() => {
            setRefreshing(true);
            loadWorkspace();
          }}
        />
      }
    >
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{workspace.plan.name.toUpperCase()}</Text>
          <Text style={styles.title}>{workspace.tenant.name}</Text>
          <Text style={styles.mutedText}>Olá, {workspace.session.profile.full_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logoutMobile();
            setWorkspace(null);
          }}
        >
          <LogOut color={COLORS.danger} size={18} />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Calendar color={COLORS.bronze} size={16} />
          <Text style={styles.kpiVal}>{metrics.todayCount}</Text>
          <Text style={styles.kpiLabel}>Hoje</Text>
        </View>
        <View style={styles.kpiCard}>
          <Users color={COLORS.purple} size={16} />
          <Text style={styles.kpiVal}>{metrics.customersCount}</Text>
          <Text style={styles.kpiLabel}>Clientes</Text>
        </View>
        <View style={styles.kpiCard}>
          <DollarSign color={COLORS.success} size={16} />
          <Text style={styles.kpiVal}>{formatBRL(metrics.revenueCompleted)}</Text>
          <Text style={styles.kpiLabel}>Faturado</Text>
        </View>
      </View>

      {/* Lista de Agendamentos */}
      <Text style={styles.sectionTitle}>Últimos Agendamentos</Text>
      {metrics.upcoming.map((appt) => (
        <View key={appt.id} style={styles.apptCard}>
          <View style={styles.apptHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{getCustomerName(appt.customer_id)}</Text>
              <Text style={styles.mutedText}>
                {appt.starts_at.slice(0, 10)} · {appt.starts_at.slice(11, 16)} ·{' '}
                {getBarberName(appt.barber_id)}
              </Text>
            </View>
            <Text style={styles.priceText}>{formatBRL(appt.total_amount)}</Text>
          </View>

          <View style={styles.apptFooter}>
            <Text style={styles.statusTag}>{appt.status.toUpperCase()}</Text>
            {appt.status !== 'completed' && appt.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => handleStatus(appt.id, 'completed')}
              >
                <Check color={COLORS.bg} size={13} />
                <Text style={styles.completeBtnText}>Concluir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  centerBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBox: {
    margin: 16,
    marginTop: 48,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  logoutBtn: {
    height: 40,
    width: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: COLORS.bronze },
  title: { marginTop: 4, fontSize: 20, fontWeight: '800', color: COLORS.text },
  mutedText: { marginTop: 3, fontSize: 12, color: COLORS.muted },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 13,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.bg },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  kpiVal: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  kpiLabel: { fontSize: 11, color: COLORS.muted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  apptCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  apptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  priceText: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  apptFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTag: { fontSize: 10, fontWeight: '700', color: COLORS.bronze },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.bg },
});
