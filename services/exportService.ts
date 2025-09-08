import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import saveAs from 'file-saver';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';

// --- Helper Functions ---
function getElementHtml(element: HTMLElement): string {
    // A simplified clone to avoid modifying the original element
    const clonedElement = element.cloneNode(true) as HTMLElement;
    // You might add more cleanup here (e.g., removing buttons)
    return clonedElement.innerHTML;
}

// --- Export Functions ---

export async function exportToImage(element: HTMLElement, fileName: string): Promise<void> {
    const canvas = await html2canvas(element, { 
        backgroundColor: '#111827', // A dark background similar to the theme
        useCORS: true,
        scale: 2 // Higher resolution
    });
    const dataUrl = canvas.toDataURL('image/png');
    saveAs(dataUrl, `${fileName}.png`);
}

export async function exportToPdf(element: HTMLElement, fileName:string): Promise<void> {
    const canvas = await html2canvas(element, { 
        backgroundColor: '#111827',
        useCORS: true,
        scale: 2
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileName}.pdf`);
}

export function exportToHtml(htmlContent: string, fileName: string): void {
    const styledHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${fileName}</title>
            <style>
                body { font-family: sans-serif; background-color: #111827; color: #d1d5db; padding: 20px; }
                /* Add more styles here to match the app's look and feel */
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;
    const blob = new Blob([styledHtml], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${fileName}.html`);
}


export async function exportToDocx(htmlContent: string, fileName: string): Promise<void> {
    // This is a simplified conversion. For complex HTML, a library like html-to-docx is needed.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const paragraphs = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4, li')).map(el => {
        return new Paragraph({
            children: [new TextRun(el.textContent || '')],
            style: el.tagName.startsWith('H') ? 'heading' + el.tagName.substring(1) : undefined
        });
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
}

export function exportToXlsx(htmlContent: string, fileName: string): void {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    // This creates a basic XLSX from a table if one exists in the HTML
    const table = tempDiv.querySelector('table');
    if (table) {
        const wb = XLSX.utils.table_to_book(table);
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        // Fallback for non-tabular content
        const data = Array.from(tempDiv.querySelectorAll('p, h3')).map(el => [el.tagName, el.textContent]);
        const ws = XLSX.utils.aoa_to_sheet([['Element', 'Content'], ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Content');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
}