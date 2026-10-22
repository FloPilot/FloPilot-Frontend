"use client";

import { useMemo } from "react";
import type { EstimateDocumentSettings } from "@/lib/estimate-document";
import {
  getEstimateLineItemSectionDef,
  isBlockAbsorbedByHeader,
} from "@/lib/estimate-document";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE_ROWS: Record<
  string,
  {
    title: string;
    garment: string;
    sizeBreak: string;
    qty: string;
    unit: string;
    total: string;
  }[]
> = {
  garments: [
    {
      title: "Blank",
      garment: "#64000 Softstyle Tee / Navy",
      sizeBreak: "S 12 · M 12 · L 12 · XL 12",
      qty: "48",
      unit: "$4.20",
      total: "$201.60",
    },
  ],
  decoration: [
    {
      title: "Screen print · Front",
      garment: "#64000 Softstyle Tee / Navy",
      sizeBreak: "S 12 · M 12 · L 12 · XL 12",
      qty: "48",
      unit: "$2.75",
      total: "$132.00",
    },
  ],
  setup: [
    {
      title: "Screen setup",
      garment: "2 screens",
      sizeBreak: "—",
      qty: "2",
      unit: "$25.00",
      total: "$50.00",
    },
  ],
  finishing: [
    {
      title: "Fold & bag",
      garment: "Per piece",
      sizeBreak: "—",
      qty: "48",
      unit: "$0.35",
      total: "$16.80",
    },
  ],
  other: [
    {
      title: "Rush fee",
      garment: "—",
      sizeBreak: "—",
      qty: "1",
      unit: "$75.00",
      total: "$75.00",
    },
  ],
};

function MetaBlock({
  align = "right",
  kind = "estimate",
}: {
  align?: "left" | "right";
  kind?: "estimate" | "invoice";
}) {
  const isInvoice = kind === "invoice";
  return (
    <div className={cn("shrink-0", align === "right" ? "text-right" : "text-left")}>
      <p className="text-[14px] font-bold leading-tight text-[#303030]">
        <span className="font-bold uppercase tracking-[0.04em] text-[#616161]">
          {isInvoice ? "Invoice" : "Estimate"}:{" "}
        </span>
        SO-1042
      </p>
      <p className="mt-1 text-[10px] text-[#616161]">
        {isInvoice ? (
          <>
            Order: SO-1042
            <br />
            Estimate: SO-1042
            <br />
          </>
        ) : (
          <>
            Customer PO / Job name: Blue Hoodie
            <br />
          </>
        )}
        Date: Mar 12, 2026
        <br />
        In hands: Mar 28, 2026
      </p>
    </div>
  );
}

export function EstimateDocumentPreview({
  document,
  shopName,
  email,
  phone,
  addressLines,
  primaryColor,
  logoUrl,
  kind = "estimate",
}: {
  document: EstimateDocumentSettings;
  shopName: string;
  email: string;
  phone: string;
  addressLines: string[];
  primaryColor: string;
  logoUrl?: string;
  kind?: "estimate" | "invoice";
}) {
  const accent = /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
    ? primaryColor
    : "#2762ff";
  const name = shopName || "Your Print Shop";
  const style = document.headerStyle || "classic";

  const lineItemPreview = useMemo(() => {
    return document.lineItemSections.flatMap((sectionId) => {
      const def = getEstimateLineItemSectionDef(sectionId);
      const rows = SAMPLE_ROWS[sectionId] || [];
      if (!def || rows.length === 0) return [];
      const subtotal = rows.reduce((sum, row) => {
        const n = Number(String(row.total).replace(/[^0-9.]/g, ""));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
      return [{ sectionId, label: def.label, rows, subtotal }];
    });
  }, [document.lineItemSections]);

  const renderedSubtotal = lineItemPreview.reduce(
    (sum, section) => sum + section.subtotal,
    0
  );
  const tax = renderedSubtotal * 0.08;
  const total = renderedSubtotal + tax;

  const contactBits = [
    logoUrl ? name : null,
    ...addressLines,
    email,
    phone,
  ].filter(Boolean);

  const renderHeader = () => {
    if (style === "compact") {
      return (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="mb-1 max-h-8 max-w-[120px] object-contain object-left"
              />
            ) : (
              <p className="text-[13px] font-bold tracking-tight">{name}</p>
            )}
            <p className="mt-1 text-[9px] leading-snug text-[#616161]">
              {[name, ...addressLines, email, phone]
                .filter(Boolean)
                .filter((line, i, arr) => arr.indexOf(line) === i)
                .join(" · ")}
            </p>
          </div>
          <MetaBlock kind={kind} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="mb-1 max-h-10 max-w-[140px] object-contain object-left"
              />
            ) : (
              <p className="text-[15px] font-bold tracking-tight">{name}</p>
            )}
            {(style === "classic" || style === "branded") &&
            contactBits.length > 0 ? (
              <div className="mt-1 text-[10px] leading-snug text-[#616161]">
                {contactBits.map((line) => (
                  <p key={String(line)}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>
          <MetaBlock kind={kind} />
        </div>

        {style === "split_parties" ? (
          <div className="grid grid-cols-2 gap-4 border-t border-[#ebebeb] pt-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#616161]">
                From
              </p>
              <p className="mt-1 text-[11px] font-semibold">{name}</p>
              <div className="mt-0.5 text-[10px] text-[#616161]">
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {email ? <p>{email}</p> : null}
                {phone ? <p>{phone}</p> : null}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#616161]">
                Prepared for
              </p>
              <p className="mt-1 text-[11px] font-semibold">
                Northside Athletics
              </p>
              <p className="mt-0.5 text-[10px] text-[#616161]">
                Jordan Hale
                <br />
                Austin, TX
                <br />
                jordan@northside.com
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#ececee] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="overflow-hidden rounded-lg border border-[#d4d4d8] bg-white shadow-[0_16px_48px_rgba(26,26,26,0.1)]">
          <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
          <div className="space-y-5 px-6 py-6 text-[11px] leading-snug text-[#303030]">
            {document.blocks.map((blockId) => {
              if (isBlockAbsorbedByHeader(blockId, style)) return null;

              switch (blockId) {
                case "header":
                  return <div key={blockId}>{renderHeader()}</div>;
                case "shop_contact":
                  return (
                    <div key={blockId} className="text-[10px] text-[#616161]">
                      {contactBits.map((line) => (
                        <p key={String(line)}>{line}</p>
                      ))}
                    </div>
                  );
                case "bill_to":
                  return (
                    <div key={blockId} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-wide text-[#616161]">
                            Bill to
                          </p>
                          <p className="mt-0.5 text-[9px] leading-snug">
                            Northside Athletics
                            <br />
                            1200 Congress Ave
                            <br />
                            Austin, TX 78701
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-wide text-[#616161]">
                            Ship to
                          </p>
                          <p className="mt-0.5 text-[9px] leading-snug">
                            Northside Athletics
                            <br />
                            Warehouse B
                            <br />
                            Austin, TX 78701
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 grid grid-cols-4 gap-1 text-[7px] font-bold uppercase tracking-wide text-[#616161]">
                          <span>Ordered By</span>
                          <span>Phone</span>
                          <span>Fax</span>
                          <span>Email</span>
                        </div>
                        <div className="grid grid-cols-4 gap-0 overflow-hidden rounded-sm border border-[#d4d4d8] text-[9px]">
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            Jordan Hale
                          </span>
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            (512) 555-0142
                          </span>
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5 text-[#8a8a8a]">
                            —
                          </span>
                          <span className="px-1.5 py-1.5">
                            jordan@northside.com
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 grid grid-cols-5 gap-1 text-[7px] font-bold uppercase tracking-wide text-[#616161]">
                          <span>Customer #</span>
                          <span>PO Number</span>
                          <span>Terms</span>
                          <span>Salesperson</span>
                          <span>Ship Method</span>
                        </div>
                        <div className="grid grid-cols-5 gap-0 overflow-hidden rounded-sm border border-[#d4d4d8] text-[9px]">
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            935
                          </span>
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            PO-4784
                          </span>
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            Net 30
                          </span>
                          <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                            Amy Jurena
                          </span>
                          <span className="px-1.5 py-1.5">Pickup</span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 grid grid-cols-[0.9fr_2.2fr_0.9fr] gap-1 text-[7px] font-bold uppercase tracking-wide text-[#616161]">
                          <span>Design ID</span>
                          <span>Design Title</span>
                          <span>Type</span>
                        </div>
                        <div className="overflow-hidden rounded-sm border border-[#d4d4d8] text-[9px]">
                          <div className="grid grid-cols-[0.9fr_2.2fr_0.9fr] gap-0 border-b border-[#e8e8ea]">
                            <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                              11450
                            </span>
                            <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                              ALL IN - HOODIE BLACK
                            </span>
                            <span className="px-1.5 py-1.5">Screen</span>
                          </div>
                          <div className="grid grid-cols-[0.9fr_2.2fr_0.9fr] gap-0">
                            <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                              8355
                            </span>
                            <span className="border-r border-[#d4d4d8] px-1.5 py-1.5">
                              BLUFF INT LABEL
                            </span>
                            <span className="px-1.5 py-1.5">Neck</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                case "line_items":
                  return (
                    <div
                      key={blockId}
                      className="overflow-hidden rounded-md border border-[#ebebeb]"
                    >
                      <div className="grid grid-cols-[1.1fr_1.3fr_1.1fr_0.35fr_0.55fr_0.55fr] gap-1 bg-[#f4f4f5] px-2 py-1.5 text-[8px] font-bold uppercase tracking-wide text-[#616161]">
                        <span>Decoration</span>
                        <span>Garment</span>
                        <span>Size break</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Unit</span>
                        <span className="text-right">Total</span>
                      </div>
                      {lineItemPreview.length === 0 ? (
                        <p className="px-2 py-4 text-center text-[10px] text-[#8a8a8a]">
                          No line-item groups selected
                        </p>
                      ) : (
                        lineItemPreview.map((section) => (
                          <div key={section.sectionId}>
                            <div className="flex items-center justify-between bg-[#fafafa] px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-[#616161]">
                              <span>{section.label}</span>
                              <span>{formatCurrency(section.subtotal)}</span>
                            </div>
                            {section.rows.map((row) => (
                              <div
                                key={`${section.sectionId}-${row.title}`}
                                className="grid grid-cols-[1.1fr_1.3fr_1.1fr_0.35fr_0.55fr_0.55fr] gap-1 border-t border-[#f0f0f0] px-2 py-1.5"
                              >
                                <span className="font-semibold">{row.title}</span>
                                <span className="text-[#303030]">
                                  {row.garment || "—"}
                                </span>
                                <span className="text-[#616161]">
                                  {row.sizeBreak || "—"}
                                </span>
                                <span className="text-right">{row.qty}</span>
                                <span className="text-right">{row.unit}</span>
                                <span className="text-right font-semibold">
                                  {row.total}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  );
                case "totals":
                  return (
                    <div key={blockId} className="ml-auto w-[55%] space-y-1.5">
                      <div className="flex justify-between text-[#616161]">
                        <span>Subtotal</span>
                        <span>{formatCurrency(renderedSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#616161]">
                        <span>Tax (8%)</span>
                        <span>{formatCurrency(tax)}</span>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ backgroundColor: accent }}
                      />
                      <div
                        className="flex justify-between text-[12px] font-bold"
                        style={{ color: accent }}
                      >
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      {document.showPaidBalance ? (
                        <div className="flex justify-between text-[#616161]">
                          <span>Balance due</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                case "terms":
                  return (
                    <p
                      key={blockId}
                      className="border-t border-[#ebebeb] pt-3 text-center text-[9px] leading-relaxed text-[#616161]"
                    >
                      {document.termsText}
                    </p>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-[#8a8a8a]">
        Live preview · sample numbers for layout only
      </p>
    </div>
  );
}
