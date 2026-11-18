import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Award, Clock, XCircle } from 'lucide-react-native';
import {
  cancelCustomerAppointment,
  fetchCustomerPortal,
  type CustomerPortalPayload,
} from '../api/client';
import { COLORS, formatBRL } from '../theme';

export function ClientPortalScreen() {
  const [slug, setSlug] = useState('barbearia-exclusiva');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<CustomerPortalPayload | null>(null);

  async function handleSearch() {
    if (phone.replace(/\D/g, '').length < 8) {
      Alert.alert('WhatsApp', 'Informe seu número com DDD.');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCustomerPortal(slug.trim() || 'barbearia-exclusiva', phone.trim());
      setPortal(data);
    } catch (err) {
      Alert.alert('Não encontrado', err instanceof Error ? err.message : 'Verifique os dados.');
      setPortal(null);
    } finally {
      setLoading(false);
    }
  }

  function confirmCancel(appointmentId: string) {
    if (!portal) return;
    Alert.alert('Cancelar horário?', 'O horário ficará disponível novamente na agenda.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelCustomerAppointment(portal.tenant.slug, phone.trim(), appointmentId);
            await handleSearch();
          } catch (err) {
            Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível cancelar.');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ÁREA DO CLIENTE</Text>
        <Text style={styles.title}>Meus Horários &amp; Fidelidade</Text>
        <Text style={styles.mutedText}>
          Consulte seus agendamentos e pontos informando seu WhatsApp.
        </Text>

        <TextInput
          value={slug}
          onChangeText={setSlug}
          placeholder="slug-da-barbearia"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="none"
          style={[styles.input, { marginTop: 14 }]}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Seu WhatsApp com DDD"
          placeholderTextColor={COLORS.muted}
          keyboardType="phone-pad"
          style={[styles.input, { marginTop: 10 }]}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 12 }]}
          disabled={loading}
          onPress={handleSearch}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.primaryBtnText}>Consultar</Text>
          )}
        </TouchableOpacity>
      </View>

      {portal && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Award color={COLORS.gold} size={18} />
              <Text style={styles.statVal}>{portal.loyalty.points_balance} pts</Text>
              <Text style={styles.mutedText}>Fidelidade</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{portal.customer.visits_count}</Text>
              <Text style={styles.mutedText}>Visitas</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Agendamentos de {portal.customer.full_name}</Text>

          {portal.appointments.map((appt) => {
            const canCancel = appt.status === 'pending' || appt.status === 'confirmed';
            return (
              <View key={appt.id} style={styles.apptCard}>
                <View style={styles.apptTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.dateRow}>
                      <Clock color={COLORS.bronze} size={13} />
                      <Text style={styles.itemTitle}>
                        {appt.starts_at.slice(0, 10)} · {appt.starts_at.slice(11, 16)}
                      </Text>
                    </View>
                    <Text style={styles.mutedText}>
                      {appt.services.join(' + ')} · {appt.barberName}
                    </Text>
                  </View>
                  <Text style={styles.priceText}>{formatBRL(appt.total_amount)}</Text>
                </View>

                <View style={styles.apptBottom}>
                  <Text style={styles.statusTag}>{appt.status.toUpperCase()}</Text>
                  {canCancel && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => confirmCancel(appt.id)}
                    >
                      <XCircle color={COLORS.danger} size={13} />
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
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
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.gold },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  apptCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  priceText: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  apptBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTag: { fontSize: 10, fontWeight: '700', color: COLORS.bronze },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
});
