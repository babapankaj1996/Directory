"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Globe, Image as ImageIcon, LineChart, Loader2, Search, Share2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { getApiBase } from "@/lib/profiles";

/**
 * Site-wide settings an operator can change without a deploy: identity, search
 * metadata, the favicon and share image, social profiles, analytics and
 * verification tokens, plus the homepage switches.
 */
type SiteSettings = {
  siteName: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  faviconUrl: string;
  ogImageUrl: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  social: { twitter: string; facebook: string; instagram: string; linkedin: string; youtube: string };
  analytics: { googleAnalyticsId: string; googleSiteVerification: string; bingSiteVerification: string };
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroCtaLabel: string;
    featuredLimit: number;
    showTrending: boolean;
    showCategories: boolean;
  };
  seo: { titleTemplate: string; robotsIndex: boolean; canonicalHost: string };
};

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-copper-600"
      />
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition-colors focus:border-copper-600"
      />
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 cursor-pointer accent-copper-600" />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Globe; title: string; description: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-6 md:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-copper-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5">{children}</div>
    </GlassCard>
  );
}

export function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${getApiBase()}/api/admin/site-settings`, { credentials: "include" })
      .then((response) => readApiJson<{ data?: SiteSettings; error?: string }>(response, "settings"))
      .then((payload) => {
        if (!active) return;
        if (payload.data) setSettings(payload.data);
        else setStatus(payload.error || "Could not load settings.");
      })
      .catch((error) => active && setStatus(error instanceof Error ? error.message : "Could not load settings."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const patch = useCallback(<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`${getApiBase()}/api/admin/site-settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = await readApiJson<{ data?: SiteSettings; message?: string; error?: string }>(response, "settings");
      if (!response.ok) throw new Error(payload.error || "Could not save settings.");
      if (payload.data) setSettings(payload.data);
      setStatus(payload.message || "Settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!settings) {
    return <div className="rounded-2xl border border-line bg-surface p-8 text-sm text-muted">{status || "Settings unavailable."}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <Section icon={Globe} title="Site identity" description="The name and tagline used across the site, emails and structured data.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Site name" value={settings.siteName} onChange={(v) => patch("siteName", v)} maxLength={80} />
          <Field label="Tagline" value={settings.tagline} onChange={(v) => patch("tagline", v)} maxLength={200} />
          <Field label="Contact email" type="email" value={settings.contactEmail} onChange={(v) => patch("contactEmail", v)} hint="Shown on the contact page and used for data requests." />
          <Field label="Contact phone" value={settings.contactPhone} onChange={(v) => patch("contactPhone", v)} placeholder="Optional" />
        </div>
        <Field label="Business address" value={settings.addressLine} onChange={(v) => patch("addressLine", v)} placeholder="Optional — appears in structured data" />
      </Section>

      <Section icon={Search} title="Search engine listing" description="How the homepage appears in Google results. Aim for a title under 60 characters and a description under 160.">
        <Field label="Meta title" value={settings.metaTitle} onChange={(v) => patch("metaTitle", v)} maxLength={200} hint={`${settings.metaTitle.length} characters`} />
        <TextArea label="Meta description" value={settings.metaDescription} onChange={(v) => patch("metaDescription", v)} maxLength={400} hint={`${settings.metaDescription.length} characters`} />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title template" value={settings.seo.titleTemplate} onChange={(v) => patch("seo", { ...settings.seo, titleTemplate: v })} hint="%s is replaced by each page's own title." />
          <Field label="Canonical host" value={settings.seo.canonicalHost} onChange={(v) => patch("seo", { ...settings.seo, canonicalHost: v })} placeholder="https://profinr.com" />
        </div>
        <Toggle
          label="Allow search engines to index this site"
          hint="Turning this off adds a site-wide noindex. Use only for a staging environment — it removes the site from Google."
          value={settings.seo.robotsIndex}
          onChange={(v) => patch("seo", { ...settings.seo, robotsIndex: v })}
        />
      </Section>

      <Section icon={ImageIcon} title="Favicon and share image" description="The browser tab icon, and the image shown when a link is posted to WhatsApp, Facebook or X.">
        <Field label="Favicon URL" value={settings.faviconUrl} onChange={(v) => patch("faviconUrl", v)} placeholder="/favicon.svg" hint="Leave blank to use the built-in icon. A square SVG or PNG works best." />
        <Field label="Share image URL" value={settings.ogImageUrl} onChange={(v) => patch("ogImageUrl", v)} placeholder="Leave blank to use the generated image" hint="1200×630 pixels. Blank uses the automatically generated share image." />
        <Field label="Logo URL" value={settings.logoUrl} onChange={(v) => patch("logoUrl", v)} placeholder="Optional" />
      </Section>

      <Section icon={Share2} title="Social profiles" description="Linked in the footer and published as structured data so search engines connect them to your brand.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Twitter / X" value={settings.social.twitter} onChange={(v) => patch("social", { ...settings.social, twitter: v })} placeholder="https://x.com/…" />
          <Field label="Facebook" value={settings.social.facebook} onChange={(v) => patch("social", { ...settings.social, facebook: v })} placeholder="https://facebook.com/…" />
          <Field label="Instagram" value={settings.social.instagram} onChange={(v) => patch("social", { ...settings.social, instagram: v })} placeholder="https://instagram.com/…" />
          <Field label="LinkedIn" value={settings.social.linkedin} onChange={(v) => patch("social", { ...settings.social, linkedin: v })} placeholder="https://linkedin.com/company/…" />
          <Field label="YouTube" value={settings.social.youtube} onChange={(v) => patch("social", { ...settings.social, youtube: v })} placeholder="https://youtube.com/@…" />
        </div>
      </Section>

      <Section icon={LineChart} title="Analytics and verification" description="Measurement and search-console ownership tokens. These are injected into every page.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Google Analytics ID" value={settings.analytics.googleAnalyticsId} onChange={(v) => patch("analytics", { ...settings.analytics, googleAnalyticsId: v })} placeholder="G-XXXXXXXXXX" />
          <Field label="Google site verification" value={settings.analytics.googleSiteVerification} onChange={(v) => patch("analytics", { ...settings.analytics, googleSiteVerification: v })} hint="The content value from Search Console's HTML tag method." />
          <Field label="Bing site verification" value={settings.analytics.bingSiteVerification} onChange={(v) => patch("analytics", { ...settings.analytics, bingSiteVerification: v })} />
        </div>
      </Section>

      <Section icon={Globe} title="Homepage" description="Content and sections shown on the front page.">
        <Field label="Hero headline" value={settings.homepage.heroTitle} onChange={(v) => patch("homepage", { ...settings.homepage, heroTitle: v })} placeholder="Leave blank to use the built-in headline" />
        <TextArea label="Hero subtitle" value={settings.homepage.heroSubtitle} onChange={(v) => patch("homepage", { ...settings.homepage, heroSubtitle: v })} rows={2} placeholder="Leave blank to use the built-in text" />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Hero button label" value={settings.homepage.heroCtaLabel} onChange={(v) => patch("homepage", { ...settings.homepage, heroCtaLabel: v })} placeholder="Browse providers" />
          <Field
            label="Featured listings shown"
            type="number"
            value={String(settings.homepage.featuredLimit)}
            onChange={(v) => patch("homepage", { ...settings.homepage, featuredLimit: Number(v) || 6 })}
            hint="Between 1 and 24."
          />
        </div>
        <Toggle label="Show trending section" value={settings.homepage.showTrending} onChange={(v) => patch("homepage", { ...settings.homepage, showTrending: v })} />
        <Toggle label="Show categories section" value={settings.homepage.showCategories} onChange={(v) => patch("homepage", { ...settings.homepage, showCategories: v })} />
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur">
        <Button type="submit" variant="gold" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {status ? (
          <p className={`flex items-center gap-2 text-sm font-semibold ${status.includes("saved") ? "text-moss-700" : "text-copper-700"}`}>
            {status.includes("saved") ? <Check className="h-4 w-4" /> : null}
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}
