import React, { useState } from 'react';
import { ChartData } from '../../types';

interface LineChartProps {
    data: ChartData;
}

interface TooltipData {
    series: string;
    label: string;
    value: string;
    x: number;
    y: number;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

    const { labels, datasets } = data;
    if (!datasets || datasets.length === 0) return null;

    const chartHeight = 300;
    const chartWidth = 500;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const drawableWidth = chartWidth - padding.left - padding.right;
    const drawableHeight = chartHeight - padding.top - padding.bottom;

    const allDataPoints = datasets.flatMap(ds => ds.data);
    const maxValue = Math.max(...allDataPoints, 0);
    const minValue = Math.min(...allDataPoints, 0);

    // Y-axis scaling
    const yRange = maxValue - minValue;
    const yPixelPerUnit = yRange > 0 ? drawableHeight / yRange : 0;
    const getY = (value: number) => padding.top + drawableHeight - ((value - minValue) * yPixelPerUnit);

    // X-axis scaling
    const xPixelPerUnit = drawableWidth / (labels.length - 1 || 1);
    const getX = (index: number) => padding.left + (index * xPixelPerUnit);

    const defaultColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

    const paths = datasets.map((ds, dsIndex) => {
        const pathData = ds.data.map((point, i) => {
            const command = i === 0 ? 'M' : 'L';
            return `${command} ${getX(i)},${getY(point)}`;
        }).join(' ');
        
        const strokeColor = ds.color || defaultColors[dsIndex % defaultColors.length];

        return { pathData, strokeColor, label: ds.label };
    });

    return (
        <div className="w-full h-full flex flex-col">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" aria-label={data.title}>
                {/* Y-axis Grid Lines and Labels */}
                {[...Array(5)].map((_, i) => {
                    const value = minValue + (i * yRange / 4);
                    const y = getY(value);
                    return (
                        <g key={i} className="text-gray-500">
                            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2,2" />
                            <text x={padding.left - 8} y={y + 4} fill="var(--text-secondary)" textAnchor="end" fontSize="10">{value.toLocaleString()}</text>
                        </g>
                    );
                })}

                {/* X-axis Labels */}
                {labels.map((label, i) => (
                    <text key={i} x={getX(i)} y={chartHeight - padding.bottom + 15} fill="var(--text-primary)" textAnchor="middle" fontSize="10">{label}</text>
                ))}

                {/* Data Lines */}
                {paths.map((p, index) => (
                    <path 
                        key={index} 
                        d={p.pathData} 
                        fill="none" 
                        stroke={p.strokeColor} 
                        strokeWidth="2" 
                        className="path-animation"
                        strokeOpacity={hoveredSeries && hoveredSeries !== p.label ? 0.2 : 1}
                        style={{transition: 'stroke-opacity 0.2s ease-in-out'}}
                    >
                        <style>{`
                            @keyframes draw {
                                to { stroke-dashoffset: 0; }
                            }
                            .path-animation {
                                stroke-dasharray: 1000;
                                stroke-dashoffset: 1000;
                                animation: draw 2s ease-out forwards;
                            }
                        `}</style>
                    </path>
                ))}

                {/* Data Points */}
                {datasets.map((ds, dsIndex) => {
                    const pointColor = ds.color || defaultColors[dsIndex % defaultColors.length];
                    return ds.data.map((point, i) => (
                         <circle 
                            key={`${dsIndex}-${i}`} 
                            cx={getX(i)} 
                            cy={getY(point)} 
                            r="4" 
                            fill={pointColor} 
                            stroke="var(--bg-gradient-via)" 
                            strokeWidth="2"
                            opacity={hoveredSeries && hoveredSeries !== ds.label ? 0.2 : 1}
                            className="point-animation transition-all duration-200 hover:scale-150 cursor-pointer"
                            onMouseEnter={() => setTooltipData({ series: ds.label, label: labels[i], value: point.toLocaleString(), x: getX(i), y: getY(point) })}
                            onMouseLeave={() => setTooltipData(null)}
                        >
                              <style>{`
                                @keyframes fade-in { 
                                    from { opacity: 0; }
                                    to { opacity: ${hoveredSeries && hoveredSeries !== ds.label ? 0.2 : 1}; } 
                                }
                                .point-animation { 
                                    opacity: 0;
                                    animation: fade-in 0.5s ease-out forwards; 
                                    animation-delay: 1.5s; 
                                }
                            `}</style>
                         </circle>
                    ));
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
                <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
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

export default LineChart;