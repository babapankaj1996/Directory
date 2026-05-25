"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, IndianRupee, ListChecks, Plus, Sparkles } from "lucide-react";
import { getCategoryProfileConfig, type PricingMode } from "@/lib/category-profile-config";

function toLines(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function appendUnique(value: string, item: string) {
  const lines = toLines(value);
  if (!item.trim() || lines.some((line) => line.toLowerCase() === item.trim().toLowerCase())) return value;
  return [...lines, item.trim()].join("\n");
}

function formatPricing(mode: PricingMode, currency: string, amount: string, item: string) {
  const cleanItem = item.trim();
  const cleanAmount = amount.trim();
  if (!cleanItem) return "";
  if (mode.value === "free") return `${cleanItem}: free estimate`;
  if (!cleanAmount) return cleanItem;
  if (mode.value === "commission") return `${cleanItem}: ${cleanAmount}% ${mode.suffix}`;
  return `${cleanItem}: ${currency.trim() || "INR"} ${cleanAmount} ${mode.suffix}`;
}

export function CategoryProfileAssist({
  categorySlug,
  services,
  pricing,
  businessHours,
  onServicesChange,
  onPricingChange,
  onBusinessHoursChange
}: {
  categorySlug: string;
  services: string;
  pricing: string;
  businessHours: string;
  onServicesChange: (value: string) => void;
  onPricingChange: (value: string) => void;
  onBusinessHoursChange: (value: string) => void;
}) {
  const config = useMemo(() => getCategoryProfileConfig(categorySlug), [categorySlug]);
  const [priceMode, setPriceMode] = useState(config.pricingModes[0]?.value || "fixed");
  const [currency, setCurrency] = useState(config.defaultCurrency);
  const [priceItem, setPriceItem] = useState(config.pricingItemPlaceholder);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setPriceMode(config.pricingModes[0]?.value || "fixed");
    setCurrency(config.defaultCurrency);
    setPriceItem(config.pricingItemPlaceholder);
  }, [config]);

  const selectedMode = config.pricingModes.find((mode) => mode.value === priceMode) || config.pricingModes[0];
  const serviceLines = useMemo(() => toLines(services), [services]);

  function addService(service: string) {
    onServicesChange(appendUnique(services, service));
  }

  function addPricing() {
    const line = selectedMode ? formatPricing(selectedMode, currency, amount, priceItem) : "";
    if (line) onPricingChange(appendUnique(pricing, line));
  }

  return (
    <div className="md:col-span-2 space-y-4">
      <div className="rounded-[1.35rem] bg-cloud p-4 ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{config.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{config.guidance}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ListChecks className="h-4 w-4 text-champagne" /> {config.serviceLabel}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.serviceSuggestions.map((service) => {
            const active = serviceLines.some((line) => line.toLowerCase() === service.toLowerCase());
            return (
              <button
                key={service}
                type="button"
                onClick={() => addService(service)}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  active ? "bg-ink text-white" : "bg-cloud text-ink ring-1 ring-slate-200 hover:bg-white"
                }`}
              >
                {active ? "Added" : "Add"} {service}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IndianRupee className="h-4 w-4 text-champagne" /> {config.pricingLabel}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.7fr_auto]">
          <input
            value={priceItem}
            onChange={(event) => setPriceItem(event.target.value)}
            placeholder={config.pricingItemPlaceholder}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
          />
          <select
            value={priceMode}
            onChange={(event) => setPriceMode(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
          >
            {config.pricingModes.map((mode) => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={selectedMode?.amountLabel || "Amount"}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
          />
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            placeholder="INR"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
          />
          <button
            type="button"
            onClick={addPricing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Clock3 className="h-4 w-4 text-champagne" /> Timing presets
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.hoursPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onBusinessHoursChange(preset.lines.join("\n"))}
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                businessHours.trim() === preset.lines.join("\n") ? "bg-ink text-white" : "bg-cloud text-ink ring-1 ring-slate-200 hover:bg-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

