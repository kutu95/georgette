const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export type SourceDocumentRecord = {
  fileId: string;
  sourceId: string | null;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  documentKind: string;
  pageNumber: number | null;
  sortOrder: number;
  groupLabel: string | null;
  parentFileId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CombinedOcrResult = {
  sourceId: string;
  text: string;
  pageCount: number;
  pageFileIds: string[];
};

export type SourceDocumentUploadMeta = {
  documentKind?: string;
  pageNumber?: number;
  sortOrder?: number;
  groupLabel?: string;
  notes?: string;
};

export type MatchMethod = "filename" | "content" | "source_id";

export type DocumentMatchCandidate = {
  sourceId: string;
  sourceLabel: string;
  fileId?: string;
  fileName?: string;
  documentKind?: string;
  pageNumber?: number | null;
  score: number;
  method: MatchMethod;
  reason: string;
};

export type DocumentMatchStatus = "confident" | "ambiguous" | "unmatched";

export type ExistingDocumentMatch = {
  fileId: string;
  sourceId: string;
  sourceLabel: string;
  fileName: string | null;
  documentKind: string;
  pageNumber: number | null;
  matchType: "filename" | "content" | "both";
  reason: string;
};

export type DocumentMatchResult = {
  fileName: string;
  mimeType: string;
  inferredKind: string;
  inferredPageNumber: number | null;
  existingDocuments: ExistingDocumentMatch[];
  status: DocumentMatchStatus;
  candidates: DocumentMatchCandidate[];
  recommended: DocumentMatchCandidate | null;
  contentMatchingAvailable: boolean;
  contentPreview: string | null;
};

export type SmartDocumentUploadMeta = SourceDocumentUploadMeta & {
  sourceId: string;
  overwriteFileId?: string;
};

export class SmartDocumentUploadError extends Error {
  existingDocuments: ExistingDocumentMatch[];

  constructor(message: string, existingDocuments: ExistingDocumentMatch[]) {
    super(message);
    this.name = "SmartDocumentUploadError";
    this.existingDocuments = existingDocuments;
  }
}

export type SourceRecord = {
  sourceId: string;
  currentFileName: string | null;
  suggestedStandardFileName: string | null;
  documentType: string | null;
  category: string | null;
  originalOrDerived: string | null;
  importance: string | null;
  notes: string | null;
  parentSourceId: string | null;
  sourceLevel: number | null;
  createdAt: string;
  updatedAt: string;
  parent?: { sourceId: string; currentFileName: string | null } | null;
  children?: { sourceId: string; currentFileName: string | null }[];
};

export type SourceSearchParams = {
  q?: string;
  category?: string;
  importance?: string;
  originalOrDerived?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type SourceSearchResult = {
  items: SourceRecord[];
  total: number;
  filtered: number;
};

export type SourceFilterOptions = {
  categories: string[];
  importances: string[];
  originalOrDerived: string[];
};

export type ClaimRecord = {
  claimId: string;
  claimText: string;
  topic: string | null;
  claimTier: string;
  status: string;
  confidence: string;
  evidenceRequirements: string | null;
  researchQuestions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceLinkRecord = {
  evidenceId: string;
  claimId: string;
  sourceId: string;
  relationship: string;
  pageOrFolio: string | null;
  quote: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  claim?: {
    claimId: string;
    claimText: string;
    status: string;
    confidence: string;
  };
  source?: {
    sourceId: string;
    currentFileName: string | null;
    suggestedStandardFileName: string | null;
    category: string | null;
    importance: string | null;
    documentType: string | null;
  };
};

export type EvidenceSearchParams = {
  relationship?: string;
  sourceCategory?: string;
  sourceImportance?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type EvidenceSearchResult = {
  items: EvidenceLinkRecord[];
  total: number;
  filtered: number;
};

export type EvidenceFilterOptions = {
  relationships: string[];
  sourceCategories: string[];
  sourceImportances: string[];
};

export type ObservationRecord = {
  observationId: string;
  sourceId: string;
  observationText: string;
  pageOrFolio: string | null;
  quote: string | null;
  notes: string | null;
  confidence: string;
  createdAt: string;
  updatedAt: string;
  source?: {
    sourceId: string;
    currentFileName: string | null;
    suggestedStandardFileName: string | null;
    category: string | null;
    importance: string | null;
    documentType: string | null;
    originalOrDerived?: string | null;
  };
  claimLinks?: ObservationClaimLinkRecord[];
};

export type ObservationClaimLinkRecord = {
  linkId: string;
  observationId: string;
  claimId: string;
  relationshipType: string;
  createdAt: string;
  updatedAt: string;
  claim?: {
    claimId: string;
    claimText: string;
    status: string;
    confidence: string;
    claimTier?: string;
  };
  observation?: ObservationRecord;
};

export type ShipFeatureRecord = {
  featureId: string;
  featureName: string;
  category: string;
  description: string | null;
  status: string;
  confidence: string;
  visualImpact: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  observationLinks?: ObservationShipFeatureLinkRecord[];
};

export type ObservationShipFeatureLinkRecord = {
  linkId: string;
  observationId: string;
  featureId: string;
  relationshipType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  feature?: {
    featureId: string;
    featureName: string;
    status: string;
    confidence: string;
    visualImpact: string;
    category: string;
  };
  observation?: ObservationRecord;
};

export type ShipFeatureSearchParams = {
  q?: string;
  category?: string;
  status?: string;
  confidence?: string;
  visualImpact?: string;
  withoutEvidence?: string;
};

export type ShipFeatureSearchResult = {
  items: ShipFeatureRecord[];
  total: number;
  filtered: number;
};

export type ObservationSearchParams = {
  q?: string;
  sourceId?: string;
  confidence?: string;
  unlinked?: string;
  excludeClaimId?: string;
  excludeFeatureId?: string;
};

export type ObservationSearchResult = {
  items: ObservationRecord[];
  total: number;
  filtered: number;
};

export type Stats = {
  sources: number;
  claims: number;
  evidenceLinks: number;
  observations: number;
  people: number;
  places: number;
  events: number;
  contradictions: number;
  topCategories: { name: string; count: number }[];
  tier1: {
    total: number;
    supported: number;
    underInvestigation: number;
    unresolved: number;
  };
  observationsQuality: {
    total: number;
    withoutClaims: number;
    claimsWithoutObservations: number;
  };
  shipReconstruction: {
    total: number;
    confirmed: number;
    probable: number;
    possible: number;
    rejected: number;
    criticalVisual: number;
    criticalWithoutEvidence: number;
  };
  warnings?: string[];
};

export type ClaimSearchParams = {
  q?: string;
  status?: string;
  topic?: string;
  tier?: string;
  confidence?: string;
};

export type ClaimSearchResult = {
  items: ClaimRecord[];
  total: number;
  filtered: number;
};

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function sourceToQuery(params: SourceSearchParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.importance) search.set("importance", params.importance);
  if (params.originalOrDerived) search.set("original_or_derived", params.originalOrDerived);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function evidenceToQuery(params: EvidenceSearchParams): string {
  return toQuery({
    relationship: params.relationship,
    sourceCategory: params.sourceCategory,
    sourceImportance: params.sourceImportance,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
}

export const api = {
  list: <T>(resource: string) => request<T[]>(`/${resource}`),
  get: <T>(resource: string, id: string) => request<T>(`/${resource}/${id}`),
  create: <T>(resource: string, body: unknown) =>
    request<T>(`/${resource}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T>(resource: string, id: string, body: unknown) =>
    request<T>(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (resource: string, id: string) =>
    request<void>(`/${resource}/${id}`, { method: "DELETE" }),
  searchSources: (params: SourceSearchParams = {}) =>
    request<SourceSearchResult>(`/sources${sourceToQuery(params)}`),
  searchSourcesAutocomplete: (q: string, limit = 20) =>
    request<{ items: SourceRecord[] }>(
      `/sources/search${toQuery({ q, limit: String(limit) })}`,
    ),
  getSource: (id: string) => request<SourceRecord>(`/sources/${encodeURIComponent(id)}`),
  getSourceReferencedBy: (id: string) =>
    request<EvidenceLinkRecord[]>(`/sources/${encodeURIComponent(id)}/referenced-by`),
  getSourceFilterOptions: () => request<SourceFilterOptions>("/sources/meta/filters"),
  searchClaimsList: (params: ClaimSearchParams = {}) =>
    request<ClaimSearchResult>(`/claims${toQuery(params)}`),
  searchClaims: (q: string, limit = 20) =>
    request<{ items: ClaimRecord[] }>(`/claims/search${toQuery({ q, limit: String(limit) })}`),
  getClaim: (id: string) => request<ClaimRecord>(`/claims/${encodeURIComponent(id)}`),
  getClaimEvidence: (id: string) =>
    request<EvidenceLinkRecord[]>(`/claims/${encodeURIComponent(id)}/evidence`),
  getClaimObservations: (id: string) =>
    request<ObservationClaimLinkRecord[]>(
      `/claims/${encodeURIComponent(id)}/observations`,
    ),
  searchObservations: (params: ObservationSearchParams = {}) =>
    request<ObservationSearchResult>(`/observations${toQuery(params)}`),
  getObservation: (id: string) =>
    request<ObservationRecord>(`/observations/${encodeURIComponent(id)}`),
  getSourceObservations: (id: string) =>
    request<ObservationRecord[]>(`/sources/${encodeURIComponent(id)}/observations`),
  getSourceDocuments: (id: string) =>
    request<SourceDocumentRecord[]>(`/sources/${encodeURIComponent(id)}/documents`),
  getSourceCombinedOcr: (sourceId: string) =>
    request<CombinedOcrResult>(`/sources/${encodeURIComponent(sourceId)}/documents/combined-ocr`),
  uploadSourceDocument: async (
    sourceId: string,
    file: File,
    meta: SourceDocumentUploadMeta = {},
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (meta.documentKind) form.append("documentKind", meta.documentKind);
    if (meta.pageNumber != null) form.append("pageNumber", String(meta.pageNumber));
    if (meta.sortOrder != null) form.append("sortOrder", String(meta.sortOrder));
    if (meta.groupLabel) form.append("groupLabel", meta.groupLabel);
    if (meta.notes) form.append("notes", meta.notes);
    const res = await fetch(`${API_BASE}/sources/${encodeURIComponent(sourceId)}/documents`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data as SourceDocumentRecord;
  },
  uploadSourceDocumentBatch: async (
    sourceId: string,
    files: File[],
    meta: SourceDocumentUploadMeta = {},
  ) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    if (meta.documentKind) form.append("documentKind", meta.documentKind);
    if (meta.pageNumber != null) form.append("pageNumber", String(meta.pageNumber));
    if (meta.groupLabel) form.append("groupLabel", meta.groupLabel);
    if (meta.notes) form.append("notes", meta.notes);
    const res = await fetch(`${API_BASE}/sources/${encodeURIComponent(sourceId)}/documents/batch`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Batch upload failed");
    return data as { items: SourceDocumentRecord[] };
  },
  createSourceTextDocument: (
    sourceId: string,
    body: {
      text: string;
      fileName?: string;
      notes?: string;
      documentKind?: string;
      pageNumber?: number;
      groupLabel?: string;
    },
  ) =>
    request<SourceDocumentRecord>(`/sources/${encodeURIComponent(sourceId)}/documents`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeDocument: (fileId: string) =>
    request<void>(`/documents/${encodeURIComponent(fileId)}`, { method: "DELETE" }),
  documentContentUrl: (fileId: string, download = false) =>
    `${API_BASE}/documents/${encodeURIComponent(fileId)}/content${download ? "?download=1" : ""}`,
  analyzeSmartDocumentUpload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/documents/smart-upload/analyze`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Analysis failed");
    return data as DocumentMatchResult;
  },
  confirmSmartDocumentUpload: async (file: File, meta: SmartDocumentUploadMeta) => {
    const form = new FormData();
    form.append("file", file);
    form.append("sourceId", meta.sourceId);
    if (meta.documentKind) form.append("documentKind", meta.documentKind);
    if (meta.pageNumber != null) form.append("pageNumber", String(meta.pageNumber));
    if (meta.sortOrder != null) form.append("sortOrder", String(meta.sortOrder));
    if (meta.groupLabel) form.append("groupLabel", meta.groupLabel);
    if (meta.notes) form.append("notes", meta.notes);
    if (meta.overwriteFileId) form.append("overwriteFileId", meta.overwriteFileId);
    const res = await fetch(`${API_BASE}/documents/smart-upload/confirm`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (res.status === 409) {
      throw new SmartDocumentUploadError(
        data.error ?? "Document already exists",
        (data.existingDocuments ?? []) as ExistingDocumentMatch[],
      );
    }
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data as SourceDocumentRecord;
  },
  createObservationClaimLink: (
    observationId: string,
    body: { claimId: string; relationshipType?: string },
  ) =>
    request<ObservationClaimLinkRecord>(
      `/observations/${encodeURIComponent(observationId)}/claim-links`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  removeObservationClaimLink: (observationId: string, linkId: string) =>
    request<void>(
      `/observations/${encodeURIComponent(observationId)}/claim-links/${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    ),
  searchShipFeatures: (params: ShipFeatureSearchParams = {}) =>
    request<ShipFeatureSearchResult>(`/ship-features${toQuery(params)}`),
  getShipFeature: (id: string) =>
    request<ShipFeatureRecord>(`/ship-features/${encodeURIComponent(id)}`),
  getShipFeatureObservations: (id: string) =>
    request<ObservationShipFeatureLinkRecord[]>(
      `/ship-features/${encodeURIComponent(id)}/observations`,
    ),
  createShipFeatureObservationLink: (
    featureId: string,
    body: { observationId: string; relationshipType?: string; notes?: string },
  ) =>
    request<ObservationShipFeatureLinkRecord>(
      `/ship-features/${encodeURIComponent(featureId)}/observation-links`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  removeShipFeatureObservationLink: (featureId: string, linkId: string) =>
    request<void>(
      `/ship-features/${encodeURIComponent(featureId)}/observation-links/${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    ),
  searchEvidence: (params: EvidenceSearchParams = {}) =>
    request<EvidenceSearchResult>(`/evidence-links${evidenceToQuery(params)}`),
  getEvidenceFilterOptions: () => request<EvidenceFilterOptions>("/evidence-links/meta/filters"),
  getStats: () => request<Stats>("/stats"),
  importSources: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/import/sources`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Import failed");
    return data as {
      created: number;
      updated: number;
      errors: { row: number; error: string }[];
      total: number;
    };
  },
  entityLookup: (type: string) =>
    request<{ id: string; label: string }[]>(`/entities/${type}`),
};
