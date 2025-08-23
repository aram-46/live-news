
import React, { useState, useEffect } from 'react';
import { backendFiles } from '../../data/fileContent';

// A simple markdown to HTML converter
const convertMarkdownToHTML = (markdown: string) => {
    return markdown
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-cyan-300 mt-6 mb-3">$1</h1>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-cyan-200 mt-4 mb-2">$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\n/gim, '<br />');
};

const AboutTab: React.FC = () => {
    const [featuresHtml, setFeaturesHtml] = useState('');

    useEffect(() => {
        // In a real app with a file system, you might fetch this.
        // Here, we'll just use the imported content.
        const html = convertMarkdownToHTML(backendFiles.featuresMd);
        setFeaturesHtml(html);
    }, []);

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-4">
             <div 
                className="text-gray-300 leading-loose prose"
                dangerouslySetInnerHTML={{ __html: featuresHtml }}
             />
        </div>
    );
};

export default AboutTab;
