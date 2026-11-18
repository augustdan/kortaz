'use client';

import { useAdminData } from '@/components/admin/AdminShell';
import { formatDateTimeBR } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const { data } = useAdminData();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Logs de Auditoria & Segurança</h1>
        <p className="text-xs text-[#B59E8D]">
          Trilha imutável de ações críticas, alterações de planos, webhooks e solicitações LGPD.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C] p-5">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 text-[#B59E8D]">
            <tr>
              <th className="py-2 pr-4">Data</th>
              <th className="py-2 pr-4">Ação</th>
              <th className="py-2 pr-4">Entidade</th>
              <th className="py-2 pr-4">Severidade</th>
              <th className="py-2">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="py-2.5 pr-4 text-[#B59E8D]">{formatDateTimeBR(log.created_at)}</td>
                <td className="py-2.5 pr-4 font-bold text-[#D49B6A]">{log.action}</td>
                <td className="py-2.5 pr-4">{log.entity}</td>
                <td className="py-2.5 pr-4 uppercase">{log.severity}</td>
                <td className="py-2.5 font-mono text-[11px] text-[#B59E8D]">
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
