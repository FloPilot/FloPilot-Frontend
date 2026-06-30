"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  X,
} from "lucide-react";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SHOP_CURRENCY_OPTIONS,
  type CompanyAddress,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

type CompanyDraft = {
  shopName: string;
  email: string;
  phone: string;
  description: string;
  website: string;
  currency: string;
  taxId: string;
  address: CompanyAddress;
};

function formatAddress(address: CompanyAddress): string[] {
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ")
    .replace(/, (\d)/, " $1");
  return [address.line1, address.line2, cityLine, address.country].filter(
    Boolean
  );
}

function InfoValue({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-[#303030]">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#8a8a8a]" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function CompanyInformationSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const profile = settings.companyProfile;

  const initial: CompanyDraft = {
    shopName: settings.shopName,
    email: settings.email,
    phone: settings.phone,
    description: profile.description,
    website: profile.website,
    currency: profile.currency,
    taxId: profile.taxId,
    address: { ...profile.address },
  };

  const { draft, setDraft, dirty } = useSectionDraft(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressLines = formatAddress(profile.address);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        shopName: draft.shopName.trim() || settings.shopName,
        email: draft.email,
        phone: draft.phone,
        companyProfile: {
          ...profile,
          description: draft.description,
          website: draft.website,
          currency: draft.currency,
          taxId: draft.taxId,
          address: draft.address,
        },
      });
      setSaved(true);
      setEditing(false);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save company info");
    } finally {
      setSaving(false);
    }
  };

  const setAddr = (key: keyof CompanyAddress, value: string) =>
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));

  return (
    <SettingsMain>
      <SettingsHeader
        title="Company information"
        description="The business details shown on quotes, invoices, and customer communications."
      />

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel
        title="Company information"
        description={
          editing ? undefined : "How your shop appears across the workspace."
        }
        action={
          editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setDraft(initial);
                  setEditing(false);
                  setError(null);
                }}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <SaveButton
                dirty={dirty}
                saving={saving}
                saved={saved}
                disabled={!isAdmin}
                onSave={() => void handleSave()}
              />
            </>
          ) : (
            <Button
              size="sm"
              disabled={!isAdmin}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
              Edit information
            </Button>
          )
        }
      >
        {editing ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={draft.shopName}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, shopName: e.target.value }))
                  }
                  placeholder="Your shop name"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-description">Description</Label>
                <Textarea
                  id="company-description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, description: e.target.value }))
                  }
                  placeholder="A short description of your shop"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                Contact
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={draft.email}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, email: e.target.value }))
                    }
                    placeholder="hello@yourshop.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input
                    id="company-phone"
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, phone: e.target.value }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={draft.website}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, website: e.target.value }))
                    }
                    placeholder="https://yourshop.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                Address
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addr-line1">Street address</Label>
                  <Input
                    id="addr-line1"
                    value={draft.address.line1}
                    onChange={(e) => setAddr("line1", e.target.value)}
                    placeholder="123 Main St."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addr-line2">Suite / unit (optional)</Label>
                  <Input
                    id="addr-line2"
                    value={draft.address.line2}
                    onChange={(e) => setAddr("line2", e.target.value)}
                    placeholder="Suite 200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr-city">City</Label>
                  <Input
                    id="addr-city"
                    value={draft.address.city}
                    onChange={(e) => setAddr("city", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="addr-state">State / province</Label>
                    <Input
                      id="addr-state"
                      value={draft.address.state}
                      onChange={(e) => setAddr("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr-zip">Postal code</Label>
                    <Input
                      id="addr-zip"
                      value={draft.address.postalCode}
                      onChange={(e) => setAddr("postalCode", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addr-country">Country</Label>
                  <Input
                    id="addr-country"
                    value={draft.address.country}
                    onChange={(e) => setAddr("country", e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                Billing
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-currency">Currency</Label>
                  <Select
                    value={draft.currency}
                    onValueChange={(value) =>
                      setDraft((c) => ({ ...c, currency: value ?? c.currency }))
                    }
                  >
                    <SelectTrigger id="company-currency" className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-taxid">Tax ID</Label>
                  <Input
                    id="company-taxid"
                    value={draft.taxId}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, taxId: e.target.value }))
                    }
                    placeholder="e.g. 12-3456789"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3 sm:divide-x sm:divide-[#ebebeb]">
            <div className="space-y-3 sm:pr-6">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#fafafa]">
                {settings.branding.logoUrl ? (
                  <Image
                    src={settings.branding.logoUrl}
                    alt="Company logo"
                    width={64}
                    height={64}
                    unoptimized
                    className="size-full object-contain p-1.5"
                  />
                ) : (
                  <Building2 className="size-6 text-[#b0b0b0]" />
                )}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#303030]">
                  {settings.shopName || "Your shop"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
                  {profile.description || "No description added yet."}
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                Contact information
              </p>
              <InfoValue icon={Phone}>
                {settings.phone || <span className="text-[#b0b0b0]">No phone</span>}
              </InfoValue>
              <InfoValue icon={Mail}>
                {settings.email || <span className="text-[#b0b0b0]">No email</span>}
              </InfoValue>
              <InfoValue icon={Globe}>
                {profile.website || (
                  <span className="text-[#b0b0b0]">No website</span>
                )}
              </InfoValue>
            </div>

            <div className="space-y-3 sm:pl-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                Address
              </p>
              <InfoValue icon={MapPin}>
                {addressLines.length > 0 ? (
                  <span className="space-y-0.5">
                    {addressLines.map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[#b0b0b0]">No address added</span>
                )}
              </InfoValue>
              <div className="space-y-2 pt-1">
                <InfoValue icon={Receipt}>
                  Currency: <span className="font-medium">{profile.currency}</span>
                </InfoValue>
                <InfoValue icon={Receipt}>
                  Tax ID:{" "}
                  {profile.taxId || (
                    <span className="text-[#b0b0b0]">Not set</span>
                  )}
                </InfoValue>
              </div>
            </div>
          </div>
        )}
      </SettingsPanel>

      <p className={cn("px-1 text-[12px] text-[#8a8a8a]")}>
        Looking to change your logo or brand color?{" "}
        <a className="font-medium text-brand-primary" href="/app/settings/appearance">
          Go to Branding &amp; logo
        </a>
        .
      </p>
    </SettingsMain>
  );
}
