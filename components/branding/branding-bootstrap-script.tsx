import Script from "next/script";
import { TENANT_BRANDING_BOOTSTRAP } from "@/lib/tenant-branding-cache";

export function BrandingBootstrapScript() {
  return (
    <Script
      id="flopilot-tenant-branding-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: TENANT_BRANDING_BOOTSTRAP }}
    />
  );
}
