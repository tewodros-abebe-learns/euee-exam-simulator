/**
 * Safe client-side file reading and text extraction utilities
 */

export const SUPPORTED_UPLOAD_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv', '.json', '.rtf', '.png', '.jpg', '.jpeg', '.webp'] as const;

export function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match ? `.${match[1]}` : '';
}

export function isSupportedUpload(file: File): boolean {
  return SUPPORTED_UPLOAD_EXTENSIONS.includes(getFileExtension(file.name) as any);
}

/** Rejects obviously unsupported files before they are sent to the AI. */
export function assertSupportedUpload(file: File): void {
  if (!isSupportedUpload(file)) {
    throw new Error(
      'Unsupported file type. Please upload a PDF, an image (PNG/JPG/WebP), or a plain-text/Markdown file.'
    );
  }
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. data:application/pdf;base64,)
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // Plain text / Markdown / CSV / JSON
  if (
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.json') ||
    fileName.endsWith('.rtf') ||
    file.type.startsWith('text/')
  ) {
    try {
      return await file.text();
    } catch {
      return '';
    }
  }

  // For PDF files, attempt quick client text extraction if pdfjs is available
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Bundle the worker locally: loading it from a CDN broke offline uploads
      // and made parsing depend on a third-party host.
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
        }
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;
      const textPieces: string[] = [];

      const maxPages = Math.min(pdfDoc.numPages, 40); // Read up to 40 pages
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str || '')
          .join(' ');
        if (pageText.trim()) {
          textPieces.push(pageText);
        }
      }

      return textPieces.join('\n\n');
    } catch (e) {
      console.warn('PDF client-side text pre-extraction skipped:', e);
      return '';
    }
  }

  return '';
}
