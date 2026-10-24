/**
 * Safe client-side file reading and text extraction utilities
 */

/**
 * Files that are already structured and must be imported on-device instead of
 * being sent to the AI extractor.
 */
export const LOCAL_IMPORT_EXTENSIONS = ['.json', '.md', '.markdown', '.csv', '.txt'] as const;

export function isLocalImportFile(file: File): boolean {
  return LOCAL_IMPORT_EXTENSIONS.includes(getFileExtension(file.name) as any);
}

export const SUPPORTED_UPLOAD_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown', '.csv', '.json', '.png', '.jpg', '.jpeg', '.webp'] as const;

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
    fileName.endsWith('.markdown') ||
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
        // Bundled only. The old fallback pulled the worker from a public CDN,
        // which contradicted "works offline" and made device-side extraction
        // depend on a third-party host; if the bundled worker is unavailable
        // the caller falls through to the server path instead.
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;
      const textPieces: string[] = [];

      // Read the whole paper, not a fixed number of pages: a 60-question
      // booklet used to lose every question after page 40 when the AI had to
      // fall back to text-only. The character budget is the real limit.
      const MAX_EXTRACTED_CHARS = 400_000;
      let extractedChars = 0;
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str || '')
          .join(' ');
        if (pageText.trim()) {
          textPieces.push(pageText);
          extractedChars += pageText.length;
        }
        if (extractedChars >= MAX_EXTRACTED_CHARS) break;
      }

      return textPieces.join('\n\n');
    } catch (e) {
      console.warn('PDF client-side text pre-extraction skipped:', e);
      return '';
    }
  }

  return '';
}
