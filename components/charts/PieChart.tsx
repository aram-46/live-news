import React, { useState } from 'react';
import { ChartData } from '../../types';

interface PieChartProps {
    data: ChartData;
}

interface TooltipState {
    visible: boolean;
    content: string;
    x: number;
    y: number;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: '', x: 0, y: 0 });

    const { labels, datasets } = data;
    if (!datasets || datasets.length === 0) return null;

    const dataset = datasets[0];
    const total = dataset.data.reduce((acc, val) => acc + val, 0);
    const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    
    let cumulativePercentage = 0;
    const gradients = dataset.data.map((value, index) => {
        const percentage = (value / total) * 100;
        const color = colors[index % colors.length];
        const startAngle = cumulativePercentage;
        cumulativePercentage += percentage;
        const endAngle = cumulativePercentage;
        return `${color} ${startAngle}% ${endAngle}%`;
    });
    
    const conicGradient = `conic-gradient(${gradients.join(', ')})`;

    const handleMouseEnter = (e: React.MouseEvent, label: string, value: number, percentage: number) => {
        setIsHovered(true);
        setTooltip({
            visible: true,
            content: `${label}: ${value.toLocaleString()} (${percentage.toFixed(1)}%)`,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setTooltip({ ...tooltip, visible: false });
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (tooltip.visible) {
            setTooltip(t => ({...t, x: e.clientX, y: e.clientY}));
        }
    };


    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-full w-full p-4 relative">
            {tooltip.visible && (
                <div 
                    className="fixed z-10 p-2 text-xs text-white bg-gray-900/80 rounded-md shadow-lg"
                    style={{ top: tooltip.y + 10, left: tooltip.x + 10, pointerEvents: 'none' }}
                >
                    {tooltip.content}
                </div>
            )}
            <div
                className="w-48 h-48 rounded-full transition-transform duration-300"
                style={{
                    background: conicGradient,
                    animation: 'pie-in 1s ease-out',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
            >
                <style>{`
                    @keyframes pie-in {
                        from {
                            clip-path: circle(0%);
                        }
                        to {
                            clip-path: circle(75%);
                        }
                    }
                `}</style>
                 <title>{data.title}</title>
            </div>
            <div className="flex flex-col gap-2">
                {labels.map((label, index) => {
                     const value = dataset.data[index];
                     const percentage = (value / total) * 100;
                    return (
                        <div 
                            key={index} 
                            className="flex items-center gap-2 text-sm p-1 rounded-md cursor-default"
                            onMouseEnter={(e) => handleMouseEnter(e, label, value, percentage)}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                        >
                            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></span>
                            <span className="text-gray-300">{label}:</span>
                            <span className="font-semibold text-white">{value.toLocaleString()}</span>
                            <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PieChart;