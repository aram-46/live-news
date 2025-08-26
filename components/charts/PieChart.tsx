
import React from 'react';
import { ChartData } from '../../types';

interface PieChartProps {
    data: ChartData;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
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

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-full w-full p-4">
            <div
                className="w-48 h-48 rounded-full transition-transform duration-500 hover:scale-105"
                style={{
                    background: conicGradient,
                    animation: 'pie-in 1s ease-out'
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
                {labels.map((label, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="text-gray-300">{label}:</span>
                        <span className="font-semibold text-white">{dataset.data[index]}</span>
                        <span className="text-gray-400">({((dataset.data[index] / total) * 100).toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChart;
