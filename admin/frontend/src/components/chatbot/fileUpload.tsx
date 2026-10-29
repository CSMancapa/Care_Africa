import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

export function FileUpload({ onFileSelect, selectedFiles, onRemoveFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(Array.from(e.target.files));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*,.pdf,.doc,.docx"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 rounded-md",
          "border border-gray-300 hover:bg-gray-50 transition-colors"
        )}
      >
        <Paperclip className="w-4 h-4" />
        Attach Files
      </button>

      {selectedFiles.length > 0 && (
        <div className="mt-2 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 text-sm bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-gray-500">({formatFileSize(file.size)})</span>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="p-1 text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}