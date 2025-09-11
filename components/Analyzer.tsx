import React from 'react';
import { AppSettings } from '../types';
import DeepAnalysis from './DeepAnalysis';

interface AnalyzerProps {
  settings: AppSettings;
}

const Analyzer: React.FC<AnalyzerProps> = ({ settings }) => {
  // This component can be a simple wrapper or can be extended to include other analysis tools.
  // For now, it directly renders the DeepAnalysis component.
  return (
    <div>
      <DeepAnalysis settings={settings} />
    </div>
  );
};

export default Analyzer;
