import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ScanStatus = null | "queued" | "processing" | "completed" | "failed";

export interface DocumentDetail {
  id: string;
  original_file_name: string;
  file_type: string;
  extracted_text?: string;
  ai_scan_status: ScanStatus;
  plagiarism_scan_status: ScanStatus;
  ai_result: null | {
    ai_score: number;
    summary: string;
    heuristics: Record<string, number>;
  };
  plagiarism_result: null | {
    plagiarism_score: number;
    summary: string;
    matched_sources: Array<{
      url: string;
      title: string;
      matched_text: string;
      original_text: string;
      similarity_score: number;
      chunk_index: number;
    }>;
    chunks: Array<{
      index: number;
      text: string;
      plagiarism_score: number;
      ai_score: number;
      sources: Array<{ url: string; title: string; similarity: number }>;
    }>;
  };
  integrity_flags: Array<{ type: string; description: string }>;
  metadata: {
    file_size: number;
    page_count: number;
    character_count: number;
    token_count: number;
  };
  grade: number | null;
  feedback: string | null;
  scanned_at: string | null;
  created_at: string;
}

const isTerminal = (s: ScanStatus) => s === "completed" || s === "failed";

export function useDocumentPolling(documentId: string | undefined) {
  return useQuery({
    queryKey: ["document", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data } = await api.get<DocumentDetail>(`/documents/${documentId}`);
      return data;
    },
    refetchInterval: (q) => {
      const d = q.state.data as DocumentDetail | undefined;
      if (!d) return 5000;
      if (isTerminal(d.ai_scan_status) && isTerminal(d.plagiarism_scan_status)) return false;
      return 5000;
    },
  });
}
