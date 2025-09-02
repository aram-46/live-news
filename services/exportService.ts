import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { NewsArticle, WebResult, StatisticsResult, ScientificArticleResult, AgentExecutionResult, GeneralTopicResult } from '../types';

// Helper to sanitize text for HTML
const escapeHtml = (unsafe: string | undefined | null) => {
    if(!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- HTML Generation ---

const generateHtmlStyles = () => `
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e7eb; padding: 20px; direction: rtl; }
    h1 { color: #67e8f9; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; }
    .container { max-width: 800px; margin: auto; }
    .card { background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 15px; margin-bottom: 15px; overflow: hidden; }
    .card h2 { margin-top: 0; color: #93c5fd; font-size: 1.2em; }
    .card p { margin: 5px 0; }
    .card a { color: #67e8f9; text-decoration: none; }
    .card a:hover { text-decoration: underline; }
    .meta { font-size: 0.8em; color: #9ca3af; margin-top: 10px; }
    .meta span { margin-left: 15px; }
    img { max-width: 100px; float: right; margin-right: 15px; border-radius: 4px; }
    .structured-section { border-top: 1px solid #4b5563; margin-top: 10px; padding-top: 10px; }
    .structured-section h3 { color: #a5b4fc; font-size: 1.1em; }
    ul { list-style-type: disc; padding-right: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #4b5563; padding: 8px; text-align: right; }
    th { background-color: #374151; color: #d1d5db; }
</style>
`;

const generateNewsHtml = (data: NewsArticle[]): string => {
    return data.map(article => `
        <div class="card">
            ${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="Image for ${escapeHtml(article.title)}">` : ''}
            <h2><a href="${escapeHtml(article.link)}" target="_blank">${escapeHtml(article.title)}</a></h2>
            <p>${escapeHtml(article.summary)}</p>
            <div class="meta">
                <span><strong>منبع:</strong> ${escapeHtml(article.source)}</span>
                <span><strong>اعتبار:</strong> ${escapeHtml(String(article.credibility))}</span>
                <span><strong>دسته:</strong> ${escapeHtml(article.category)}</span>
            </div>
        </div>
    `).join('');
};

const generateWebHtml = (data: WebResult[]): string => {
    return data.map(result => `
        <div class="card">
             ${result.imageUrl ? `<img src="${escapeHtml(result.imageUrl)}" alt="Image for ${escapeHtml(result.title)}">` : ''}
            <h2><a href="${escapeHtml(result.link)}" target="_blank">${escapeHtml(result.title)}</a></h2>
            <p>${escapeHtml(result.description)}</p>
            <div class="meta">
                <span><strong>منبع:</strong> ${escapeHtml(result.source)}</span>
            </div>
        </div>
    `).join('');
};

const generateStructuredHtml = (data: StatisticsResult | ScientificArticleResult): string => {
    let html = `<div class="card">`;
    html += `<h2>${escapeHtml(data.title)}</h2>`;
    html += `<p>${escapeHtml(data.summary)}</p>`;
    // Source details
    html += `<div class="structured-section"><h3>جزئیات منبع</h3><p><strong>نام:</strong> <a href="${escapeHtml(data.sourceDetails.link)}" target="_blank">${escapeHtml(data.sourceDetails.name)}</a></p><p><strong>نویسنده:</strong> ${escapeHtml(data.sourceDetails.author)}</p><p><strong>تاریخ:</strong> ${escapeHtml(data.sourceDetails.publicationDate)}</p></div>`;
    // Analysis
    html += `<div class="structured-section"><h3>تحلیل</h3><p><strong>اعتبار فعلی:</strong> ${escapeHtml(data.analysis.currentValidity)}</p></div>`;
    html += `</div>`;
    return html;
};

const generateAgentHtml = (data: AgentExecutionResult): string => {
    let html = `<div class="card">`;
    html += `<h2>خلاصه نتایج</h2><p>${escapeHtml(data.summary)}</p>`;

    html += `<div class="structured-section"><h3>مراحل انجام شده</h3>`;
    data.steps.forEach(step => {
        html += `<p><strong>${escapeHtml(step.title)}:</strong> ${escapeHtml(step.description)}</p>`;
    });
    html += `</div>`;

    html += `<div class="structured-section"><h3>منابع اصلی</h3><ul>`;
    data.sources.forEach(source => {
        html += `<li><a href="${escapeHtml(source.uri)}" target="_blank">${escapeHtml(source.title)}</a></li>`;
    });
    html += `</ul></div>`;
    
    html += `</div>`;
    return html;
};

const generateGeneralTopicHtml = (data: GeneralTopicResult): string => {
    let html = `<div class="card">`;
    html += `<h2>${escapeHtml(data.title)}</h2><p>${escapeHtml(data.summary)}</p>`;
    
    html += `<div class="structured-section"><h3>نکات کلیدی</h3>`;
    data.keyPoints.forEach(point => {
        html += `<h4>${escapeHtml(point.title)}</h4><p>${escapeHtml(point.description)}</p>`;
    });
    html += `</div>`;

    if (data.comparison) {
        html += `<div class="structured-section"><h3>تحلیل مقایسه‌ای</h3><table>`;
        html += `<thead><tr><th>جنبه مقایسه</th><th>${escapeHtml(data.comparison.topicA)}</th><th>${escapeHtml(data.comparison.topicB)}</th></tr></thead>`;
        html += `<tbody>`;
        data.comparison.points.forEach(p => {
            html += `<tr><td>${escapeHtml(p.aspect)}</td><td>${escapeHtml(p.analysisA)}</td><td>${escapeHtml(p.analysisB)}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    html += `<div class="structured-section"><h3>منابع</h3><ul>`;
    data.sources.forEach(source => {
        html += `<li><a href="${escapeHtml(source.uri)}" target="_blank">${escapeHtml(source.title)}</a></li>`;
    });
    html += `</ul></div>`;
    
    html += `</div>`;
    return html;
};

export const generateHtmlContent = (data: any, title: string, type: 'news' | 'web' | 'structured' | 'agent' | 'general_topic'): string => {
    let contentHtml = '';
    if (!data || (Array.isArray(data) && data.length === 0)) {
        contentHtml = '<p>No data to display.</p>';
    } else if (type === 'news') {
        contentHtml = generateNewsHtml(data as NewsArticle[]);
    } else if (type === 'web') {
        contentHtml = generateWebHtml(data as WebResult[]);
    } else if (type === 'structured') {
        contentHtml = generateStructuredHtml(data as StatisticsResult | ScientificArticleResult);
    } else if (type === 'agent') {
        contentHtml = generateAgentHtml(data as AgentExecutionResult);
    } else if (type === 'general_topic') {
        contentHtml = generateGeneralTopicHtml(data as GeneralTopicResult);
    }
    
    return `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>خروجی نتایج برای: ${escapeHtml(title)}</title>
            ${generateHtmlStyles()}
        </head>
        <body>
            <div class="container">
                <h1>نتایج جستجو برای: "${escapeHtml(title)}"</h1>
                ${contentHtml}
            </div>
        </body>
        </html>
    `;
}

export const exportToHtml = (htmlContent: string, fileName: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Image & PDF Export ---

export const exportToImage = async (element: HTMLElement, fileName: string) => {
    const canvas = await html2canvas(element, { backgroundColor: '#0a0a0a', useCORS: true });
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};


export const exportToPdf = async (element: HTMLElement, fileName: string) => {
    const canvas = await html2canvas(element, { backgroundColor: '#0a0a0a', useCORS: true, scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const ratio = canvasWidth / canvasHeight;
    const newCanvasWidth = pdfWidth;
    const newCanvasHeight = newCanvasWidth / ratio;
    
    let heightLeft = newCanvasHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, newCanvasWidth, newCanvasHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = -newCanvasHeight + heightLeft; // Adjust position for the next part of the image
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, newCanvasWidth, newCanvasHeight);
        heightLeft -= pdfHeight;
    }
    
    pdf.save(`${fileName}.pdf`);
};
