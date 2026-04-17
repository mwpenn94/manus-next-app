import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

export interface UploadedFile {
  fileName: string;
  url: string;
  fileKey: string;
  mimeType: string;
  size: number;
}

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export function useFileUpload(taskExternalId?: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const recordFile = trpc.file.record.useMutation();

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        return null;
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Task-Id": taskExternalId || "unknown",
          },
          credentials: "include",
          body: file,
        });

        setProgress(80);

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }

        const result = await response.json();
        setProgress(100);

        const uploaded: UploadedFile = {
          fileName: file.name,
          url: result.url,
          fileKey: result.key,
          mimeType: file.type,
          size: file.size,
        };

        // Record in database
        if (taskExternalId) {
          await recordFile.mutateAsync({
            taskExternalId,
            fileName: file.name,
            fileKey: result.key,
            url: result.url,
            mimeType: file.type,
            size: file.size,
          });
        }

        setFiles((prev) => [...prev, uploaded]);
        return uploaded;
      } catch (err: any) {
        setError(err.message || "Upload failed");
        return null;
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [taskExternalId, recordFile]
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        await upload(file);
      }
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [upload]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    uploading,
    progress,
    error,
    upload,
    openPicker,
    handleFileChange,
    removeFile,
    clearFiles,
    inputRef,
  };
}
