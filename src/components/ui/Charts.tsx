'use client';

import React, { useId, useState } from 'react';
import { formatCurrencyBRL } from '@/lib/utils';

export function SparklineChart({
  values,
  color = '#D99A4E',
  height = 38,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const uid = useId();
  const safeValues = values.length >= 2 ? values : [0, ...(values.length ? values : [0])];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const width = 140;

  const points = safeValues.map((v, i) => {
    const x = (i / (safeValues.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return { x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${uid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface RevenueSeriesPoint {
  label: string;
  value: number;
}

export function RevenueAreaChart({
  data,
  height = 220,
}: {
  data: RevenueSeriesPoint[];
  height?: number;
}) {
  const uid = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-[#A5A09A]">
        Sem dados de faturamento para o período selecionado.
      </div>
    );
  }

  const width = 620;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(100, ...data.map((d) => d.value));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

  const points = data.map((d, i) => {
    const x =
      data.length === 1 ? padLeft + chartW / 2 : padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.value / maxVal) * chartH;
    return { ...d, x, y, index: i };
  });

  const linePath = points
    .map((p, idx) => {
      if (idx === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = points[idx - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={`rev-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D99A4E" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#D99A4E" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, idx) => {
          const y = padTop + chartH - (tick / maxVal) * chartH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#292521"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                fill="#A5A09A"
                fontSize="10"
              >
                {tick >= 1000 ? `R$${(tick / 1000).toFixed(0)}k` : `R$${tick}`}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#rev-area-${uid})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#D99A4E"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {points.map((p, idx) => {
          const showLabel =
            data.length <= 7 || idx === 0 || idx === data.length - 1 || idx % Math.ceil(data.length / 5) === 0;
          const isHovered = hoveredIndex === idx;
          return (
            <g key={p.label}>
              {showLabel && (
                <text
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  fill="#A5A09A"
                  fontSize="10"
                >
                  {p.label}
                </text>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5.5 : 3.2}
                fill={isHovered ? '#F2B968' : '#151515'}
                stroke="#D99A4E"
                strokeWidth="2"
              />
              <rect
                x={p.x - 14}
                y={padTop}
                width="28"
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-xl border border-[#D99A4E]/40 bg-[#1B1B1B] px-3 py-1.5 text-xs shadow-xl"
          style={{
            left: `${Math.min(82, Math.max(12, (activePoint.x / width) * 100))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[10px] text-[#A5A09A]">{activePoint.label}</p>
          <p className="font-semibold text-[#F2B968]">{formatCurrencyBRL(activePoint.value)}</p>
        </div>
      )}
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#292521"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            slices.map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const currentOffset = offset;
              offset += dash;
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-xl font-bold text-[#F5F1EB]">{centerValue}</span>
          <span className="max-w-[84px] truncate text-[11px] text-[#A5A09A]">{centerLabel}</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {slices.length === 0 ? (
          <p className="text-xs text-[#A5A09A]">Sem serviços registrados ainda.</p>
        ) : (
          slices.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.label} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-[#F5F1EB]">{s.label}</span>
                </div>
                <span className="shrink-0 font-semibold text-[#A5A09A]">
                  {pct}% <span className="text-[10px] text-[#A5A09A]/70">({s.value})</span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
