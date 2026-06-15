export type FieldType = "text" | "textarea" | "number" | "select";

export type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  readOnlyOnEdit?: boolean;
};

export type EntityConfig = {
  resource: string;
  title: string;
  description: string;
  idField: string;
  fields: FieldConfig[];
  columns: { key: string; label: string }[];
};

export const RELATIONSHIP_TYPES = [
  "SUPPORTS",
  "CONTRADICTS",
  "QUALIFIES",
  "MENTIONS",
  "DERIVED_FROM",
  "AUTHOR_OF",
  "WITNESS_TO",
  "PARTICIPATED_IN",
  "RESCUED",
  "RESCUED_BY",
  "CAPTAIN_OF",
  "CREW_OF",
  "PASSENGER_ON",
  "OCCURRED_AT",
  "OCCURRED_BEFORE",
  "OCCURRED_AFTER",
  "ABOUT",
  "REFERENCED_IN",
  "LOCATED_AT",
  "PART_OF",
  "RELATED_TO",
] as const;

export const ENTITY_TYPES = [
  "SOURCE",
  "CLAIM",
  "PERSON",
  "PLACE",
  "EVENT",
  "CONTRADICTION",
  "MANUSCRIPT_REFERENCE",
  "TAG",
  "EVIDENCE_LINK",
  "FILE",
] as const;

export const sourceConfig: EntityConfig = {
  resource: "sources",
  title: "Sources",
  description: "Document files and archival sources — the foundation of evidence.",
  idField: "sourceId",
  columns: [
    { key: "sourceId", label: "ID" },
    { key: "currentFileName", label: "File Name" },
    { key: "documentType", label: "Type" },
    { key: "originalOrDerived", label: "Original/Derived" },
    { key: "importance", label: "Importance" },
  ],
  fields: [
    { key: "sourceId", label: "Source ID", required: true, readOnlyOnEdit: true },
    { key: "currentFileName", label: "Current File Name" },
    { key: "suggestedStandardFileName", label: "Suggested Standard Name" },
    { key: "documentType", label: "Document Type" },
    { key: "category", label: "Category" },
    {
      key: "originalOrDerived",
      label: "Original or Derived",
      type: "select",
      options: [
        { value: "original", label: "Original (primary)" },
        { value: "derived", label: "Derived" },
        { value: "ocr", label: "OCR" },
        { value: "transcription", label: "Transcription" },
        { value: "research notes", label: "Research Notes" },
        { value: "ai summary", label: "AI Summary" },
        { value: "manuscript draft", label: "Manuscript Draft" },
      ],
    },
    { key: "importance", label: "Importance" },
    { key: "parentSourceId", label: "Parent Source ID" },
    { key: "sourceLevel", label: "Source Level", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const claimConfig: EntityConfig = {
  resource: "claims",
  title: "Claims",
  description: "Historical claims — confidence belongs here, not on sources.",
  idField: "claimId",
  columns: [
    { key: "claimText", label: "Claim" },
    { key: "topic", label: "Topic" },
    { key: "status", label: "Status" },
    { key: "confidence", label: "Confidence" },
  ],
  fields: [
    { key: "claimText", label: "Claim Text", type: "textarea", required: true },
    { key: "topic", label: "Topic" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "ACTIVE", label: "Active" },
        { value: "DISPUTED", label: "Disputed" },
        { value: "SUPERSEDED", label: "Superseded" },
        { value: "ARCHIVED", label: "Archived" },
      ],
    },
    {
      key: "confidence",
      label: "Confidence",
      type: "select",
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High (requires primary source)" },
      ],
    },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const evidenceConfig: EntityConfig = {
  resource: "evidence-links",
  title: "Evidence Links",
  description: "Links claims to sources. A source may support one claim and contradict another.",
  idField: "evidenceId",
  columns: [
    { key: "claimId", label: "Claim" },
    { key: "sourceId", label: "Source" },
    { key: "relationship", label: "Relationship" },
    { key: "pageOrFolio", label: "Page/Folio" },
  ],
  fields: [
    { key: "claimId", label: "Claim ID", required: true },
    { key: "sourceId", label: "Source ID", required: true },
    {
      key: "relationship",
      label: "Relationship",
      type: "select",
      options: [
        { value: "SUPPORTS", label: "Supports" },
        { value: "CONTRADICTS", label: "Contradicts" },
        { value: "QUALIFIES", label: "Qualifies" },
        { value: "MENTIONS", label: "Mentions" },
      ],
    },
    { key: "pageOrFolio", label: "Page or Folio" },
    { key: "quote", label: "Quote", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const peopleConfig: EntityConfig = {
  resource: "people",
  title: "People",
  description: "Individuals connected to the Georgette story.",
  idField: "personId",
  columns: [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "birthDate", label: "Birth" },
    { key: "deathDate", label: "Death" },
  ],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "role", label: "Role" },
    { key: "birthDate", label: "Birth Date" },
    { key: "deathDate", label: "Death Date" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const placesConfig: EntityConfig = {
  resource: "places",
  title: "Places",
  description: "Geographic locations relevant to the research.",
  idField: "placeId",
  columns: [
    { key: "name", label: "Name" },
    { key: "placeType", label: "Type" },
    { key: "latitude", label: "Lat" },
    { key: "longitude", label: "Lng" },
  ],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "placeType", label: "Place Type" },
    { key: "latitude", label: "Latitude", type: "number" },
    { key: "longitude", label: "Longitude", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const eventsConfig: EntityConfig = {
  resource: "events",
  title: "Timeline Events",
  description: "Chronological events in the Georgette narrative.",
  idField: "eventId",
  columns: [
    { key: "title", label: "Title" },
    { key: "eventDate", label: "Date" },
    { key: "description", label: "Description" },
  ],
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "eventDate", label: "Event Date" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const contradictionsConfig: EntityConfig = {
  resource: "contradictions",
  title: "Contradictions",
  description: "Recorded tensions between claims. These records are preserved, not deleted.",
  idField: "contradictionId",
  columns: [
    { key: "claimAId", label: "Claim A" },
    { key: "claimBId", label: "Claim B" },
    { key: "status", label: "Status" },
    { key: "description", label: "Description" },
  ],
  fields: [
    { key: "claimAId", label: "Claim A ID", required: true },
    { key: "claimBId", label: "Claim B ID", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "status", label: "Status" },
    { key: "resolutionNotes", label: "Resolution Notes", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const manuscriptConfig: EntityConfig = {
  resource: "manuscript-references",
  title: "Manuscript References",
  description: "Pointers from manuscript text back to claims and sources.",
  idField: "manuscriptRefId",
  columns: [
    { key: "referenceText", label: "Reference" },
    { key: "manuscriptLocation", label: "Location" },
    { key: "page", label: "Page" },
    { key: "claimId", label: "Claim" },
  ],
  fields: [
    { key: "referenceText", label: "Reference Text", type: "textarea" },
    { key: "manuscriptLocation", label: "Manuscript Location" },
    { key: "page", label: "Page" },
    { key: "claimId", label: "Claim ID" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const tagsConfig: EntityConfig = {
  resource: "tags",
  title: "Tags",
  description: "Labels for organising entities across the database.",
  idField: "tagId",
  columns: [
    { key: "name", label: "Name" },
    { key: "color", label: "Color" },
  ],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "color", label: "Color" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const relationshipsConfig: EntityConfig = {
  resource: "relationships",
  title: "Relationships",
  description: "Graph-style links between any entities in the database.",
  idField: "relationshipId",
  columns: [
    { key: "fromEntityType", label: "From Type" },
    { key: "fromEntityId", label: "From ID" },
    { key: "relationshipType", label: "Type" },
    { key: "toEntityType", label: "To Type" },
    { key: "toEntityId", label: "To ID" },
  ],
  fields: [
    {
      key: "fromEntityType",
      label: "From Entity Type",
      type: "select",
      required: true,
      options: ENTITY_TYPES.map((t) => ({ value: t, label: t })),
    },
    { key: "fromEntityId", label: "From Entity ID", required: true },
    {
      key: "relationshipType",
      label: "Relationship Type",
      type: "select",
      required: true,
      options: RELATIONSHIP_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      key: "toEntityType",
      label: "To Entity Type",
      type: "select",
      required: true,
      options: ENTITY_TYPES.map((t) => ({ value: t, label: t })),
    },
    { key: "toEntityId", label: "To Entity ID", required: true },
    {
      key: "confidence",
      label: "Confidence",
      type: "select",
      options: [
        { value: "", label: "—" },
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
      ],
    },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};
