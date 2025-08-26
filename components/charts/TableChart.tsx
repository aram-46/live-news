
import React from 'react';
import { ChartData } from '../../types';

interface TableChartProps {
    data: ChartData;
}

const TableChart: React.FC<TableChartProps> = ({ data }) => {
    const { labels, datasets } = data;
    if (!datasets || datasets.length === 0) return null;

    // A generic header for the first column if dataset labels are used as row headers.
    const firstColumnHeader = 'Category';

    return (
        <div className="w-full h-full overflow-auto p-1">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-cyan-200 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">{firstColumnHeader}</th>
                        {labels.map((label, index) => (
                            <th key={index} scope="col" className="px-4 py-3 text-center">{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {datasets.map((dataset, dsIndex) => (
                         <tr key={dsIndex} className="border-b border-gray-700 hover:bg-gray-800/50">
                             <td className="px-4 py-3 font-medium text-cyan-300">{dataset.label}</td>
                             {dataset.data.map((value, dataIndex) => (
                                 <td key={dataIndex} className="px-4 py-3 text-center font-mono">{value.toLocaleString()}</td>
                             ))}
                         </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TableChart;
