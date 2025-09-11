import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';

// --- Image Export ---
export const exportToImage = async (element: HTMLElement, fileName: string): Promise<void> => {
    const canvas = await html2canvas(element, { backgroundColor: '#111827' }); // bg-gray-900
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = image;
    link.click();
};

// --- PDF Export ---
export const exportToPdf = async (element: HTMLElement, fileName: string): Promise<void> => {
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#111827' });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileName}.pdf`);
};

// --- HTML Export ---
export const exportToHtml = (htmlContent: string, fileName: string): void => {
    const blob = new Blob([`
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${fileName}</title>
            <style>
                body { font-family: sans-serif; background-color: #111827; color: #d1d5db; padding: 20px; }
                /* Add basic styles from the app if needed */
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${fileName}.html`);
};

// --- Word (DOCX) Export ---
export const exportToDocx = (htmlContent: string, fileName: string): void => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${fileName}.doc`; // Use .doc for better compatibility
    fileDownload.click();
    document.body.removeChild(fileDownload);
};

// --- Excel (XLSX) Export ---
export const exportToXlsx = (data: any[], fileName: string): void => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};