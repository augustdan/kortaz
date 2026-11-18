'use client';

import { useState } from 'react';
import { Plus, Scissors, TrendingUp } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL } from '@/lib/utils';

export default function ServicesPage() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Barbearia');
  const [audience, setAudience] = useState<'male' | 'female' | 'unisex'>('unisex');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [price, setPrice] = useState(80);
  const [costEstimate, setCostEstimate] = useState(12);

  if (!data) return null;

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'service',
        tenantId: data!.tenant.id,
        name,
        category,
        audience,
        durationMinutes: Number(durationMinutes),
        bufferMinutes: Number(bufferMinutes),
        price: Number(price),
        costEstimate: Number(costEstimate),
        description: `${name} com finalização profissional.`,
        isFeatured: true,
      }),
    });
    if (res.ok) {
      setName('');
      await refresh();
    }
  }

  return (
    <PermissionGuard resource="services">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Catálogo de Serviços (Masculino &amp; Feminino)
          </h1>
          <p className="text-xs text-[#A5A09A]">
            Configure serviços de barbearia, corte feminino, colorimetria, escova e análise de margem.
          </p>
        </div>

        <form
          onSubmit={handleCreateService}
          className="hud-panel grid items-end gap-3 rounded-2xl p-4 text-xs sm:grid-cols-6"
        >
          <div>
            <label className="mb-1 block text-[#A5A09A]">Nome do Serviço</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Escova & Hidratação"
              className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#A5A09A]">Público</label>
            <select
              value={audience}
              onChange={(e) => {
                const v = e.target.value as 'male' | 'female' | 'unisex';
                setAudience(v);
                setCategory(v === 'female' ? 'Salão Feminino' : v === 'male' ? 'Barbearia' : 'Acabamento');
              }}
              className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2"
            >
              <option value="male">Barbearia Masculina</option>
              <option value="female">Salão / Cabeleireira</option>
              <option value="unisex">Unissex</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[#A5A09A]">Duração (min)</label>
            <input
              type="number"
              min={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#A5A09A]">Intervalo (min)</label>
            <input
              type="number"
              min={0}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#A5A09A]">Preço / Custo (R$)</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="rounded-xl border border-[#292521] bg-[#090909] px-2 py-2"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={costEstimate}
                onChange={(e) => setCostEstimate(Number(e.target.value))}
                className="rounded-xl border border-[#292521] bg-[#090909] px-2 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#D99A4E] py-2.5 font-bold text-[#090909]"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar</span>
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.services.map((svc) => {
            const prof = data.intelligence.serviceProfitability.find(
              (p) => p.serviceId === svc.id
            );
            return (
              <div key={svc.id} className="hud-panel space-y-3 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D99A4E]">
                        {svc.category}
                      </span>
                      <span className="rounded-full bg-[#090909] px-2 py-0.5 text-[9px] uppercase text-[#A5A09A]">
                        {svc.audience === 'female'
                          ? 'Feminino'
                          : svc.audience === 'male'
                            ? 'Masculino'
                            : 'Unissex'}
                      </span>
                    </div>
                    <h3 className="mt-1 flex items-center gap-2 text-base font-bold text-[#F5F1EB]">
                      <Scissors className="h-4 w-4 text-[#D99A4E]" />
                      {svc.name}
                    </h3>
                  </div>
                  <span className="text-lg font-bold text-[#D99A4E]">
                    {formatCurrencyBRL(svc.price)}
                  </span>
                </div>

                <p className="text-xs text-[#A5A09A]">{svc.description}</p>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#090909] p-2.5 text-[11px]">
                  <div>
                    <span className="block text-[#A5A09A]">Duração</span>
                    <strong>
                      {svc.duration_minutes}m (+{svc.buffer_minutes}m)
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[#A5A09A]">Margem</span>
                    <strong className="text-[#16C784]">{prof?.marginPercent ?? 80}%</strong>
                  </div>
                  <div>
                    <span className="block text-[#A5A09A]">Agendados</span>
                    <strong>{prof?.bookingsCount ?? 0}</strong>
                  </div>
                </div>

                {prof && (
                  <div className="flex items-start gap-2 text-[11px] text-[#A5A09A]">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D99A4E]" />
                    <span>{prof.suggestion}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PermissionGuard>
  );
}
