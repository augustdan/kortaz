'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Package, Plus } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function InventoryPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Finalizadores');
  const [costPrice, setCostPrice] = useState(20);
  const [salePrice, setSalePrice] = useState(50);
  const [stockQty, setStockQty] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!data) return null;

  const branchId = selectedBranchId === 'all' ? data.branches[0]?.id : selectedBranchId;
  const visibleProducts = data.products.filter(
    (p) => selectedBranchId === 'all' || p.branch_id === selectedBranchId
  );

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data!.tenant.id,
        branchId,
        name,
        category,
        usageType: 'both',
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        stockQuantity: Number(stockQty),
        minStockLevel: Number(minStock),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error);
      return;
    }
    setName('');
    setFeedback('Produto cadastrado no estoque.');
    await refresh();
  }

  async function handleMovement(productId: string, movementType: 'in' | 'out') {
    setFeedback(null);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'movement',
        tenantId: data!.tenant.id,
        branchId,
        productId,
        movementType,
        quantity: 1,
        reason: movementType === 'in' ? 'Reposição manual' : 'Saída / Uso interno',
      }),
    });
    const json = await res.json();
    if (!res.ok) setFeedback(json.error);
    await refresh();
  }

  return (
    <PermissionGuard resource="inventory">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Gestão de Estoque</h1>
          <p className="text-xs text-[#B59E8D]">
            Controle por unidade, fornecedores, consumo automático por serviço e alertas de reposição.
          </p>
        </div>

        <form
          onSubmit={handleAddProduct}
          className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-6 text-xs items-end"
        >
          <div>
            <label className="mb-1 block text-[#B59E8D]">Produto</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cera Efeito Brilho"
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Venda (R$)</label>
            <input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="mb-1 block text-[#B59E8D]">Qtd</label>
              <input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Mín.</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar</span>
          </button>
        </form>

        {feedback && <p className="text-xs text-[#D49B6A]">{feedback}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          {visibleProducts.map((prod) => {
            const lowStock = prod.stock_quantity <= prod.min_stock_level;
            return (
              <div
                key={prod.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  lowStock
                    ? 'border-[#E06258]/50 bg-[#E06258]/5'
                    : 'border-white/10 bg-[#18100C]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D49B6A]">
                      {prod.category}
                    </span>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#F7EFE6]">
                      <Package className="h-4 w-4 text-[#D49B6A]" />
                      {prod.name}
                    </h3>
                  </div>
                  {lowStock && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#E06258]/20 px-2 py-0.5 text-[10px] font-bold text-[#E06258]">
                      <AlertTriangle className="h-3 w-3" /> Repor
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 rounded bg-[#0E0906] p-2.5 text-xs">
                  <div>
                    <span className="block text-[10px] text-[#B59E8D]">Saldo</span>
                    <strong className={lowStock ? 'text-[#E06258]' : 'text-[#45C486]'}>
                      {prod.stock_quantity} un
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#B59E8D]">Mínimo</span>
                    <strong>{prod.min_stock_level} un</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#B59E8D]">Venda</span>
                    <strong className="text-[#D49B6A]">
                      {prod.sale_price > 0 ? formatCurrencyBRL(prod.sale_price) : 'Uso interno'}
                    </strong>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleMovement(prod.id, 'in')}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#45C486]/40 py-1.5 text-[#45C486]"
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" /> +1 Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMovement(prod.id, 'out')}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 py-1.5 text-[#B59E8D]"
                  >
                    <ArrowDownCircle className="h-3.5 w-3.5" /> -1 Saída
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Histórico de Movimentações */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="text-sm font-semibold">Histórico de Movimentações</h2>
          <div className="mt-3 space-y-2 text-xs">
            {data.inventoryMovements.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded border border-white/5 bg-[#0E0906] px-3 py-2"
              >
                <span>
                  <strong className="text-[#D49B6A]">{m.movement_type.toUpperCase()}</strong> ({m.quantity}{' '}
                  un) &mdash;{' '}
                  {data.products.find((p) => p.id === m.product_id)?.name || m.product_id}:{' '}
                  <span className="text-[#B59E8D]">{m.reason}</span>
                </span>
                <span className="text-[#B59E8D]">{formatDateTimeBR(m.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
