import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0E0906] text-[#F7EFE6]">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <BrandLogo />
          <Link href="/" className="text-xs text-[#D49B6A] hover:underline">
            Voltar ao início
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12 text-sm leading-relaxed text-[#B59E8D]">
        <h1 className="font-serif text-4xl font-semibold text-[#F7EFE6]">Termos de Uso — Kortaz</h1>
        <p>
          1. <strong className="text-[#F7EFE6]">Objeto:</strong> A Kortaz disponibiliza infraestrutura SaaS multi-tenant para gestão de agendamentos, financeiro, comissões, estoque e relacionamento com clientes de barbearias e salões de beleza.
        </p>
        <p>
          2. <strong className="text-[#F7EFE6]">Transparência de Planos e Limites:</strong> Cada assinatura respeita os limites contratados pelo titular do estabelecimento. Ao atingir o teto mensal, os dados existentes são integralmente preservados sem exclusão, podendo o assinante realizar upgrade a qualquer momento.
        </p>
        <p>
          3. <strong className="text-[#F7EFE6]">Separação Financeira:</strong> Os valores transacionados pelos clientes finais nas barbearias e salões são processados diretamente pelas contas configuradas do provedor Mercado Pago ou recebidos presencialmente no estabelecimento, sem intermediação oculta pela Kortaz.
        </p>
        <p>
          4. <strong className="text-[#F7EFE6]">Segurança e Cartões:</strong> Nenhum dado completo de cartão de crédito é armazenado em nossos servidores. Todas as operações eletrônicas utilizam tokenização oficial do gateway de pagamento.
        </p>
      </main>
    </div>
  );
}
