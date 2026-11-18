import Link from 'next/link';
import { Check, X, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { readDb } from '@/lib/server/store';
import { formatCurrencyBRL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const db = await readDb();
  const plans = [...db.subscription_plans]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const featureKeys = Array.from(
    new Set(db.subscription_features.map((f) => f.feature_key))
  ).map((key) => ({
    key,
    label: db.subscription_features.find((f) => f.feature_key === key)?.label || key,
  }));

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F1EB]">
      <header className="border-b border-[#292521]/70 bg-[#090909]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs text-[#A5A09A] hover:text-[#F5F1EB]">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-md bg-[#D99A4E] px-4 py-2 text-xs font-bold text-[#090909]"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D99A4E]">
            PLANOS CONFIGURÁVEIS KORTAZ
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            Preços justos, sem surpresas na fatura
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#A5A09A]">
            Comece grátis e faça upgrade conforme sua equipe cresce. Ao atingir um limite do plano,
            seus dados históricos e clientes nunca são apagados.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const feats = db.subscription_features.filter((f) => f.plan_id === plan.id);
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-2xl border p-6 ${
                  plan.is_popular
                    ? 'border-[#D99A4E] bg-[#1B1B1B]'
                    : 'border-[#292521] bg-[#151515]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    {plan.is_popular && (
                      <span className="rounded bg-[#D99A4E] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#090909]">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[#A5A09A]">{plan.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#D99A4E]">
                      {plan.is_custom_pricing
                        ? 'Sob consulta'
                        : plan.price_monthly === 0
                          ? 'R$ 0,00'
                          : formatCurrencyBRL(plan.price_monthly)}
                    </span>
                    {!plan.is_custom_pricing && (
                      <span className="text-xs text-[#A5A09A]">/mês</span>
                    )}
                  </div>

                  <div className="mt-5 space-y-2 border-t border-[#292521] pt-4 text-xs">
                    <p>
                      <strong className="text-[#F5F1EB]">Profissionais:</strong>{' '}
                      {plan.max_barbers === null ? 'Ilimitados' : `Até ${plan.max_barbers}`}
                    </p>
                    <p>
                      <strong className="text-[#F5F1EB]">Agendamentos/mês:</strong>{' '}
                      {plan.max_monthly_appointments === null
                        ? 'Ilimitados'
                        : `Até ${plan.max_monthly_appointments}`}
                    </p>
                    <p>
                      <strong className="text-[#F5F1EB]">Unidades:</strong>{' '}
                      {plan.max_branches >= 999 ? 'Personalizado' : `Até ${plan.max_branches}`}
                    </p>
                  </div>

                  <ul className="mt-4 space-y-2 border-t border-[#292521] pt-4 text-xs">
                    {feats.map((f) => (
                      <li
                        key={f.id}
                        className={`flex items-center gap-2 ${
                          f.is_enabled ? 'text-[#F5F1EB]' : 'text-[#A5A09A]/45'
                        }`}
                      >
                        {f.is_enabled ? (
                          <Check className="h-3.5 w-3.5 text-[#16C784]" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-white/20" />
                        )}
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/cadastro?plan=${plan.code}`}
                  className={`mt-6 block rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider ${
                    plan.is_popular
                      ? 'bg-[#D99A4E] text-[#090909] hover:bg-[#F2B968]'
                      : 'border border-[#292521] hover:border-[#D99A4E]'
                  }`}
                >
                  {plan.trial_days > 0
                    ? `Testar ${plan.trial_days} dias grátis`
                    : 'Criar conta gratuita'}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Matriz Comparativa */}
        <div className="mt-14 overflow-x-auto rounded-2xl border border-[#292521] bg-[#151515] p-6">
          <h3 className="font-display text-2xl font-semibold">Comparativo Detalhado</h3>
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#292521] text-[#A5A09A]">
                <th className="py-3 pr-4">Recurso</th>
                {plans.map((p) => (
                  <th key={p.id} className="py-3 px-3 text-center text-[#F5F1EB]">
                    {p.name.replace('Plano ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {featureKeys.map((fk) => (
                <tr key={fk.key}>
                  <td className="py-3 pr-4 text-[#F5F1EB]">{fk.label}</td>
                  {plans.map((p) => {
                    const enabled = db.subscription_features.find(
                      (sf) => sf.plan_id === p.id && sf.feature_key === fk.key
                    )?.is_enabled;
                    return (
                      <td key={p.id} className="py-3 px-3 text-center">
                        {enabled ? (
                          <Check className="mx-auto h-4 w-4 text-[#16C784]" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#292521] bg-[#090909] p-4 text-xs text-[#A5A09A]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D99A4E]" />
            <div className="space-y-1">
              <p className="font-semibold text-[#F5F1EB]">Transparência Comercial</p>
              <p>{db.platform_settings.mercadopago_fee_notice}</p>
              <p>{db.platform_settings.whatsapp_fee_notice}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
