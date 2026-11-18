import React, { useEffect, useMemo, useState } from 'react';
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
import { Calendar, CheckCircle2, Clock, Scissors, User } from 'lucide-react-native';
import {
  createPublicAppointment,
  fetchAvailability,
  fetchShowcase,
  type AvailabilitySlot,
  type ShowcasePayload,
} from '../api/client';
import { COLORS, formatBRL } from '../theme';

function buildNextDays(count = 7): { dateStr: string; label: string; day: string }[] {
  const result: { dateStr: string; label: string; day: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    result.push({ dateStr: `${y}-${m}-${day}`, label: weekday.toUpperCase(), day });
  }
  return result;
}

export function ClientBookingScreen() {
  const [slug, setSlug] = useState('barbearia-exclusiva');
  const [showcase, setShowcase] = useState<ShowcasePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [audience, setAudience] = useState<'all' | 'male' | 'female'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const days = useMemo(() => buildNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(days[0].dateStr);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  async function loadShowcase(targetSlug: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShowcase(targetSlug.trim() || 'barbearia-exclusiva');
      setShowcase(data);
      if (data.services[0]) {
        setSelectedServiceId(data.services[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estabelecimento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShowcase(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branchId = showcase?.branches[0]?.id || '';

  const filteredServices = useMemo(() => {
    if (!showcase) return [];
    return showcase.services.filter((s) => {
      if (audience === 'male') return s.audience === 'male' || s.audience === 'unisex' || !s.audience;
      if (audience === 'female') return s.audience === 'female' || s.audience === 'unisex';
      return true;
    });
  }, [showcase, audience]);

  const filteredBarbers = useMemo(() => {
    if (!showcase) return [];
    return showcase.barbers.filter((b) => {
      if (audience === 'male') return b.audience_focus !== 'female';
      if (audience === 'female') return b.audience_focus === 'female' || b.audience_focus === 'unisex';
      return true;
    });
  }, [showcase, audience]);

  useEffect(() => {
    if (!showcase || !branchId || !selectedServiceId) return;
    let active = true;
    setLoadingSlots(true);
    setSelectedSlot(null);

    fetchAvailability({
      slug: showcase.tenant.slug,
      branchId,
      date: selectedDate,
      barberId: selectedBarberId,
      serviceIds: [selectedServiceId],
    })
      .then((res) => {
        if (active) setSlots(res.slots.filter((s) => s.available));
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [showcase, branchId, selectedDate, selectedBarberId, selectedServiceId]);

  async function handleConfirm() {
    if (!showcase || !branchId || !selectedServiceId || !selectedSlot) {
      Alert.alert('Selecione um horário', 'Escolha o serviço, a data e o horário disponível.');
      return;
    }
    if (customerName.trim().length < 2 || customerPhone.trim().length < 8) {
      Alert.alert('Seus dados', 'Informe seu nome e WhatsApp para confirmar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPublicAppointment({
        tenantId: showcase.tenant.id,
        branchId,
        barberId: selectedSlot.barberId,
        serviceIds: [selectedServiceId],
        startsAt: selectedSlot.startsAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });
      setConfirmedId(res.appointment.id);
    } catch (err) {
      Alert.alert('Não foi possível agendar', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={COLORS.bronze} size="large" />
        <Text style={styles.mutedText}>Carregando vitrine Kortaz...</Text>
      </View>
    );
  }

  if (error || !showcase) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || 'Estabelecimento não encontrado.'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => loadShowcase(slug)}>
          <Text style={styles.primaryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (confirmedId) {
    return (
      <View style={styles.centerBox}>
        <CheckCircle2 color={COLORS.success} size={48} />
        <Text style={styles.confirmTitle}>Horário Confirmado!</Text>
        <Text style={styles.confirmSub}>
          {showcase.tenant.name} · {selectedDate} às {selectedSlot?.time}
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 20 }]}
          onPress={() => {
            setConfirmedId(null);
            setSelectedSlot(null);
          }}
        >
          <Text style={styles.primaryBtnText}>Fazer novo agendamento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Estabelecimento */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>AGENDAMENTO ONLINE</Text>
        <Text style={styles.title}>{showcase.tenant.name}</Text>
        {showcase.branches[0]?.address && (
          <Text style={styles.mutedText}>{showcase.branches[0].address}</Text>
        )}
        <View style={styles.slugRow}>
          <TextInput
            value={slug}
            onChangeText={setSlug}
            placeholder="slug-da-barbearia"
            placeholderTextColor={COLORS.muted}
            style={styles.slugInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadShowcase(slug)}>
            <Text style={styles.secondaryBtnText}>Abrir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtro Masculino / Feminino */}
      <View style={styles.pillRow}>
        {(['all', 'male', 'female'] as const).map((item) => {
          const active = audience === item;
          const label = item === 'all' ? 'Todos' : item === 'male' ? 'Barbearia' : 'Salão';
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setAudience(item)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Serviços */}
      <View style={styles.sectionHeader}>
        <Scissors color={COLORS.bronze} size={16} />
        <Text style={styles.sectionTitle}>1. Escolha o serviço</Text>
      </View>
      <View style={styles.listGap}>
        {filteredServices.map((srv) => {
          const active = srv.id === selectedServiceId;
          return (
            <TouchableOpacity
              key={srv.id}
              onPress={() => setSelectedServiceId(srv.id)}
              style={[styles.selectCard, active && styles.selectCardActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{srv.name}</Text>
                <Text style={styles.itemSub}>{srv.duration_minutes} min</Text>
              </View>
              <Text style={styles.priceText}>{formatBRL(srv.price)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Profissionais */}
      <View style={styles.sectionHeader}>
        <User color={COLORS.bronze} size={16} />
        <Text style={styles.sectionTitle}>2. Profissional</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
        <TouchableOpacity
          onPress={() => setSelectedBarberId(null)}
          style={[styles.barberChip, selectedBarberId === null && styles.pillActive]}
        >
          <Text style={[styles.pillText, selectedBarberId === null && styles.pillTextActive]}>
            Qualquer livre
          </Text>
        </TouchableOpacity>
        {filteredBarbers.map((barber) => {
          const active = selectedBarberId === barber.id;
          return (
            <TouchableOpacity
              key={barber.id}
              onPress={() => setSelectedBarberId(barber.id)}
              style={[styles.barberChip, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{barber.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Data e Horários */}
      <View style={styles.sectionHeader}>
        <Calendar color={COLORS.bronze} size={16} />
        <Text style={styles.sectionTitle}>3. Data e horário</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
        {days.map((d) => {
          const active = selectedDate === d.dateStr;
          return (
            <TouchableOpacity
              key={d.dateStr}
              onPress={() => setSelectedDate(d.dateStr)}
              style={[styles.dayCard, active && styles.pillActive]}
            >
              <Text style={[styles.dayLabel, active && styles.pillTextActive]}>{d.label}</Text>
              <Text style={[styles.dayNum, active && styles.pillTextActive]}>{d.day}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loadingSlots ? (
        <ActivityIndicator color={COLORS.bronze} style={{ marginVertical: 16 }} />
      ) : slots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.mutedText}>Nenhum horário disponível nesta data.</Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {slots.slice(0, 16).map((slot) => {
            const active =
              selectedSlot?.startsAt === slot.startsAt && selectedSlot?.barberId === slot.barberId;
            return (
              <TouchableOpacity
                key={`${slot.barberId}-${slot.startsAt}`}
                onPress={() => setSelectedSlot(slot)}
                style={[styles.slotChip, active && styles.pillActive]}
              >
                <Clock color={active ? COLORS.bg : COLORS.bronze} size={12} />
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{slot.time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Dados do cliente */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>4. Seus dados</Text>
      </View>
      <View style={styles.card}>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Seu nome completo"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
        />
        <TextInput
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="WhatsApp com DDD"
          placeholderTextColor={COLORS.muted}
          keyboardType="phone-pad"
          style={[styles.input, { marginTop: 10 }]}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 14, opacity: submitting ? 0.6 : 1 }]}
          disabled={submitting}
          onPress={handleConfirm}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  centerBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: COLORS.bronze },
  title: { marginTop: 4, fontSize: 22, fontWeight: '800', color: COLORS.text },
  mutedText: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  errorText: { fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  confirmSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  slugRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  slugInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 12,
  },
  secondaryBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardElevated,
    justifyContent: 'center',
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: COLORS.bronze, borderColor: COLORS.bronze },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  pillTextActive: { color: COLORS.bg, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  listGap: { gap: 8 },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  selectCardActive: { borderColor: COLORS.bronze, backgroundColor: COLORS.cardElevated },
  itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  priceText: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  horizontalRow: { flexDirection: 'row' },
  barberChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  dayCard: {
    marginRight: 8,
    width: 56,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  dayLabel: { fontSize: 10, fontWeight: '600', color: COLORS.muted },
  dayNum: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
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
    paddingHorizontal: 18,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.bg },
});
