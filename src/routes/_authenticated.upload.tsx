import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DotLoader } from "@/components/Loader";

const MAX_MB = 10;
const ACCEPT = [".pdf", ".docx"];

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload — NAK Detection Tool" }] }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post<{ document_id: string }>("/documents/upload", form);
      const id = data.document_id;
      // Fire both analyses in parallel
      await Promise.allSettled([
        api.post(`/documents/${id}/analyze/ai`),
        api.post(`/documents/${id}/analyze/plagiarism`),
      ]);
      return id;
    },
    onSuccess: (id) => {
      toast.success("Upload received", { description: "Scanning started…" });
      navigate({ to: "/report/$documentId", params: { documentId: id } });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      const status = err.response?.status;
      if (status === 402) setShowUpgrade(true);
      else if (status === 400) toast.error("Unsupported file", { description: "Only PDF and DOCX are supported" });
      // other errors handled globally
    },
  });

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = "." + f.name.split(".").pop()!.toLowerCase();
    if (!ACCEPT.includes(ext)) {
      toast.error("Unsupported file type", { description: "Please upload a PDF or DOCX" });
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error("File too large", { description: `${MAX_MB}MB maximum` });
      return;
    }
    setFile(f);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Upload document</h1>
        <p className="text-sm text-muted-foreground">
          PDF or DOCX up to {MAX_MB}MB. Each upload uses 1 credit.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragging ? "border-brand bg-accent" : "border-border bg-card hover:border-brand/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          hidden
          onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
        />
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
          <div className="mx-auto rounded-full bg-accent w-14 h-14 flex items-center justify-center mb-4">
            <UploadCloud className="h-7 w-7 text-brand" />
          </div>
          <p className="font-medium">Drop your file here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">PDF · DOCX · Max 10MB</p>
        </motion.div>
      </div>

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-lg border bg-card p-4"
        >
          <FileText className="h-5 w-5 text-brand" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <div className="flex justify-end gap-2">
        <Link to="/dashboard"><Button variant="outline">Cancel</Button></Link>
        <Button
          disabled={!file || mutation.isPending}
          onClick={() => file && mutation.mutate(file)}
          className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-md shadow-brand/25 min-w-[220px]"
        >
          {mutation.isPending ? (
            <>Uploading <DotLoader className="ml-1" /></>
          ) : (
            "Scan document (1 credit)"
          )}
        </Button>
      </div>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand" /> Out of credits
            </DialogTitle>
            <DialogDescription>
              You've used all your scan credits. Purchase a plan to keep scanning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Later</Button>
            <Link to="/billing"><Button className="bg-brand text-brand-foreground hover:bg-brand/90">See plans</Button></Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
