export function getProductImageUrl(p?: any) {
  if (!p) return undefined;
  return (
    p.primaryImageUrl ||
    p.images?.[0]?.url ||
    p.imageUrl ||
    undefined
  );
}
