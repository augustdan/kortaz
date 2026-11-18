'use client';

import { useAdminData } from '@/components/admin/AdminShell';
import { formatDateTimeBR } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const { data } = useAdminData();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Logs de Auditoria & Segurança</h1>
        <p className="text-xs text-[#A5A09A]">
          Trilha imutável de ações críticas, alterações de planos, webhooks e solicitações LGPD.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#292521] bg-[#151515] p-5">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#292521] text-[#A5A09A]">
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
                <td className="py-2.5 pr-4 text-[#A5A09A]">{formatDateTimeBR(log.created_at)}</td>
                <td className="py-2.5 pr-4 font-bold text-[#D99A4E]">{log.action}</td>
                <td className="py-2.5 pr-4">{log.entity}</td>
                <td className="py-2.5 pr-4 uppercase">{log.severity}</td>
                <td className="py-2.5 font-mono text-[11px] text-[#A5A09A]">
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
