"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, BookmarkCheck, CheckCircle2, Clock3, CreditCard, Eye, FileText, Flame, Globe2, LockKeyhole, Megaphone, MessageCircle, MessageSquareText, Phone, Plus, Send, ShieldCheck, Star, Timer, TrendingUp, Wallet, XCircle } from "lucide-react";
import { authFetch, getCurrentUser } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile } from "@/lib/profiles";
import { activeFeaturedCampaign, featuredDaysRemaining, isFeaturedActive, isFeaturedExpired, type FeaturedPlacementRequest, type Listing } from "@/lib/data";
import { fallbackPlacementOptions, featuredPageTypeLabel, formatMoney, type FeaturedPlacementOption } from "@/lib/featured-placement";
import { effectiveVerificationStatus as resolveEffectiveVerificationStatus } from "@/lib/verification-status";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type InsightSummary = {
  PROFILE_VIEW: number;
  WHATSAPP_CLICK: number;
  PHONE_CLICK: number;
  WEBSITE_CLICK: number;
  CONTACT_CLICK: number;
  TOTAL_VIEW_COUNT: number;
  TOTAL_REVIEWS: number;
};

type ReviewerReview = {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  status: string;
  moderationNote?: string;
  createdAt: string;
  updatedAt: string;
  profile?: unknown;
};

type ProfileLead = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  whatsapp?: string | null;
  serviceNeeded?: string | null;
  budget?: string | null;
  timeline?: string | null;
  contactPreference?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  sourcePath?: string | null;
  leadScore?: number;
  leadQuality?: "HOT" | "WARM" | "COLD" | string;
  status: "NEW" | "CONTACTED" | "CONVERTED" | "LOST" | "SPAM" | string;
  responseAt?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  profile?: unknown;
};

type LeadQualitySummary = {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  avgScore: number;
  avgResponseMinutes: number | null;
  conversionRate: number;
  contactRate: number;
  viewToLeadRate: number;
  viewsPerLead: number | null;
};

type WalletSummary = {
  id: string;
  balance: number;
  heldBalance: number;
  availableBalance: number;
  currency: string;
};

type WalletTransactionSummary = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string | null;
  referenceType?: string | null;
  createdAt?: string;
};

type PaymentSettings = {
  mode: "WALLET" | "RAZORPAY" | "BOTH" | string;
  walletEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayConfigured: boolean;
  razorpayKeyId?: string;
  currency: string;
};

type FeaturedPaymentMethod = "WALLET" | "RAZORPAY";

type RazorpayCheckout = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

const emptyLeadQuality: LeadQualitySummary = {
  total: 0,
  hot: 0,
  warm: 0,
  cold: 0,
  avgScore: 0,
  avgResponseMinutes: null,
  conversionRate: 0,
  contactRate: 0,
  viewToLeadRate: 0,
  viewsPerLead: null
};

const emptyInsights: InsightSummary = {
  PROFILE_VIEW: 0,
  WHATSAPP_CLICK: 0,
  PHONE_CLICK: 0,
  WEBSITE_CLICK: 0,
  CONTACT_CLICK: 0,
  TOTAL_VIEW_COUNT: 0,
  TOTAL_REVIEWS: 0
};

function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function OwnerDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [insights, setInsights] = useState<InsightSummary>(emptyInsights);
  const [savedProfiles, setSavedProfiles] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<ReviewerReview[]>([]);
  const [leads, setLeads] = useState<ProfileLead[]>([]);
  const [leadQuality, setLeadQuality] = useState<LeadQualitySummary>(emptyLeadQuality);
  const [openVerificationId, setOpenVerificationId] = useState<string>("");
  const [featuredRequestNotice, setFeaturedRequestNotice] = useState("");
  const [featuredRequesting, setFeaturedRequesting] = useState(false);
  const [featuredRequestForm, setFeaturedRequestForm] = useState({ requestedDays: "7", requestedPage: "CITY_CATEGORY", placementKey: "" });
  const [featuredPaymentMethod, setFeaturedPaymentMethod] = useState<FeaturedPaymentMethod>("WALLET");
  const [featuredOptions, setFeaturedOptions] = useState<FeaturedPlacementOption[]>([]);
  const [featuredOptionsLoading, setFeaturedOptionsLoading] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionSummary[]>([]);
  const [walletTopUpAmount, setWalletTopUpAmount] = useState("1000");
  const [walletTopUpNotice, setWalletTopUpNotice] = useState("");
  const [walletTopUpLoading, setWalletTopUpLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ mode: "WALLET", walletEnabled: true, razorpayEnabled: false, razorpayConfigured: false, currency: "INR" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const sessionUser = await getCurrentUser().catch(() => undefined);
      if (!mounted) return;
      const nextUser = sessionUser && typeof sessionUser === "object" && "role" in sessionUser ? sessionUser as SessionUser : null;
      setUser(nextUser);

      if (nextUser?.role === "USER") {
        const [reviewPayload, savedPayload, quotePayload] = await Promise.all([
          authFetch(`${getApiBase()}/api/dashboard/reviews`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/saved-profiles`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/quote-requests`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined)
        ]);
        if (!mounted) return;
        if (Array.isArray(reviewPayload?.data)) setReviews(reviewPayload.data as ReviewerReview[]);
        if (Array.isArray(savedPayload?.data)) setSavedProfiles(savedPayload.data.map((item: { profile?: unknown }) => normalizeProfile(item.profile)));
        if (Array.isArray(quotePayload?.data)) setLeads(quotePayload.data as ProfileLead[]);
      } else {
        const [listingPayload, insightPayload, leadPayload, qualityPayload, walletPayload] = await Promise.all([
          authFetch(`${getApiBase()}/api/dashboard/listings`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/insights`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/leads`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/leads/quality`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
          authFetch(`${getApiBase()}/api/dashboard/wallet`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined)
        ]);
        if (!mounted) return;
        if (Array.isArray(listingPayload?.data)) setListings(listingPayload.data.map(normalizeProfile));
        if (insightPayload?.data?.summary) setInsights({ ...emptyInsights, ...insightPayload.data.summary });
        if (Array.isArray(leadPayload?.data)) setLeads(leadPayload.data as ProfileLead[]);
        if (qualityPayload?.data?.summary) setLeadQuality({ ...emptyLeadQuality, ...qualityPayload.data.summary });
        if (walletPayload?.data?.wallet) setWallet(walletPayload.data.wallet as WalletSummary);
        if (Array.isArray(walletPayload?.data?.transactions)) setWalletTransactions(walletPayload.data.transactions as WalletTransactionSummary[]);
        if (walletPayload?.data?.paymentSettings) {
          const settings = walletPayload.data.paymentSettings as PaymentSettings;
          setPaymentSettings(settings);
          setFeaturedPaymentMethod(settings.walletEnabled ? "WALLET" : "RAZORPAY");
        }
      }
      setLoading(false);
    }
    load().catch(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => ({
      total: listings.length,
      drafts: listings.filter((listing) => listing.status === "draft").length,
      pending: listings.filter((listing) => listing.status === "pending").length,
      approved: listings.filter((listing) => listing.status === "approved").length,
      reviews: listings.reduce((sum, listing) => sum + listing.reviews, 0)
  }), [listings]);
  const leadStats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === "NEW").length,
    contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
    converted: leads.filter((lead) => lead.status === "CONVERTED").length
  }), [leads]);
  const primaryListing = listings[0];
  useEffect(() => {
    let mounted = true;
    async function loadFeaturedOptions() {
      if (!primaryListing) {
        setFeaturedOptions([]);
        return;
      }
      setFeaturedOptionsLoading(true);
      const response = await authFetch(`${getApiBase()}/api/dashboard/listings/${primaryListing.id || primaryListing.slug}/featured-options`).catch(() => undefined);
      if (!mounted) return;
      if (response?.ok) {
        const payload = await response.json() as { data?: { options?: FeaturedPlacementOption[] } };
        const options = Array.isArray(payload.data?.options) && payload.data.options.length ? payload.data.options : fallbackPlacementOptions(primaryListing);
        setFeaturedOptions(options);
        setFeaturedRequestForm((current) => {
          const hasPlacement = options.some((option) => option.scopeKey === current.placementKey);
          const option = hasPlacement ? options.find((item) => item.scopeKey === current.placementKey) || options[0] : options[0];
          const hasDuration = option.durations.some((duration) => String(duration.days) === current.requestedDays);
          return {
            requestedDays: hasDuration ? current.requestedDays : String(option.durations[0]?.days || 7),
            requestedPage: option.pageType,
            placementKey: option.scopeKey
          };
        });
      } else {
        const options = fallbackPlacementOptions(primaryListing);
        setFeaturedOptions(options);
      }
      setFeaturedOptionsLoading(false);
    }
    void loadFeaturedOptions();
    return () => {
      mounted = false;
    };
  }, [primaryListing]);

  const placementOptions = useMemo(() => primaryListing ? (featuredOptions.length ? featuredOptions : fallbackPlacementOptions(primaryListing)) : [], [featuredOptions, primaryListing]);
  const selectedPlacement = placementOptions.find((option) => option.scopeKey === featuredRequestForm.placementKey) || placementOptions[0];
  const selectedPrice = selectedPlacement?.durations.find((duration) => String(duration.days) === featuredRequestForm.requestedDays) || selectedPlacement?.durations[0];
  const selectedAmount = selectedPrice?.priceAmount || 0;
  const walletCanPay = paymentSettings.walletEnabled && (!wallet || wallet.availableBalance >= selectedAmount);
  const razorpayCanPay = paymentSettings.razorpayEnabled;
  const paymentMethodReady = featuredPaymentMethod === "WALLET" ? walletCanPay : razorpayCanPay;
  const reviewerStats = useMemo(() => ({
    totalReviews: reviews.length,
    approvedReviews: reviews.filter((review) => review.status === "APPROVED").length,
    pendingReviews: reviews.filter((review) => review.status === "PENDING").length,
    rejectedReviews: reviews.filter((review) => review.status === "REJECTED").length,
    savedProfiles: savedProfiles.length,
    quoteRequests: leads.length
  }), [reviews, savedProfiles, leads]);

  async function updateLeadStatus(lead: ProfileLead, status: ProfileLead["status"]) {
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
    const response = await authFetch(`${getApiBase()}/api/dashboard/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }).catch(() => undefined);
    if (response?.ok) {
      const payload = await response.json() as { data?: ProfileLead };
      if (payload.data) setLeads((current) => current.map((item) => item.id === lead.id ? payload.data as ProfileLead : item));
    }
  }

  async function refreshWalletSummary() {
    const response = await authFetch(`${getApiBase()}/api/dashboard/wallet`).catch(() => undefined);
    if (!response?.ok) return;
    const payload = await response.json() as { data?: { wallet?: WalletSummary; transactions?: WalletTransactionSummary[]; paymentSettings?: PaymentSettings } };
    if (payload.data?.wallet) setWallet(payload.data.wallet);
    if (Array.isArray(payload.data?.transactions)) setWalletTransactions(payload.data.transactions);
    if (payload.data?.paymentSettings) setPaymentSettings(payload.data.paymentSettings);
  }

  async function requestWalletTopUp() {
    setWalletTopUpLoading(true);
    setWalletTopUpNotice("");
    try {
      const response = await authFetch(`${getApiBase()}/api/dashboard/wallet/topups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(walletTopUpAmount),
          reason: "Wallet balance for featured listing"
        })
      });
      const payload = await response.json() as { message?: string; error?: string };
      setWalletTopUpNotice(response.ok ? payload.message || "Wallet top-up request sent to admin." : payload.error || "Wallet top-up request failed.");
      if (response.ok) await refreshWalletSummary();
    } catch (error) {
      setWalletTopUpNotice(error instanceof Error ? error.message : "Wallet top-up request failed.");
    } finally {
      setWalletTopUpLoading(false);
    }
  }

  async function payWalletTopUpWithRazorpay() {
    setWalletTopUpLoading(true);
    setWalletTopUpNotice("");
    try {
      const response = await authFetch(`${getApiBase()}/api/dashboard/wallet/topups/razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(walletTopUpAmount) })
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        data?: {
          razorpay?: {
            keyId: string;
            orderId: string;
            amount: number;
            currency: string;
            name: string;
            description: string;
          };
        };
      };
      if (!response.ok || !payload.data?.razorpay) {
        setWalletTopUpNotice(payload.error || "Razorpay wallet top-up could not start.");
        return;
      }
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) {
        setWalletTopUpNotice("Razorpay checkout could not load. Use admin approval request.");
        return;
      }
      const payment = payload.data.razorpay;
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount * 100,
        currency: payment.currency,
        name: payment.name,
        description: payment.description,
        order_id: payment.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#172033" },
        modal: {
          ondismiss: () => setWalletTopUpNotice("Razorpay wallet top-up was not completed.")
        },
        handler: async (checkoutResponse) => {
          const verifyResponse = await authFetch(`${getApiBase()}/api/dashboard/wallet/topups/razorpay-verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkoutResponse)
          });
          const verifyPayload = await verifyResponse.json() as { message?: string; error?: string };
          setWalletTopUpNotice(verifyResponse.ok ? verifyPayload.message || "Wallet balance added." : verifyPayload.error || "Wallet top-up verification failed.");
          if (verifyResponse.ok) await refreshWalletSummary();
        }
      });
      checkout.open();
    } catch (error) {
      setWalletTopUpNotice(error instanceof Error ? error.message : "Razorpay wallet top-up could not start.");
    } finally {
      setWalletTopUpLoading(false);
    }
  }

  async function requestFeaturedPlacement(listing: Listing) {
    setFeaturedRequesting(true);
    setFeaturedRequestNotice("");
    try {
      if (featuredPaymentMethod === "WALLET" && wallet && selectedPrice?.priceAmount && wallet.availableBalance < selectedPrice.priceAmount) {
        setFeaturedRequestNotice("Insufficient wallet balance. Ask admin to add balance or switch to Razorpay when it is enabled.");
        return;
      }
      const response = await authFetch(`${getApiBase()}/api/dashboard/listings/${listing.id || listing.slug}/featured-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedDays: Number(featuredRequestForm.requestedDays),
          requestedPage: selectedPlacement?.pageType || featuredRequestForm.requestedPage,
          placementKey: selectedPlacement?.scopeKey || featuredRequestForm.placementKey,
          paymentMethod: featuredPaymentMethod
        })
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        data?: {
          request?: FeaturedPlacementRequest;
          payment?: {
            razorpay?: {
              keyId: string;
              orderId: string;
              amount: number;
              currency: string;
              name: string;
              description: string;
            } | null;
          } | null;
        };
      };
      if (!response.ok) {
        setFeaturedRequestNotice(payload.error || "Featured request could not be sent.");
        return;
      }
      if (featuredPaymentMethod === "RAZORPAY" && payload.data?.payment?.razorpay && payload.data.request?.id) {
        setFeaturedRequestNotice("Opening Razorpay checkout...");
        const loaded = await loadRazorpayCheckout();
        if (!loaded || !window.Razorpay) {
          setFeaturedRequestNotice("Razorpay checkout could not load. Try again or use wallet.");
          return;
        }
        const payment = payload.data.payment.razorpay;
        const requestId = payload.data.request.id;
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount * 100,
          currency: payment.currency,
          name: payment.name,
          description: payment.description,
          order_id: payment.orderId,
          prefill: { name: user?.name, email: user?.email },
          theme: { color: "#172033" },
          modal: {
            ondismiss: () => setFeaturedRequestNotice("Razorpay payment was not completed.")
          },
          handler: async (checkoutResponse) => {
            const verifyResponse = await authFetch(`${getApiBase()}/api/dashboard/featured-requests/${requestId}/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(checkoutResponse)
            });
            const verifyPayload = await verifyResponse.json() as { message?: string; error?: string };
            setFeaturedRequestNotice(verifyResponse.ok ? verifyPayload.message || "Payment verified. Request sent for admin review." : verifyPayload.error || "Payment verification failed.");
          }
        });
        checkout.open();
        return;
      }
      setFeaturedRequestNotice(payload.message || "Featured placement request sent to admin.");
      await refreshWalletSummary();
    } catch (error) {
      setFeaturedRequestNotice(error instanceof Error ? error.message : "Featured request could not be sent.");
    } finally {
      setFeaturedRequesting(false);
    }
  }

  const latestFeaturedRequest = primaryListing ? featuredRequestForListing(primaryListing) : undefined;

  if (!loading && user?.role === "USER") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Review user dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">Your saved profiles, reviews and quotes</h1>
            <p className="mt-4 max-w-3xl leading-7 text-muted">
              Track saved businesses, review moderation status, and quote requests you sent to service providers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/listings" variant="gold"><MessageSquareText className="mr-2 h-4 w-4" /> Explore Listings</Button>
            <Button href="/signup" variant="ghost">Create Owner Account</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Saved" value={reviewerStats.savedProfiles} icon={<BookmarkCheck className="h-5 w-5" />} />
          <Stat label="Reviews" value={reviewerStats.totalReviews} icon={<MessageSquareText className="h-5 w-5" />} />
          <Stat label="Quotes" value={reviewerStats.quoteRequests} icon={<Send className="h-5 w-5" />} />
          <Stat label="Approved" value={reviewerStats.approvedReviews} icon={<CheckCircle2 className="h-5 w-5" />} />
          <Stat label="Pending" value={reviewerStats.pendingReviews} icon={<Clock3 className="h-5 w-5" />} />
          <Stat label="Rejected" value={reviewerStats.rejectedReviews} icon={<XCircle className="h-5 w-5" />} />
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-5 md:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Saved profiles</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Shortlist</h2>
              </div>
              <Button href="/listings" variant="ghost" className="py-2.5">Find more</Button>
            </div>
            <div className="mt-5 grid gap-3">
              {savedProfiles.length ? savedProfiles.map((profile) => <SavedProfileRow key={profile.id || profile.slug} profile={profile} />) : (
                <EmptyState
                  title="No saved profiles yet"
                  text="Use the heart button on listing cards or profile pages to build your shortlist."
                  href="/listings"
                  action="Explore listings"
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Review activity</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Profiles you reviewed</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {reviews.length ? reviews.map((review) => <ReviewRow key={review.id} review={review} />) : (
                <EmptyState
                  title="No reviews posted"
                  text="Open an approved profile and post a review. It will stay pending until admin approval."
                  href="/listings"
                  action="Review a profile"
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:p-6 xl:col-span-2">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Quote requests</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Requests you sent</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Follow the status of quote requests submitted while logged in.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-muted">
                <span className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200">{leads.length} total</span>
                <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700 ring-1 ring-blue-100">{leads.filter((lead) => lead.status === "NEW").length} new</span>
                <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-100">{leads.filter((lead) => lead.status === "CONTACTED").length} contacted</span>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {leads.length ? leads.map((lead) => <SentLeadRow key={lead.id} lead={lead} />) : (
                <EmptyState
                  title="No quote requests sent"
                  text="Open a profile and use Request Quote while logged in. Each request will appear here with its latest owner status."
                  href="/listings"
                  action="Find a provider"
                />
              )}
            </div>
          </GlassCard>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:py-12">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Listing poster dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">Manage your business profile</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            Each business owner account can post one profile. Track approval state, views and reviews here; country, city, category and slug stay locked after submission for SEO stability.
          </p>
        </div>
        {primaryListing ? (
          <Button href={`/dashboard/edit-profile?listing=${primaryListing.slug}`} variant="gold">Edit Profile</Button>
        ) : (
          <Button href="/dashboard/add-profile" variant="gold"><Plus className="mr-2 h-4 w-4" /> Add Profile</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Total listings" value={stats.total} icon={<FileText className="h-5 w-5" />} />
        <Stat label="Drafts" value={stats.drafts} icon={<Clock3 className="h-5 w-5" />} />
        <Stat label="Pending" value={stats.pending} icon={<LockKeyhole className="h-5 w-5" />} />
        <Stat label="Approved" value={stats.approved} icon={<Star className="h-5 w-5" />} />
        <Stat label="Reviews" value={stats.reviews} icon={<MessageSquareText className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label="Total views" value={insights.TOTAL_VIEW_COUNT || listings.reduce((sum, listing) => sum + listing.viewCount, 0)} icon={<Eye className="h-5 w-5" />} />
        <Stat label="30d WhatsApp" value={insights.WHATSAPP_CLICK} icon={<MessageCircle className="h-5 w-5" />} />
        <Stat label="30d Calls" value={insights.PHONE_CLICK} icon={<Phone className="h-5 w-5" />} />
        <Stat label="30d Website" value={insights.WEBSITE_CLICK} icon={<Globe2 className="h-5 w-5" />} />
      </div>

      <section className="mt-6">
        <GlassCard className="p-5 md:p-6">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Wallet balance</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Add money for featured campaigns</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Use wallet balance to pay for featured placement requests. Razorpay top-up is available when admin enables the gateway; otherwise send a top-up request for admin approval.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Available</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{formatMoney(wallet?.availableBalance ?? 0, wallet?.currency || paymentSettings.currency)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Held</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{formatMoney(wallet?.heldBalance ?? 0, wallet?.currency || paymentSettings.currency)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Total</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{formatMoney(wallet?.balance ?? 0, wallet?.currency || paymentSettings.currency)}</p>
                </div>
              </div>
              {walletTopUpNotice ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{walletTopUpNotice}</p> : null}
            </div>
            <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Top-up amount</span>
                <input
                  value={walletTopUpAmount}
                  onChange={(event) => setWalletTopUpAmount(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button variant="gold" disabled={walletTopUpLoading} onClick={requestWalletTopUp}>
                  <Wallet className="mr-2 h-4 w-4" /> Request Top-up
                </Button>
                <Button variant="ghost" disabled={walletTopUpLoading || !paymentSettings.razorpayEnabled} onClick={payWalletTopUpWithRazorpay}>
                  <CreditCard className="mr-2 h-4 w-4" /> Pay Online
                </Button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {paymentSettings.razorpayEnabled ? "Online top-up credits your wallet after payment verification." : "Online top-up is disabled. Admin can approve your request from the wallet page."}
              </p>
              <div className="mt-4 grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recent wallet activity</p>
                {walletTransactions.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cloud px-3 py-2 text-xs font-semibold text-muted">
                    <span className="min-w-0 truncate">{transaction.type.replace(/_/g, " ")} - {transaction.status.toLowerCase()}</span>
                    <span className="shrink-0 text-ink">{formatMoney(transaction.amount, transaction.currency)}</span>
                  </div>
                ))}
                {!walletTransactions.length ? <p className="rounded-2xl bg-cloud px-3 py-2 text-xs font-semibold text-muted">No wallet activity yet.</p> : null}
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {primaryListing ? (
        <section className="mt-6">
          <GlassCard className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Special featured placement</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Buy priority visibility on linked pages</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  Choose a placement connected to this approved profile. Pricing updates by page and duration, and admin reviews every request before it becomes active.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-full px-3 py-2 ring-1 ${isFeaturedActive(primaryListing) ? "bg-blue-50 text-blue-700 ring-blue-100" : isFeaturedExpired(primaryListing) ? "bg-amber-50 text-amber-800 ring-amber-100" : "bg-white text-muted ring-slate-200"}`}>
                    {featuredPlacementLabel(primaryListing)}
                  </span>
                  {latestFeaturedRequest ? <span className="rounded-full bg-white px-3 py-2 text-muted ring-1 ring-slate-200">{featuredRequestLabel(latestFeaturedRequest)}</span> : null}
                  {activeFeaturedCampaign(primaryListing) ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">{campaignLabel(primaryListing)}</span> : null}
                  <span className="rounded-full bg-white px-3 py-2 text-muted ring-1 ring-slate-200">{primaryListing.viewCount.toLocaleString()} total views</span>
                  <span className="rounded-full bg-white px-3 py-2 text-muted ring-1 ring-slate-200">{leadStats.total} quote requests</span>
                </div>
                {featuredRequestNotice ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{featuredRequestNotice}</p> : null}
              </div>
              <div className="grid gap-3 lg:min-w-[28rem] lg:justify-end">
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Placement page</span>
                  <div className="grid gap-2">
                    {placementOptions.map((option) => (
                      <button
                        key={option.scopeKey}
                        type="button"
                        onClick={() => setFeaturedRequestForm((current) => ({
                          ...current,
                          requestedPage: option.pageType,
                          placementKey: option.scopeKey,
                          requestedDays: option.durations.some((duration) => String(duration.days) === current.requestedDays)
                            ? current.requestedDays
                            : String(option.durations[0]?.days || 7)
                        }))}
                        className={`rounded-2xl px-4 py-3 text-left ring-1 transition ${featuredRequestForm.placementKey === option.scopeKey ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-slate-200 hover:bg-cloud"}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{option.label}</span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${featuredRequestForm.placementKey === option.scopeKey ? "bg-white/15 text-white" : "bg-slate-100 text-muted"}`}>
                            {featuredPageTypeLabel(option.pageType)}
                          </span>
                        </span>
                        <span className={`mt-1 block text-xs leading-5 ${featuredRequestForm.placementKey === option.scopeKey ? "text-white/70" : "text-muted"}`}>{option.pagePath}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Duration</span>
                  <div className="grid grid-cols-5 gap-2">
                    {(selectedPlacement?.durations || []).map((duration) => (
                      <button
                        key={duration.days}
                        type="button"
                        onClick={() => setFeaturedRequestForm((current) => ({ ...current, requestedDays: String(duration.days) }))}
                        className={`rounded-2xl px-2 py-3 text-center text-sm font-bold ring-1 transition ${featuredRequestForm.requestedDays === String(duration.days) ? "bg-champagne text-onaccent ring-champagne" : "bg-white text-ink ring-slate-200 hover:bg-cloud"}`}
                      >
                        {duration.days}d
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Selected price</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{formatMoney(selectedPrice?.priceAmount, selectedPrice?.currency)}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {selectedPlacement?.label || "Choose placement"} for {featuredRequestForm.requestedDays} days
                    {featuredOptionsLoading ? " - refreshing prices" : ""}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Payment</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        Wallet available: {formatMoney(wallet?.availableBalance ?? 0, wallet?.currency || paymentSettings.currency)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">
                      {paymentSettings.mode}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!paymentSettings.walletEnabled}
                      onClick={() => setFeaturedPaymentMethod("WALLET")}
                      className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${featuredPaymentMethod === "WALLET" ? "bg-ink text-white ring-ink" : "bg-cloud text-ink ring-slate-200 hover:bg-slate-100"}`}
                    >
                      <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Wallet</span>
                      <span className={`mt-1 block text-xs ${featuredPaymentMethod === "WALLET" ? "text-white/70" : walletCanPay ? "text-muted" : "text-rose-600"}`}>
                        {walletCanPay ? "Admin-added balance" : "Balance is low"}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!paymentSettings.razorpayEnabled}
                      onClick={() => setFeaturedPaymentMethod("RAZORPAY")}
                      className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${featuredPaymentMethod === "RAZORPAY" ? "bg-ink text-white ring-ink" : "bg-cloud text-ink ring-slate-200 hover:bg-slate-100"}`}
                    >
                      <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Razorpay</span>
                      <span className={`mt-1 block text-xs ${featuredPaymentMethod === "RAZORPAY" ? "text-white/70" : "text-muted"}`}>
                        {paymentSettings.razorpayConfigured ? "Online checkout" : "Not configured"}
                      </span>
                    </button>
                  </div>
                </div>
                <Button href={profileHref(primaryListing)} variant="ghost" className={primaryListing.status === "approved" ? "" : "pointer-events-none opacity-50"}>
                  <Eye className="mr-2 h-4 w-4" /> Open Profile
                </Button>
                <Button
                  variant="gold"
                  disabled={featuredRequesting || primaryListing.status !== "approved" || !paymentMethodReady}
                  onClick={() => requestFeaturedPlacement(primaryListing)}
                >
                  <Megaphone className="mr-2 h-4 w-4" /> {featuredRequesting ? "Processing..." : isFeaturedActive(primaryListing) ? "Request Extension" : "Request Featured"}
                </Button>
              </div>
            </div>
          </GlassCard>
        </section>
      ) : null}

      <section className="mt-6">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Lead quality</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Quote performance</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Scoring uses contact completeness, budget, timeline, service match, preferred date and message detail. It helps you respond to serious leads first.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted ring-1 ring-slate-200">Last 30 days</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Stat label="Avg score" value={`${leadQuality.avgScore}/100`} icon={<BarChart3 className="h-5 w-5" />} />
            <Stat label="Hot leads" value={leadQuality.hot} icon={<Flame className="h-5 w-5" />} />
            <Stat label="Response" value={formatMinutes(leadQuality.avgResponseMinutes)} icon={<Timer className="h-5 w-5" />} />
            <Stat label="Contact rate" value={`${leadQuality.contactRate}%`} icon={<Phone className="h-5 w-5" />} />
            <Stat label="Won rate" value={`${leadQuality.conversionRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
            <Stat label="View to lead" value={`${leadQuality.viewToLeadRate}%`} icon={<Send className="h-5 w-5" />} />
          </div>
        </GlassCard>
      </section>

      <section className="mt-6">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Lead inbox</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Quote requests</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Track new customer requests from public profile pages and mark their progress.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-muted sm:flex">
              <span className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200">{leadStats.total} total</span>
              <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700 ring-1 ring-blue-100">{leadStats.new} new</span>
              <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-100">{leadStats.contacted} contacted</span>
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">{leadStats.converted} converted</span>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {leads.length ? leads.slice(0, 8).map((lead) => <LeadRow key={lead.id} lead={lead} onStatus={updateLeadStatus} />) : (
              <EmptyState
                title="No quote requests yet"
                text="Requests from public profile pages will appear here with phone, service, preferred time and message."
                href={primaryListing ? `/${primaryListing.country}/${primaryListing.city}/${primaryListing.categorySlug}/${primaryListing.slug}` : "/dashboard/add-profile"}
                action={primaryListing ? "Open profile" : "Add profile"}
              />
            )}
          </div>
        </GlassCard>
      </section>

      <div className="mt-6 grid gap-4">
        {loading ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} />) : null}
        {!loading && listings.length === 0 ? (
          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">No listings submitted yet</h2>
          <p className="mt-3 text-muted">Create your first listing. You can save it as a draft first, then submit it for admin review when complete.</p>
          </GlassCard>
        ) : null}
        {listings.map((listing) => {
          const href = `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`;
          const rowId = listing.id || listing.slug;
          const verificationOpen = openVerificationId === rowId;
          return (
            <article key={rowId} className="glass rounded-[1.7rem] p-4 md:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-semibold text-ink">{listing.name}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-muted ring-1 ring-slate-200">{listing.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{listing.shortDescription || listing.about}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ink">
                    <span className="rounded-full bg-cloud px-3 py-1"><LockKeyhole className="mr-1 inline h-3 w-3" /> {listing.country.toUpperCase()}</span>
                    <span className="rounded-full bg-cloud px-3 py-1"><LockKeyhole className="mr-1 inline h-3 w-3" /> {listing.cityName}</span>
                    <span className="rounded-full bg-cloud px-3 py-1"><LockKeyhole className="mr-1 inline h-3 w-3" /> {listing.category}</span>
                    {listing.isAdult || Boolean(listing.verificationStatus && listing.verificationStatus !== "NOT_REQUIRED") || Boolean(listing.verificationDocuments?.length) ? (
                      <span className={`rounded-full px-3 py-1 ${verificationTone(effectiveVerificationStatus(listing))}`}>
                        <ShieldCheck className="mr-1 inline h-3 w-3" /> Verification {effectiveVerificationStatus(listing).toLowerCase()}
                      </span>
                    ) : null}
                  </div>
                  {listing.verificationNotes ? (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100">
                      Admin verification note: {listing.verificationNotes}
                    </p>
                  ) : null}
                  {listing.verificationDocuments?.some((document) => document.adminNotes) ? (
                    <div className="mt-3 grid gap-2">
                      {listing.verificationDocuments.filter((document) => document.adminNotes).slice(0, 2).map((document) => (
                        <p key={document.id || document.fileUrl} className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800 ring-1 ring-rose-100">
                          {verificationDocumentLabel(document.type)}: {document.adminNotes}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button href={`/dashboard/profile/${listing.slug}`} variant="gold"><Eye className="mr-2 h-4 w-4" /> Preview Page</Button>
                  <Button href={href} variant="ghost" className={listing.status === "approved" ? "" : "pointer-events-none opacity-50"}><Eye className="mr-2 h-4 w-4" /> Public URL</Button>
                  <Button
                    variant="ghost"
                    onClick={() => setOpenVerificationId(verificationOpen ? "" : rowId)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Verification
                  </Button>
                  <Button href={`/dashboard/edit-profile?listing=${listing.slug}`} variant="primary">{listing.status === "draft" ? "Resume Draft" : "Edit Details"}</Button>
                </div>
              </div>
              {verificationOpen ? <VerificationProcessPanel listing={listing} /> : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}

function VerificationProcessPanel({ listing }: { listing: Listing }) {
  const documents = listing.verificationDocuments || [];
  const status = effectiveVerificationStatus(listing);
  const requiredTypes = listing.isAdult ? ["GOV_ID", "AGE_SELFIE"] : [];
  const missingRequired = requiredTypes.filter((type) => !documents.some((document) => document.type === type));

  return (
    <div className="mt-5 rounded-[1.35rem] bg-white/80 p-4 ring-1 ring-slate-200">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Verification process</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Document verification</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Listing approval and document verification are separate. Admin reviews the profile first, then marks each private document as verified or rejected with comments.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${verificationTone(status)}`}>
          {status.toLowerCase()}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <VerificationStep label="Profile submitted" active complete={listing.status !== "draft"} />
        <VerificationStep label="Admin listing approval" active={listing.status === "pending"} complete={listing.status === "approved"} />
        <VerificationStep label="Document verification" active={status === "PENDING"} complete={status === "VERIFIED"} />
      </div>

      {listing.verificationNotes ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100">
          Admin verification note: {listing.verificationNotes}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {documents.length ? documents.map((document) => (
          <div key={document.id || `${document.type}-${document.fileUrl}`} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{verificationDocumentLabel(document.type)}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{document.originalName || "Private admin-only file"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${verificationTone(document.status || "PENDING")}`}>
                {(document.status || "PENDING").toLowerCase()}
              </span>
            </div>
            {document.adminNotes ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold leading-6 text-rose-800 ring-1 ring-rose-100">
                Admin comment: {document.adminNotes}
              </p>
            ) : null}
          </div>
        )) : (
          <div className="rounded-2xl bg-cloud px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200 md:col-span-2">
            No private verification documents uploaded yet.
          </div>
        )}
      </div>

      {missingRequired.length ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800 ring-1 ring-rose-100">
          Missing required document(s): {missingRequired.map(verificationDocumentLabel).join(", ")}.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button href={`/dashboard/edit-profile?listing=${listing.slug}#verification`} variant="gold">
          <ShieldCheck className="mr-2 h-4 w-4" /> Upload / Resubmit Documents
        </Button>
      </div>
    </div>
  );
}

function VerificationStep({ label, active, complete }: { label: string; active?: boolean; complete?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
      complete ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : active ? "bg-amber-50 text-amber-900 ring-amber-100" : "bg-cloud text-muted ring-slate-200"
    }`}>
      {complete ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : active ? <Clock3 className="mr-2 inline h-4 w-4" /> : <ShieldCheck className="mr-2 inline h-4 w-4" />}
      {label}
    </div>
  );
}

function LeadRow({ lead, onStatus }: { lead: ProfileLead; onStatus: (lead: ProfileLead, status: ProfileLead["status"]) => void }) {
  const profile = lead.profile ? normalizeProfile(lead.profile) : null;
  const date = new Date(lead.createdAt);
  const created = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
  const whatsapp = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");

  return (
    <article className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold text-ink">{lead.name}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${leadStatusTone(lead.status)}`}>{lead.status.toLowerCase()}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${leadQualityTone(lead.leadQuality)}`}>
              {lead.leadQuality || "warm"} {lead.leadScore ?? 0}/100
            </span>
            {created ? <span className="text-xs font-semibold text-muted">{created}</span> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{profile ? `${profile.name} - ` : ""}{lead.serviceNeeded || "Service request"}</p>
          <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <span className="rounded-2xl bg-cloud px-3 py-2"><Phone className="mr-2 inline h-4 w-4 text-champagne" />{lead.phone}</span>
            {lead.email ? <span className="rounded-2xl bg-cloud px-3 py-2">{lead.email}</span> : null}
            {lead.budget ? <span className="rounded-2xl bg-cloud px-3 py-2">Budget: {lead.budget}</span> : null}
            {lead.timeline ? <span className="rounded-2xl bg-cloud px-3 py-2">Timeline: {lead.timeline}</span> : null}
            {lead.preferredDate || lead.preferredTime ? <span className="rounded-2xl bg-cloud px-3 py-2">Preferred: {[lead.preferredDate?.slice(0, 10), lead.preferredTime].filter(Boolean).join(" ")}</span> : null}
            {lead.contactPreference ? <span className="rounded-2xl bg-cloud px-3 py-2">Contact: {lead.contactPreference}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
            {lead.sourcePath ? <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Source: {lead.sourcePath}</span> : null}
            {lead.responseAt ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">Responded in {formatResponseFromLead(lead)}</span> : null}
          </div>
          {lead.message ? <p className="mt-3 rounded-2xl bg-cloud px-3 py-2 text-sm leading-6 text-muted">{lead.message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {whatsapp ? <Button href={`https://wa.me/${whatsapp}`} variant="gold" className="py-2.5"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button> : null}
          <Button variant="ghost" className="py-2.5" onClick={() => onStatus(lead, "CONTACTED")}>Contacted</Button>
          <Button variant="ghost" className="py-2.5" onClick={() => onStatus(lead, "CONVERTED")}>Converted</Button>
          <Button variant="ghost" className="py-2.5" onClick={() => onStatus(lead, "LOST")}>Lost</Button>
        </div>
      </div>
    </article>
  );
}

function SentLeadRow({ lead }: { lead: ProfileLead }) {
  const profile = lead.profile ? normalizeProfile(lead.profile) : null;
  const date = new Date(lead.createdAt);
  const created = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
  const preferred = [lead.preferredDate?.slice(0, 10), lead.preferredTime].filter(Boolean).join(" ");
  const canOpenProfile = Boolean(profile && profile.status === "approved");
  const providerWhatsapp = profile?.whatsapp?.replace(/\D/g, "");

  return (
    <article className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {canOpenProfile && profile ? (
              <Link href={profileHref(profile)} className="break-words text-lg font-semibold text-ink hover:text-champagne">{profile.name}</Link>
            ) : (
              <h3 className="break-words text-lg font-semibold text-ink">{profile?.name || "Submitted quote request"}</h3>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${leadStatusTone(lead.status)}`}>{lead.status.toLowerCase()}</span>
          </div>
          {profile ? <p className="mt-1 text-sm text-muted">{profile.category} in {profile.cityName}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
            {created ? <span className="rounded-full bg-cloud px-3 py-1">Sent {created}</span> : null}
            <span className="rounded-full bg-cloud px-3 py-1">{lead.serviceNeeded || "Service request"}</span>
            {preferred ? <span className="rounded-full bg-cloud px-3 py-1">Preferred {preferred}</span> : null}
            {lead.responseAt ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">Provider responded in {formatResponseFromLead(lead)}</span> : null}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <span className="rounded-2xl bg-cloud px-3 py-2"><Phone className="mr-2 inline h-4 w-4 text-champagne" />Your phone: {lead.phone}</span>
            {lead.email ? <span className="rounded-2xl bg-cloud px-3 py-2">Your email: {lead.email}</span> : null}
          </div>
          {lead.message ? <p className="mt-3 rounded-2xl bg-cloud px-3 py-2 text-sm leading-6 text-muted">{lead.message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {canOpenProfile && profile ? <Button href={profileHref(profile)} variant="gold" className="py-2.5">Open Profile</Button> : null}
          {providerWhatsapp ? <Button href={`https://wa.me/${providerWhatsapp}`} variant="ghost" className="py-2.5"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button> : null}
        </div>
      </div>
    </article>
  );
}

function leadStatusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "NEW") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (normalized === "CONTACTED") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (normalized === "CONVERTED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (normalized === "LOST") return "bg-slate-50 text-slate-700 ring-slate-100";
  return "bg-rose-50 text-rose-700 ring-rose-100";
}

function leadQualityTone(quality?: string | null) {
  const normalized = String(quality || "WARM").toUpperCase();
  if (normalized === "HOT") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (normalized === "COLD") return "bg-slate-50 text-slate-700 ring-slate-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function formatResponseFromLead(lead: ProfileLead) {
  if (!lead.responseAt) return "-";
  const created = new Date(lead.createdAt).getTime();
  const responded = new Date(lead.responseAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(responded) || responded < created) return "-";
  return formatMinutes(Math.round((responded - created) / 60000));
}

function verificationTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "VERIFIED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (normalized === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function verificationDocumentLabel(type?: string) {
  if (type === "GOV_ID") return "Government ID";
  if (type === "AGE_SELFIE") return "DOB selfie/photo";
  if (type === "BUSINESS_LICENSE") return "Business license";
  if (type === "ADDRESS_PROOF") return "Address proof";
  if (type === "CERTIFICATE") return "Certificate";
  return "Verification document";
}

function effectiveVerificationStatus(listing: Listing) {
  return resolveEffectiveVerificationStatus({
    profileStatus: listing.verificationStatus,
    documents: listing.verificationDocuments,
    isAdult: listing.isAdult
  });
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">{icon}</span>
      </div>
    </GlassCard>
  );
}

function formatMinutes(value?: number | null) {
  if (!value && value !== 0) return "-";
  if (value < 60) return `${value}m`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatShortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function featuredPlacementLabel(listing: Listing) {
  if (isFeaturedActive(listing)) {
    const campaign = activeFeaturedCampaign(listing);
    const days = featuredDaysRemaining(listing);
    if (campaign?.pagePath) {
      return days ? `Featured campaign: ${days} day${days === 1 ? "" : "s"} left` : "Featured campaign active";
    }
    const until = formatShortDate(listing.featuredUntil);
    return days ? `Featured: ${days} day${days === 1 ? "" : "s"} left` : until ? `Featured until ${until}` : "Featured active";
  }
  if (isFeaturedExpired(listing)) return `Featured expired ${formatShortDate(listing.featuredUntil)}`;
  return listing.status === "approved" ? "Not featured yet" : "Available after approval";
}

function campaignLabel(listing: Listing) {
  const campaign = activeFeaturedCampaign(listing);
  if (!campaign) return "";
  const path = campaign.pagePath === "ALL" ? "all listing pages" : campaign.pagePath;
  return `Placement: ${path}`;
}

function featuredRequestForListing(listing: Listing) {
  return [...(listing.featuredPlacementRequests || [])].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return secondTime - firstTime;
  })[0];
}

function featuredRequestLabel(request: FeaturedPlacementRequest) {
  const status = request.status.toLowerCase();
  const payment = request.paymentStatus ? `, ${request.paymentStatus.toLowerCase().replace(/_/g, " ")}` : "";
  return `Request ${status}: ${request.requestedDays} days, ${featuredPageLabel(request.requestedPage)}${payment}`;
}

function featuredPageLabel(value?: string) {
  if (value === "LISTINGS") return "all listings";
  if (value === "CITY") return "city page";
  if (value === "CATEGORY") return "category page";
  return "listing, city and category";
}

function Skeleton() {
  return <div className="h-36 animate-pulse rounded-[1.7rem] bg-white/75 ring-1 ring-slate-200" />;
}

function profileHref(profile: Listing) {
  return `/${profile.country}/${profile.city}/${profile.categorySlug}/${profile.slug}`;
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (normalized === "DRAFT") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (normalized === "PENDING") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (normalized === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function SavedProfileRow({ profile }: { profile: Listing }) {
  return (
    <article className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href={profileHref(profile)} className="break-words text-lg font-semibold text-ink hover:text-champagne">{profile.name}</Link>
          <p className="mt-1 text-sm text-muted">{profile.category} in {profile.cityName}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
            <span className="rounded-full bg-cloud px-3 py-1">{profile.rating} rating</span>
            <span className="rounded-full bg-cloud px-3 py-1">{profile.reviews} reviews</span>
            <span className="rounded-full bg-cloud px-3 py-1">{profile.viewCount.toLocaleString()} views</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href={profileHref(profile)} variant="gold" className="py-2.5">View</Button>
          {profile.whatsapp ? <Button href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} variant="ghost" className="py-2.5">WhatsApp</Button> : null}
        </div>
      </div>
    </article>
  );
}

function ReviewRow({ review }: { review: ReviewerReview }) {
  const profile = review.profile ? normalizeProfile(review.profile) : null;
  return (
    <article className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {profile ? (
              <Link href={profileHref(profile)} className="break-words text-lg font-semibold text-ink hover:text-champagne">{profile.name}</Link>
            ) : (
              <p className="break-words text-lg font-semibold text-ink">Reviewed profile</p>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${statusTone(review.status)}`}>{review.status.toLowerCase()}</span>
          </div>
          {profile ? <p className="mt-1 text-sm text-muted">{profile.category} in {profile.cityName}</p> : null}
          <div className="mt-3 flex items-center gap-1 text-champagne">
            {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : ""}`} />)}
          </div>
          {review.title ? <p className="mt-3 font-semibold text-ink">{review.title}</p> : null}
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{review.comment}</p>
          {review.moderationNote ? <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{review.moderationNote}</p> : null}
        </div>
        {profile ? <Button href={profileHref(profile)} variant="ghost" className="shrink-0 py-2.5">Open Profile</Button> : null}
      </div>
    </article>
  );
}

function EmptyState({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-[1.35rem] bg-white p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
      <Button href={href} variant="ghost" className="mt-4 py-2.5">{action}</Button>
    </div>
  );
}
