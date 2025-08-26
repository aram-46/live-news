import React, { useState } from 'react';
import { ChartData } from '../../types';

interface BarChartProps {
    data: ChartData;
}

interface TooltipData {
    series: string;
    label: string;
    value: string;
    x: number;
    y: number;
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

    const { labels, datasets } = data;
    if (!datasets || datasets.length === 0) return null;

    const allDataPoints = datasets.flatMap(ds => ds.data);
    const maxValue = Math.max(...allDataPoints, 0);

    const chartHeight = 300;
    const chartWidth = 500;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const drawableWidth = chartWidth - padding.left - padding.right;
    const drawableHeight = chartHeight - padding.top - padding.bottom;

    const groupWidth = drawableWidth / labels.length;
    const barPadding = 0.2; // 20% padding within each group
    const barWidth = (groupWidth * (1 - barPadding)) / datasets.length;
    
    const defaultColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    
    return (
        <div className="w-full h-full flex flex-col">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" aria-label={data.title}>
                {/* Y-axis Grid Lines and Labels */}
                {[...Array(5)].map((_, i) => {
                    const y = padding.top + drawableHeight - (i * drawableHeight / 4);
                    const value = (i * maxValue / 4).toFixed(0);
                    return (
                        <g key={i}>
                            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="rgba(107, 114, 128, 0.3)" strokeDasharray="2,2" />
                            <text x={padding.left - 8} y={y + 4} fill="var(--text-secondary)" textAnchor="end" fontSize="10">{value}</text>
                        </g>
                    );
                })}

                {/* Bars and X-axis Labels */}
                {labels.map((label, groupIndex) => {
                    const groupX = padding.left + groupIndex * groupWidth + (groupWidth * barPadding / 2);
                    return (
                        <g key={groupIndex}>
                            {datasets.map((ds, dsIndex) => {
                                const value = ds.data[groupIndex] || 0;
                                const barHeight = (value / maxValue) * drawableHeight;
                                const x = groupX + dsIndex * barWidth;
                                const y = padding.top + drawableHeight - barHeight;
                                const color = ds.color || defaultColors[dsIndex % defaultColors.length];

                                return (
                                    <rect
                                        key={dsIndex}
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill={color}
                                        rx="2"
                                        opacity={hoveredSeries && hoveredSeries !== ds.label ? 0.3 : 1}
                                        className="transition-opacity duration-200"
                                        onMouseEnter={(e) => setTooltipData({ series: ds.label, label, value: value.toLocaleString(), x: e.currentTarget.x.baseVal.value + barWidth / 2, y: e.currentTarget.y.baseVal.value })}
                                        onMouseLeave={() => setTooltipData(null)}
                                    >
                                        <animate attributeName="height" from="0" to={barHeight} dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                        <animate attributeName="y" from={padding.top + drawableHeight} to={y} dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                    </rect>
                                );
                            })}
                            <text x={groupX + (groupWidth * (1-barPadding) / 2)} y={chartHeight - padding.bottom + 15} fill="var(--text-primary)" textAnchor="middle" fontSize="10">{label}</text>
                        </g>
                    );
                })}

                {/* Tooltip */}
                {tooltipData && (
                    <g transform={`translate(${tooltipData.x}, ${tooltipData.y})`} style={{ pointerEvents: 'none' }}>
                        <path d="M-50 -35 L50 -35 L50 -10 L10 -10 L0 0 L-10 -10 L-50 -10 Z" fill="rgba(10, 10, 10, 0.85)" stroke="rgba(255,255,255,0.2)" />
                        <text textAnchor="middle" fill="#fff" fontSize="10">
                            <tspan x="0" y="-24" fill="var(--text-secondary)">{`${tooltipData.label}`}</tspan>
                            <tspan x="0" y="-12" fontWeight="bold" fontSize="12">{`${tooltipData.series}: ${tooltipData.value}`}</tspan>
                        </text>
                    </g>
                )}
            </svg>
             {/* Legend */}
             {datasets.length > 1 && (
                <div className="flex justify-center flex-wrap gap-4 mt-2 text-xs">
                    {datasets.map((ds, i) => (
                         <div 
                            key={i} 
                            className="flex items-center gap-2 cursor-pointer"
                            onMouseEnter={() => setHoveredSeries(ds.label)}
                            onMouseLeave={() => setHoveredSeries(null)}
                         >
                             <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ds.color || defaultColors[i % defaultColors.length] }}></span>
                             <span className="text-gray-300">{ds.label}</span>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BarChart;