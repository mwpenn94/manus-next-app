import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, FileImage, FileText, FileCode, FileArchive, X, RotateCw, Trash2, UploadCloud } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

interface Upload {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: UploadStatus;
  preview?: string;
  error?: string;
}

interface FileUploadProgressProps {
  uploads: Upload[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  totalProgress: number;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getStatusStyles = (status: UploadStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-gray-500 hover:bg-gray-500';
    case 'uploading':
      return 'bg-blue-500 hover:bg-blue-500';
    case 'processing':
      return 'bg-yellow-500 hover:bg-yellow-500';
    case 'completed':
      return 'bg-green-500 hover:bg-green-500';
    case 'failed':
      return 'bg-red-500 hover:bg-red-500';
    default:
      return 'bg-gray-500 hover:bg-gray-500';
  }
};

const getFileIcon = (filename: string): React.ReactNode => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) return <File className="h-8 w-8 text-muted-foreground" />;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        return <FileImage className="h-8 w-8 text-muted-foreground" />;
    }
    if (['doc', 'docx', 'pdf', 'txt'].includes(extension)) {
        return <FileText className="h-8 w-8 text-muted-foreground" />;
    }
    if (['js', 'ts', 'html', 'css', 'json', 'md'].includes(extension)) {
        return <FileCode className="h-8 w-8 text-muted-foreground" />;
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(extension)) {
        return <FileArchive className="h-8 w-8 text-muted-foreground" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
};

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({ uploads, onCancel, onRetry, onRemove, totalProgress }) => {
  const totalSize = useMemo(() => uploads.reduce((acc, u) => acc + u.size, 0), [uploads]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-medium">File Uploads</CardTitle>
        <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-bold">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="w-full h-2" />
            <p className="text-xs text-muted-foreground mt-1">Total size: {formatBytes(totalSize)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploads.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg">
                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Drag and drop files here, or click to select files</p>
            </div>
          )}
          <AnimatePresence>
            {uploads.map((upload) => (
              <motion.div
                key={upload.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center space-x-4 p-3 bg-card rounded-lg border border-border"
              >
                <div className="flex-shrink-0 h-12 w-12 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {upload.preview ? (
                    <img src={upload.preview} alt={upload.filename} className="h-full w-full object-cover" />
                  ) : (
                    getFileIcon(upload.filename)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{upload.filename}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(upload.size)}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={upload.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(upload.progress)}%</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge className={cn("capitalize text-xs", getStatusStyles(upload.status))}>{upload.status}</Badge>
                    {upload.status === 'uploading' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCancel(upload.id)}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    {upload.status === 'failed' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRetry(upload.id)}>
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    )}
                    {(upload.status === 'completed' || upload.status === 'failed') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(upload.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {uploads.length > 0 && uploads.every(u => u.status === 'failed') && (
            <div className="text-center p-4">
                <p className="text-sm text-destructive">All uploads failed. Please try again.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
