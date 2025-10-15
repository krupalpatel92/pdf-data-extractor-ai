import { PdfUpload } from '@/components/pdf-upload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">PDF Data Extractor</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload PDF documents and extract data using AI
          </p>
        </div>
        <PdfUpload />
      </main>
    </div>
  );
}
