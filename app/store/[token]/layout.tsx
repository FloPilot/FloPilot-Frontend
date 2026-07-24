import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Store",
  description: "Order branded apparel from your print shop.",
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-white text-[#303030]">
      {children}
    </div>
  );
}
