export type PhotoMetadata = {
  photographer: string | null;
  photoDate: string | null;
  photoLocation: string | null;
  copyrightHolder: string | null;
};

export type PhotoMetadataInput = {
  photographer?: string;
  photoDate?: string;
  photoLocation?: string;
  copyrightHolder?: string;
};

export function isPhotoDocument(
  documentKind: string,
  mimeType?: string | null,
): boolean {
  if (documentKind === "IMAGE" || documentKind === "ORIGINAL") return true;
  return Boolean(mimeType?.startsWith("image/"));
}

export function emptyPhotoMetadata(): PhotoMetadata {
  return {
    photographer: null,
    photoDate: null,
    photoLocation: null,
    copyrightHolder: null,
  };
}

export function photoMetadataFromRecord(
  record: Partial<PhotoMetadata> | null | undefined,
): PhotoMetadata {
  return {
    photographer: record?.photographer?.trim() || null,
    photoDate: record?.photoDate?.trim() || null,
    photoLocation: record?.photoLocation?.trim() || null,
    copyrightHolder: record?.copyrightHolder?.trim() || null,
  };
}

export function hasPhotoMetadata(meta: PhotoMetadata): boolean {
  return Boolean(
    meta.photographer || meta.photoDate || meta.photoLocation || meta.copyrightHolder,
  );
}

export function photoMetadataToPayload(input: PhotoMetadataInput): PhotoMetadataInput {
  const payload: PhotoMetadataInput = {};
  if (input.photographer?.trim()) payload.photographer = input.photographer.trim();
  if (input.photoDate?.trim()) payload.photoDate = input.photoDate.trim();
  if (input.photoLocation?.trim()) payload.photoLocation = input.photoLocation.trim();
  if (input.copyrightHolder?.trim()) payload.copyrightHolder = input.copyrightHolder.trim();
  return payload;
}
