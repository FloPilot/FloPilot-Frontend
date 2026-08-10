/** Join brand + product without duplicating when productName already starts with brand. */
export function formatBrandProductName(
  brand?: string | null,
  productName?: string | null
): string {
  const brandText = brand?.trim() || "";
  const productText = productName?.trim() || "";
  if (!brandText) return productText;
  if (!productText) return brandText;
  if (productText.toLowerCase().startsWith(brandText.toLowerCase())) {
    return productText;
  }
  return `${brandText} ${productText}`;
}
