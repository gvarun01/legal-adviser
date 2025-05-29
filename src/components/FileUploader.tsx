import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, FileText, FileX } from "lucide-react";
import { toast } from '@/components/ui/sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileUploaderProps {
  onContentExtracted: (content: string) => void;
  className?: string;
}

const FileUploader = ({ onContentExtracted, className }: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) return;
    
    const allowedTypes = [
      'application/pdf', 
      'text/plain', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please upload a PDF, TXT, or DOCX file only');
      e.target.value = '';
      return;
    }
    
    setFile(selectedFile);
    extractTextFromFile(selectedFile);
  };
  
  const extractTextFromFile = async (file: File) => {
    setIsLoading(true);
    
    try {
      if (file.type === 'text/plain') {
        // For plain text files, simply read the content
        const text = await file.text();
        onContentExtracted(text);
      } else if (file.type === 'application/pdf') {
        // For PDF files, use pdf.js to extract text
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        
        try {
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;
          let extractedText = '';
          
          // Extract text from each page
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => 
              'str' in item ? item.str : ''
            );
            extractedText += textItems.join(' ') + '\n\n';
          }
          
          onContentExtracted(extractedText.trim());
        } catch (error) {
          console.error('PDF extraction error:', error);
          toast.error('Failed to extract text from PDF');
        }
      } else {
        // For DOCX/DOC files, we'd need a server-side solution or a specialized library
        // Since browser-side DOCX parsing is limited, we'll show a message
        toast.warning('DOCX/DOC extraction requires server processing. This feature is limited in the browser.');
        onContentExtracted(`[Document extraction from ${file.name} is limited in browser. For best results, please copy and paste the content directly.]`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error('Failed to extract text from file');
    }
    
    setIsLoading(false);
  };
  
  const removeFile = () => {
    setFile(null);
    onContentExtracted('');
  };
  
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {!file ? (
          <>
            <Button 
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isLoading}
            >
              <Upload size={16} />
              Upload Document
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.txt,.docx,.doc"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <span className="text-xs text-muted-foreground">
              Supports PDF, TXT, DOCX
            </span>
          </>
        ) : (
          <div className="flex items-center gap-3 bg-secondary/50 py-2 px-4 rounded-md w-full">
            <FileText size={16} className="text-legal-action" />
            <span className="text-sm truncate flex-1">{file.name}</span>
            <button 
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove file"
            >
              <FileX size={16} />
            </button>
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <span className="inline-block w-4 h-4 border-2 border-legal-action border-t-transparent rounded-full animate-spin"></span>
          Extracting text...
        </div>
      )}
    </div>
  );
};

export default FileUploader;
