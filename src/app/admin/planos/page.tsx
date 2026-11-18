'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminShell';
import type { SubscriptionPlan } from '@/lib/types/domain';

export default function AdminPlansPage() {
  const { data, refresh } = useAdminData();
  const [editing, setEditing] = useState<Record<string, Partial<SubscriptionPlan>>>({});
  const [msg, setMsg] = useState<string | null>(null);

  if (!data) return null;

  async function savePlan(plan: SubscriptionPlan) {
    setMsg(null);
    const patch = editing[plan.id] || {};
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_plan',
        planId: plan.id,
        name: patch.name ?? plan.name,
        priceMonthly:
          patch.price_monthly !== undefined ? Number(patch.price_monthly) : plan.price_monthly,
        maxBarbers:
          patch.max_barbers !== undefined ? patch.max_barbers : plan.max_barbers,
        maxMonthlyAppointments:
          patch.max_monthly_appointments !== undefined
            ? patch.max_monthly_appointments
            : plan.max_monthly_appointments,
        maxBranches:
          patch.max_branches !== undefined ? Number(patch.max_branches) : plan.max_branches,
      }),
    });
    if (res.ok) {
      setMsg(`Plano "${plan.name}" atualizado dinamicamente!`);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Gestor Dinâmico de Planos & Limites</h1>
        <p className="text-xs text-[#A5A09A]">
          Altere preços, tetos de profissionais, agendamentos e unidades sem modificar código.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-[#16C784]/40 bg-[#16C784]/10 p-3 text-xs text-[#16C784]">
          {msg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.plans.map((plan) => {
          const patch = editing[plan.id] || {};
          return (
            <div
              key={plan.id}
              className="rounded-xl border border-[#292521] bg-[#151515] p-5 space-y-3 text-xs"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#D99A4E]">
                {plan.code}
              </p>
              <div>
                <label className="mb-1 block text-[#A5A09A]">Nome do Plano</label>
                <input
                  type="text"
                  defaultValue={plan.name}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], name: e.target.value },
                    }))
                  }
                  className="w-full rounded border border-[#292521] bg-[#090909] px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[#A5A09A]">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={plan.price_monthly}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...prev[plan.id],
                          price_monthly: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded border border-[#292521] bg-[#090909] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[#A5A09A]">Máx. Unidades</label>
                  <input
                    type="number"
                    defaultValue={plan.max_branches}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...prev[plan.id],
                          max_branches: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full rounded border border-[#292521] bg-[#090909] px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[#A5A09A]">Máx. Barbeiros (vazio=∞)</label>
                  <input
                    type="number"
                    defaultValue={plan.max_barbers ?? ''}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...prev[plan.id],
                          max_barbers: e.target.value ? Number(e.target.value) : null,
                        },
                      }))
                    }
                    className="w-full rounded border border-[#292521] bg-[#090909] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[#A5A09A]">Máx. Agend./mês (vazio=∞)</label>
                  <input
                    type="number"
                    defaultValue={plan.max_monthly_appointments ?? ''}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...prev[plan.id],
                          max_monthly_appointments: e.target.value
                            ? Number(e.target.value)
                            : null,
                        },
                      }))
                    }
                    className="w-full rounded border border-[#292521] bg-[#090909] px-3 py-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => savePlan(plan)}
                className="w-full rounded-lg bg-[#D99A4E] py-2 font-bold text-[#090909]"
              >
                Salvar Alterações ({patch.price_monthly ?? plan.price_monthly})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
