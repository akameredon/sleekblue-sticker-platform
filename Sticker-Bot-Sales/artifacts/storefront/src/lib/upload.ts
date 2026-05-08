import { useCallback, useState } from "react";
import { apiUrl } from "./paths";

export type UploadResult = {
  uploadURL: string;
  objectPath: string;
  name: string;
  size: number;
  contentType: string;
};

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(10);
      try {
        const presignRes = await fetch(apiUrl("/storage/uploads/request-url"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });
        if (!presignRes.ok) throw new Error("Could not request upload URL");
        const presign = (await presignRes.json()) as {
          uploadURL: string;
          objectPath: string;
        };
        setProgress(40);
        const putRes = await fetch(presign.uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
        if (!putRes.ok) throw new Error("Upload to storage failed");
        setProgress(100);
        return {
          uploadURL: presign.uploadURL,
          objectPath: presign.objectPath,
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { uploadFile, isUploading, progress, error, setError };
}
