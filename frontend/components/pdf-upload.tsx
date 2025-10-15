"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  Clock,
  Eye,
  Trash2,
  Download,
} from "lucide-react";

interface ExtractedDataRecord {
  id: string;
  fileName: string;
  extractedContent: any;
  createdAt: string;
}

export function PdfUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(
    null
  );
  const [extractedData, setExtractedData] = useState<any>(null);
  const [previousExtractions, setPreviousExtractions] = useState<
    ExtractedDataRecord[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<ExtractedDataRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Load previous extractions on mount
  useEffect(() => {
    loadPreviousExtractions();
  }, []);

  const loadPreviousExtractions = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${apiUrl}/api/pdf/all`);
      if (response.ok) {
        const data = await response.json();
        setPreviousExtractions(data);
      }
    } catch (error) {
      console.error("Failed to load previous extractions:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length > 0) {
      setFiles((prev) => [...prev, ...pdfFiles]);
      setExtractedData(null);
      const message =
        pdfFiles.length === 1
          ? `${pdfFiles[0].name} added to queue`
          : `${pdfFiles.length} PDF files added to queue`;
      toast.success(message);
    } else {
      toast.error("Please select valid PDF files");
    }

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one PDF file");
      return;
    }

    setIsUploading(true);
    setUploadQueue(files.map((f) => f.name));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentlyProcessing(file.name);

      try {
        await uploadSingleFile(file);
        toast.success(`${file.name} processed successfully!`);
      } catch (error: any) {
        console.error(`Upload error for ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}: ${error.message}`);
      }

      setUploadQueue((prev) => prev.filter((name) => name !== file.name));
    }

    setCurrentlyProcessing(null);
    setIsUploading(false);
    setFiles([]);

    // Reload the history
    await loadPreviousExtractions();
    const successMessage =
      files.length === 1
        ? "File processed successfully!"
        : "All files processed!";
    toast.success(successMessage);
  };

  const uploadSingleFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const fileSize = file.size / 1024 / 1024; // Size in MB
    if (fileSize > 1) {
      toast.info(`Processing ${file.name}... This may take a while.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

    const response = await fetch(`${apiUrl}/api/pdf/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to upload and process PDF");
    }

    const data = await response.json();
    setExtractedData(data);
    return data;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    const pdfFiles = droppedFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length > 0) {
      setFiles((prev) => [...prev, ...pdfFiles]);
      setExtractedData(null);
      const message =
        pdfFiles.length === 1
          ? `${pdfFiles[0].name} added to queue`
          : `${pdfFiles.length} PDF files added to queue`;
      toast.success(message);
    } else {
      toast.error("Please drop valid PDF files");
    }

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const removedFile = files[index];
    setFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info(`${removedFile.name} removed from queue`);
  };

  const viewRecord = (record: ExtractedDataRecord) => {
    setSelectedRecord(record);
    setExtractedData(record);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const exportToCSV = (record: ExtractedDataRecord) => {
    try {
      // Data is already flattened in the backend
      const data = record.extractedContent;

      // Create CSV headers and values
      const headers = Object.keys(data);
      const values = Object.values(data);

      // Escape values that contain commas, quotes, or newlines
      const escapeCSV = (value: any) => {
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Create CSV content
      const csvContent = [
        headers.join(","),
        values.map(escapeCSV).join(","),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Clean filename: remove .pdf extension and any special characters
      const cleanFileName = record.fileName
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9-_äöüÄÖÜß ]/g, "_")
        .trim();

      link.setAttribute("href", url);
      link.setAttribute("download", `${cleanFileName}_extracted.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  const exportCurrentToCSV = () => {
    if (!extractedData) {
      toast.error("No data to export");
      return;
    }

    const record = selectedRecord || {
      id: "current",
      fileName: "extracted_data.pdf",
      extractedContent: extractedData.extractedContent || extractedData,
      createdAt: new Date().toISOString(),
    };

    exportToCSV(record as ExtractedDataRecord);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {files.length > 1 ? "Upload PDF Documents" : "Upload PDF Document"}
          </CardTitle>
          <CardDescription>
            {files.length > 1
              ? `${files.length} files will be processed sequentially`
              : "Upload a PDF file to extract data using AI"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {files.length > 0 ? (
                <>
                  <FileText className="h-12 w-12 text-green-600" />
                  {files.length === 1 ? (
                    <>
                      <p className="text-sm font-medium">{files[0].name}</p>
                      <p className="text-xs text-gray-500">
                        {(files[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">
                      {files.length} files selected
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="text-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF files only (multiple allowed)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* File Queue - Only show for multiple files */}
          {files.length > 1 && !isUploading && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Files in queue ({files.length}):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single File Actions - Only show for single file */}
          {files.length === 1 && !isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{files[0].name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    removeFile(0);
                  }}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isUploading && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{currentlyProcessing}</p>
                  {files.length > 1 && uploadQueue.length > 1 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {uploadQueue.length - 1 === 1
                        ? "1 file remaining"
                        : `${uploadQueue.length - 1} files remaining`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {files.length === 0
                  ? "Select a file to upload"
                  : files.length === 1
                  ? "Extract Data"
                  : `Extract Data from ${files.length} Files`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Extractions */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Previously Extracted PDFs</CardTitle>
            <CardDescription>
              View data from previously processed PDF files
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : previousExtractions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No previous extractions found. Upload a PDF to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {previousExtractions.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{record.fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(record.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewRecord(record)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(record)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Display */}
      {extractedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Extracted Data</CardTitle>
                <CardDescription>
                  {selectedRecord
                    ? `From: ${selectedRecord.fileName}`
                    : "Latest extraction"}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportCurrentToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(
                extractedData.extractedContent || extractedData,
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
