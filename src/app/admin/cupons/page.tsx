'use client';

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminShell';

export default function AdminCouponsPage() {
  const { data, refresh } = useAdminData();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('Desconto promocional Kortaz');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(20);

  if (!data) return null;

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_saas_coupon',
        code,
        description,
        discountType,
        discountValue: Number(discountValue),
      }),
    });
    if (res.ok) {
      setCode('');
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Cupons da Plataforma SaaS</h1>

      <form
        onSubmit={handleCreateCoupon}
        className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-5 text-xs items-end"
      >
        <div>
          <label className="mb-1 block text-[#B59E8D]">Código</label>
          <input
            type="text"
            required
            placeholder="EX: BEMVINDO30"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2 uppercase"
          />
        </div>
        <div>
          <label className="mb-1 block text-[#B59E8D]">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-[#B59E8D]">Tipo</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2"
          >
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[#B59E8D]">Desconto</label>
          <input
            type="number"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
        >
          <Tag className="h-3.5 w-3.5" /> Criar Cupom SaaS
        </button>
      </form>

      <div className="space-y-2 text-xs">
        {data.saasCoupons.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#18100C] p-4"
          >
            <div>
              <strong className="text-sm text-[#D49B6A]">{c.code}</strong>
              <p className="text-[#B59E8D]">{c.description}</p>
            </div>
            <span>
              {c.discount_type === 'percentage'
                ? `${c.discount_value}% OFF`
                : `R$ ${c.discount_value.toFixed(2)} OFF`}{' '}
              ({c.used_count} uso(s))
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
