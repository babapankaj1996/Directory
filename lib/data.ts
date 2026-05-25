import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  Home,
  Palette,
  Star,
  Utensils
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  count: number;
  description: string;
  iconName: string;
  isAdult?: boolean;
  adultLevel?: string;
  minimumAge?: number;
  showOnHomepage?: boolean;
  indexable?: boolean;
};

export type ListingStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";

export type ProfileGalleryImage = {
  id: string;
  profileId?: string;
  profileSlug?: string;
  imageUrl: string;
  title?: string;
  altText?: string;
  category?: string;
  sortOrder: number;
  isActive: boolean;
};

export type ProfileVerificationDocument = {
  id?: string;
  profileId?: string;
  type: string;
  fileUrl: string;
  originalName?: string;
  status?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FeaturedPlacementRequest = {
  id?: string;
  profileId?: string;
  ownerUserId?: string;
  requestedDays: number;
  requestedPage: string;
  requestedPagePath: string;
  status: string;
  adminNote?: string;
  placementKey?: string;
  placementLabel?: string;
  priceAmount?: number;
  currency?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  payment?: FeaturedPayment;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  campaigns?: FeaturedPlacementCampaign[];
};

export type FeaturedPlacementCampaign = {
  id?: string;
  profileId?: string;
  ownerUserId?: string;
  requestId?: string;
  pageType: string;
  pagePath: string;
  slot?: string;
  status: string;
  startsAt?: string;
  endsAt?: string;
  approvedAt?: string;
  cancelledAt?: string;
  adminNote?: string;
  source?: string;
  placementKey?: string;
  placementLabel?: string;
  priceAmount?: number;
  currency?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FeaturedPayment = {
  id?: string;
  requestId?: string;
  profileId?: string;
  ownerUserId?: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  walletTransactionId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FeaturedPlacementPrice = {
  id?: string;
  scopeKey: string;
  pageType: string;
  countryId?: string;
  citySlug?: string;
  categoryId?: string;
  durationDays: number;
  priceAmount: number;
  currency: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Listing = {
  id?: string;
  slug: string;
  name: string;
  ownerName: string;
  ownerEmail?: string;
  categorySlug: string;
  category: string;
  country: string;
  city: string;
  cityName: string;
  status: ListingStatus;
  rating: number;
  reviews: number;
  viewCount: number;
  verified: boolean;
  featured: boolean;
  featuredUntil?: string;
  featuredActive?: boolean;
  featuredExpired?: boolean;
  featuredDaysLeft?: number;
  open: boolean;
  location: string;
  address?: string;
  image: string;
  coverImage?: string;
  avatarImage?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  website: string;
  about: string;
  shortDescription?: string;
  services: string[];
  pricing?: string[];
  hours: string[];
  seoTitle?: string;
  seoDescription?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  gallery?: ProfileGalleryImage[];
  isAdult?: boolean;
  ageRestricted?: boolean;
  adultLevel?: string;
  adultDisclaimerAcceptedAt?: string;
  verificationStatus?: string;
  verificationNotes?: string;
  verificationDocuments?: ProfileVerificationDocument[];
  featuredPlacementRequests?: FeaturedPlacementRequest[];
  featuredPlacementCampaigns?: FeaturedPlacementCampaign[];
};

export const categories: Category[] = [
  { slug: "astrologer", name: "Astrologers", count: 2, description: "Trusted astrology, vastu and spiritual consultation experts.", iconName: "BadgeCheck" },
  { slug: "lawyers", name: "Lawyers", count: 0, description: "Verified legal consultants, advocates and documentation experts.", iconName: "BriefcaseBusiness" },
  { slug: "doctors", name: "Doctors", count: 2, description: "Doctors, clinics and healthcare professionals for appointments.", iconName: "HeartPulse" },
  { slug: "home-tutors", name: "Home Tutors", count: 0, description: "Private tutors, subject experts and online learning providers.", iconName: "GraduationCap" },
  { slug: "makeup-artists", name: "Makeup Artists", count: 1, description: "Bridal, party and event makeup artists with portfolios.", iconName: "Palette" },
  { slug: "photographers", name: "Photographers", count: 0, description: "Wedding, event, portrait and commercial photographers.", iconName: "Star" },
  { slug: "fitness-trainers", name: "Fitness Trainers", count: 1, description: "Personal trainers, yoga coaches and wellness instructors.", iconName: "HeartPulse" },
  { slug: "real-estate-agents", name: "Real Estate Agents", count: 1, description: "Property advisors, brokers and rental consultants.", iconName: "Building2" },
  { slug: "financial-advisors", name: "Financial Advisors", count: 1, description: "Tax, insurance, investment and finance planning professionals.", iconName: "BriefcaseBusiness" },
  { slug: "web-designers", name: "Web Designers", count: 0, description: "Website, landing page and UI design service providers.", iconName: "Home" },
  { slug: "digital-marketers", name: "Digital Marketers", count: 0, description: "SEO, ads, social media and lead generation experts.", iconName: "Star" },
  { slug: "electricians", name: "Electricians", count: 0, description: "Residential and commercial electrical repair specialists.", iconName: "Home" },
  { slug: "plumbers", name: "Plumbers", count: 0, description: "Plumbing repair, fitting and emergency maintenance providers.", iconName: "Home" },
  { slug: "car-mechanics", name: "Car Mechanics", count: 1, description: "Car repair, inspection, detailing and maintenance specialists.", iconName: "Car" },
  { slug: "interior-designers", name: "Interior Designers", count: 0, description: "Home, office and commercial interior design professionals.", iconName: "Building2" },
  { slug: "event-planners", name: "Event Planners", count: 0, description: "Wedding, party and corporate event planning experts.", iconName: "Star" },
  { slug: "female-escorts", name: "Female Escorts", count: 1, description: "Age-restricted adult companionship profiles for verified visitors.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "male-escorts", name: "Male Escorts", count: 0, description: "Age-restricted male companionship profiles for adults.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "trans-escorts", name: "Trans Escorts", count: 0, description: "Age-restricted trans companionship profiles for adults.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "independent-escorts", name: "Independent Escorts", count: 0, description: "Independent adult companionship profiles with admin review.", iconName: "Star", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "vip-companions", name: "VIP Companions", count: 0, description: "Age-restricted premium social companionship profiles.", iconName: "Star", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "dating-companions", name: "Dating Companions", count: 0, description: "Age-restricted dating and public social outing companions.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "party-companions", name: "Party Companions", count: 0, description: "Adult social companions for public events and parties.", iconName: "Star", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "travel-companions", name: "Travel Companions", count: 0, description: "Age-restricted travel companion profiles for adults.", iconName: "Star", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "rent-a-girlfriend", name: "Rent a Girlfriend", count: 1, description: "Adult social companionship and public outing profiles.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "rent-a-boyfriend", name: "Rent a Boyfriend", count: 0, description: "Adult social companionship and public outing profiles.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "massage-services", name: "Massage Services", count: 0, description: "Age-restricted massage service profiles with verification review.", iconName: "Palette", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "adult-massage-services", name: "Adult Massage Services", count: 0, description: "18+ massage and bodywork service profiles for adults.", iconName: "Palette", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "adult-models", name: "Adult Models", count: 0, description: "Age-restricted adult model and portfolio profiles.", iconName: "Star", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true },
  { slug: "social-companions", name: "Social Companions", count: 0, description: "Age-restricted social companionship profiles for adults.", iconName: "HeartPulse", isAdult: true, adultLevel: "AGE_RESTRICTED", minimumAge: 18, showOnHomepage: false, indexable: true }
];

export const publicCountries = [
  { code: "in", name: "India" },
  { code: "us", name: "United States" },
  { code: "ae", name: "United Arab Emirates" }
];

export const publicCities = [
  { country: "in", slug: "delhi", name: "Delhi", aliases: ["delhi", "new delhi", "delhi ncr"] },
  { country: "in", slug: "gurugram", name: "Gurugram", aliases: ["gurugram", "gurgaon"] },
  { country: "in", slug: "mumbai", name: "Mumbai", aliases: ["mumbai", "bombay"] },
  { country: "in", slug: "bangalore", name: "Bangalore", aliases: ["bangalore", "bengaluru"] },
  { country: "us", slug: "new-york", name: "New York", aliases: ["new york", "new york city", "nyc", "manhattan"] },
  { country: "us", slug: "los-angeles", name: "Los Angeles", aliases: ["los angeles", "la"] },
  { country: "ae", slug: "dubai", name: "Dubai", aliases: ["dubai"] }
];

const createdThisWeek = "2026-05-07T10:00:00.000Z";
const createdEarlier = "2026-04-24T10:00:00.000Z";

export const listings: Listing[] = [
  {
    slug: "aditya-pareek",
    name: "Pandit Aditya Pareek",
    ownerName: "Aditya Pareek",
    ownerEmail: "hello@apastro.store",
    categorySlug: "astrologer",
    category: "Astrologers",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.9,
    reviews: 318,
    viewCount: 12840,
    verified: true,
    verificationStatus: "VERIFIED",
    featured: true,
    featuredUntil: "2026-12-31T23:59:59.000Z",
    open: true,
    location: "Delhi NCR, India",
    address: "Delhi NCR, India",
    image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    phone: "+91 92891 09245",
    whatsapp: "+91 92891 09245",
    email: "hello@apastro.store",
    website: "https://apastro.store",
    about: "Fourth-generation astrologer and vastukar offering astrology, vastu, spiritual guidance and premium remedial consultation for families, founders and professionals.",
    shortDescription: "Fourth-generation astrologer and vastukar offering premium consultation in Delhi NCR.",
    services: ["Kundli Analysis", "Vastu Consultation", "Palmistry", "Gemstone Guidance", "Business Astrology"],
    pricing: ["Online consultation from INR 2100", "Vastu visit from INR 11000"],
    hours: ["Mon - Sun: 10:00 AM - 8:00 PM", "Online Consultation Available", "Prior appointment recommended"],
    seoTitle: "Pandit Aditya Pareek - Astrologer in Delhi",
    seoDescription: "Profile page for Pandit Aditya Pareek, fourth-generation astrologer and vastukar.",
    createdAt: createdEarlier
  },
  {
    slug: "vedic-vision-astro",
    name: "Vedic Vision Astro Studio",
    ownerName: "Rashi Mehra",
    ownerEmail: "care@vedicvision.example",
    categorySlug: "astrologer",
    category: "Astrologers",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.7,
    reviews: 142,
    viewCount: 6240,
    verified: true,
    verificationStatus: "VERIFIED",
    featured: false,
    open: true,
    location: "Greater Kailash, Delhi",
    address: "Greater Kailash, Delhi",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98111 22222",
    whatsapp: "+91 98111 22222",
    email: "care@vedicvision.example",
    website: "https://vedicvision.example",
    about: "Modern Vedic astrology studio focused on relationship guidance, career planning, muhurat selection and gemstone recommendations.",
    shortDescription: "Modern Vedic astrology consultations for career, relationship and muhurat guidance.",
    services: ["Career Astrology", "Marriage Matching", "Muhurta", "Gemstone Consultation"],
    pricing: ["Video consultation from INR 1500"],
    hours: ["Mon - Sat: 11:00 AM - 7:00 PM", "Sun: Closed"],
    seoTitle: "Vedic Vision Astro Studio in Delhi",
    seoDescription: "Approved astrology studio in Delhi for Vedic consultation and guidance.",
    createdAt: createdThisWeek
  },
  {
    slug: "karan-malhotra-property-advisor",
    name: "Karan Malhotra Property Advisor",
    ownerName: "Karan Malhotra",
    ownerEmail: "karan@propertyadvisor.example",
    categorySlug: "real-estate-agents",
    category: "Real Estate Agents",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.8,
    reviews: 120,
    viewCount: 5120,
    verified: true,
    verificationStatus: "VERIFIED",
    featured: false,
    open: true,
    location: "Connaught Place, Delhi",
    address: "Connaught Place, Delhi",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98100 00000",
    whatsapp: "+91 98100 00000",
    email: "karan@propertyadvisor.example",
    website: "https://propertyadvisor.example",
    about: "Independent property advisor helping owners, tenants and investors compare residential and commercial opportunities across Delhi NCR.",
    shortDescription: "Independent residential and commercial property advisor across Delhi NCR.",
    services: ["Residential Sales", "Rental Search", "Commercial Leasing", "Site Visits", "Investment Consulting"],
    pricing: ["Brokerage as per property value", "Consulting packages available"],
    hours: ["Mon - Fri: 9:00 AM - 6:00 PM", "Sat: 10:00 AM - 4:00 PM", "Sun: Closed"],
    seoTitle: "Karan Malhotra - Real Estate Agent in Delhi",
    seoDescription: "Independent real estate agent in Delhi for rentals, sales and site visits.",
    createdAt: createdEarlier
  },
  {
    slug: "meera-sethi-makeup-artist",
    name: "Meera Sethi Makeup Artist",
    ownerName: "Meera Sethi",
    ownerEmail: "bookings@meerasethi.example",
    categorySlug: "makeup-artists",
    category: "Makeup Artists",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.6,
    reviews: 89,
    viewCount: 3840,
    verified: true,
    verificationStatus: "VERIFIED",
    featured: false,
    open: true,
    location: "Saket, Delhi",
    address: "Saket, Delhi",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98200 00000",
    whatsapp: "+91 98200 00000",
    email: "bookings@meerasethi.example",
    website: "https://meerasethi.example",
    about: "Freelance makeup artist offering bridal, engagement, party and editorial makeup with trial sessions and venue visits across Delhi.",
    shortDescription: "Bridal and event makeup artist with venue visits across Delhi.",
    services: ["Bridal Makeup", "Party Makeup", "Engagement Look", "Hair Styling", "Makeup Trial"],
    pricing: ["Party makeup from INR 4500", "Bridal package from INR 22000"],
    hours: ["Mon - Sun: 8:00 AM - 9:00 PM", "Advance booking required"],
    seoTitle: "Meera Sethi - Makeup Artist in Delhi",
    seoDescription: "Bridal and event makeup artist in Delhi with trial sessions and venue bookings.",
    createdAt: createdEarlier
  },
  {
    slug: "dr-nisha-arora",
    name: "Dr. Nisha Arora",
    ownerName: "Dr. Nisha Arora",
    ownerEmail: "care@nishaarora.example",
    categorySlug: "doctors",
    category: "Doctors",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "pending",
    rating: 0,
    reviews: 0,
    viewCount: 0,
    verified: false,
    featured: false,
    open: true,
    location: "Greater Kailash, Delhi",
    address: "Greater Kailash, Delhi",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98300 00000",
    whatsapp: "+91 98300 00000",
    email: "care@nishaarora.example",
    website: "https://nishaarora.example",
    about: "General physician profile submitted for admin review with online appointment support and preventive health consultation.",
    shortDescription: "General physician profile pending admin approval.",
    services: ["General Consultation", "Preventive Health", "Online Appointment", "Follow-up Consultation"],
    pricing: ["Consultation from INR 900"],
    hours: ["Mon - Sat: 8:00 AM - 8:00 PM", "Sun: 10:00 AM - 2:00 PM"],
    createdAt: createdThisWeek
  },
  {
    slug: "ananya-rao-fitness-coach",
    name: "Ananya Rao Fitness Coach",
    ownerName: "Ananya Rao",
    ownerEmail: "hello@ananyafit.example",
    categorySlug: "fitness-trainers",
    category: "Fitness Trainers",
    country: "in",
    city: "gurugram",
    cityName: "Gurugram",
    status: "pending",
    rating: 0,
    reviews: 0,
    viewCount: 0,
    verified: false,
    featured: false,
    open: true,
    location: "Sector 56, Gurugram",
    address: "Sector 56, Gurugram",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98400 00000",
    whatsapp: "+91 98400 00000",
    email: "hello@ananyafit.example",
    website: "https://ananyafit.example",
    about: "Personal trainer profile for weight loss, mobility, strength coaching and online fitness plans across Gurugram.",
    shortDescription: "Personal trainer profile pending approval.",
    services: ["Personal Training", "Weight Loss Coaching", "Strength Training", "Online Fitness Plans"],
    pricing: ["Monthly coaching from INR 9000"],
    hours: ["Mon - Sat: 6:00 AM - 8:00 PM", "Online sessions by appointment"],
    createdAt: createdThisWeek
  },
  {
    slug: "rahul-batra-financial-advisor",
    name: "Rahul Batra Financial Advisor",
    ownerName: "Rahul Batra",
    ownerEmail: "hello@rahulfinance.example",
    categorySlug: "financial-advisors",
    category: "Financial Advisors",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "rejected",
    rating: 0,
    reviews: 0,
    viewCount: 0,
    verified: false,
    featured: false,
    open: false,
    location: "Nehru Place, Delhi",
    address: "Nehru Place, Delhi",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80",
    phone: "+91 98500 00000",
    email: "hello@rahulfinance.example",
    website: "https://rahulfinance.example",
    about: "Financial advisor listing awaiting corrected documents after rejection.",
    shortDescription: "Rejected financial advisory profile with missing documents.",
    services: ["Investment Planning", "Insurance Review", "Tax Planning"],
    pricing: ["Planning session from INR 2500"],
    hours: ["Mon - Fri: 10:00 AM - 6:00 PM"],
    rejectionReason: "Incomplete professional verification documents.",
    adminNotes: "Ask owner to submit updated ID and professional certificate.",
    createdAt: createdEarlier
  },
  {
    slug: "olivia-carter-family-doctor",
    name: "Dr. Olivia Carter",
    ownerName: "Dr. Olivia Carter",
    ownerEmail: "care@manhattanwellness.example",
    categorySlug: "doctors",
    category: "Doctors",
    country: "us",
    city: "new-york",
    cityName: "New York",
    status: "approved",
    rating: 4.8,
    reviews: 76,
    viewCount: 2140,
    verified: true,
    verificationStatus: "VERIFIED",
    featured: false,
    open: true,
    location: "Manhattan, New York",
    address: "Manhattan, New York",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    phone: "+1 212 555 0188",
    whatsapp: "+1 212 555 0188",
    email: "care@manhattanwellness.example",
    website: "https://manhattanwellness.example",
    about: "Family doctor in New York offering preventive health, primary care and wellness consultations by appointment.",
    shortDescription: "Family doctor for preventive health and primary care in New York.",
    services: ["Primary Care", "Preventive Health", "Wellness Consultation", "Follow-up Visit"],
    pricing: ["Consultation from USD 180"],
    hours: ["Mon - Fri: 8:00 AM - 6:00 PM", "Sat: 9:00 AM - 2:00 PM"],
    seoTitle: "Dr. Olivia Carter - Doctor in New York",
    seoDescription: "Approved family doctor profile in New York.",
    createdAt: createdThisWeek
  },
  {
    slug: "vikram-singh-car-mechanic",
    name: "Vikram Singh Car Mechanic",
    ownerName: "Vikram Singh",
    ownerEmail: "service@autoelite.example",
    categorySlug: "car-mechanics",
    category: "Car Mechanics",
    country: "in",
    city: "gurugram",
    cityName: "Gurugram",
    status: "suspended",
    rating: 3.8,
    reviews: 41,
    viewCount: 0,
    verified: false,
    featured: false,
    open: false,
    location: "Udyog Vihar, Gurugram",
    address: "Udyog Vihar, Gurugram",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&q=80",
    phone: "+91 98600 00000",
    email: "service@autoelite.example",
    website: "https://autoelite.example",
    about: "Car mechanic profile currently suspended from public directory pages.",
    shortDescription: "Suspended car mechanic profile.",
    services: ["Car Service", "Inspection", "Repairs"],
    pricing: ["Inspection from INR 700"],
    hours: ["Mon - Sat: 9:00 AM - 7:00 PM"],
    adminNotes: "Temporarily suspended after repeated contact complaints.",
    createdAt: createdEarlier
  },
  {
    slug: "delhi-social-companions",
    name: "Delhi Social Companions",
    ownerName: "Aarav Mehta",
    ownerEmail: "hello@socialcompanions.example",
    categorySlug: "rent-a-girlfriend",
    category: "Rent a Girlfriend",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.4,
    reviews: 18,
    viewCount: 940,
    verified: false,
    featured: false,
    open: true,
    location: "South Delhi, Delhi",
    address: "South Delhi, Delhi",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98700 00000",
    whatsapp: "+91 98700 00000",
    email: "hello@socialcompanions.example",
    website: "https://socialcompanions.example",
    about: "Age-restricted social companionship profile for public dates, cafe meetings and event outings. This listing does not offer illegal services.",
    shortDescription: "18+ social companionship and public outing services in Delhi.",
    services: ["Public Date", "Cafe Meet", "Event Companion", "Movie Outing"],
    pricing: ["Public social outing from INR 2500", "Advance booking required"],
    hours: ["Mon - Sun: 12:00 PM - 10:00 PM", "Advance booking required"],
    seoTitle: "Rent a Girlfriend in Delhi - Delhi Social Companions",
    seoDescription: "Age-restricted social companionship profile in Delhi.",
    createdAt: createdThisWeek,
    isAdult: true,
    ageRestricted: true,
    adultLevel: "AGE_RESTRICTED",
    adultDisclaimerAcceptedAt: "2026-05-01T10:00:00.000Z",
    verificationStatus: "PENDING",
    verificationNotes: "Pending ID verification."
  },
  {
    slug: "riya-independent-companion",
    name: "Riya Independent Companion",
    ownerName: "Riya Kapoor",
    ownerEmail: "bookings@riyacompanion.example",
    categorySlug: "female-escorts",
    category: "Female Escorts",
    country: "in",
    city: "delhi",
    cityName: "Delhi",
    status: "approved",
    rating: 4.6,
    reviews: 26,
    viewCount: 1180,
    verified: true,
    featured: true,
    featuredUntil: "2026-09-30T23:59:59.000Z",
    open: true,
    location: "Central Delhi, Delhi",
    address: "Central Delhi, Delhi",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=80",
    coverImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=80",
    avatarImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98700 11111",
    whatsapp: "+91 98700 11111",
    email: "bookings@riyacompanion.example",
    website: "https://riyacompanion.example",
    about: "Age-restricted independent companionship profile for verified adult visitors and public social bookings. This listing does not offer illegal services.",
    shortDescription: "18+ independent companion profile for public social bookings in Delhi.",
    services: ["Public Meeting", "Dinner Companion", "Event Companion", "Travel Companion"],
    pricing: ["Public meeting from INR 4000", "Event packages available"],
    hours: ["Mon - Sun: 11:00 AM - 11:00 PM", "ID verification required before booking"],
    seoTitle: "Female Escorts in Delhi - Riya Independent Companion",
    seoDescription: "Age-restricted independent companionship profile in Delhi.",
    createdAt: createdThisWeek,
    isAdult: true,
    ageRestricted: true,
    adultLevel: "AGE_RESTRICTED",
    adultDisclaimerAcceptedAt: "2026-05-01T10:00:00.000Z",
    verificationStatus: "VERIFIED"
  }
];

export const galleryImages: ProfileGalleryImage[] = [
  { id: "aditya-1", profileSlug: "aditya-pareek", imageUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80", category: "Interior", title: "Consultation room", altText: "Consultation room", sortOrder: 1, isActive: true },
  { id: "aditya-2", profileSlug: "aditya-pareek", imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80", category: "Office", title: "Private consultation office", altText: "Private consultation office", sortOrder: 2, isActive: true },
  { id: "aditya-3", profileSlug: "aditya-pareek", imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80", category: "Team", title: "Consultation support team", altText: "Consultation support team", sortOrder: 3, isActive: true },
  { id: "aditya-4", profileSlug: "aditya-pareek", imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80", category: "Certificates", title: "Professional certificates", altText: "Professional certificates", sortOrder: 4, isActive: true },
  { id: "aditya-5", profileSlug: "aditya-pareek", imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", category: "Work Photos", title: "Vastu site visit", altText: "Vastu site visit", sortOrder: 5, isActive: true },
  { id: "vedic-1", profileSlug: "vedic-vision-astro", imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80", category: "Interior", title: "Studio seating", altText: "Studio seating", sortOrder: 1, isActive: true },
  { id: "vedic-2", profileSlug: "vedic-vision-astro", imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", category: "Office", title: "Consultation desk", altText: "Consultation desk", sortOrder: 2, isActive: true },
  { id: "karan-1", profileSlug: "karan-malhotra-property-advisor", imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", category: "Office", title: "Property advisory office", altText: "Property advisory office", sortOrder: 1, isActive: true },
  { id: "karan-2", profileSlug: "karan-malhotra-property-advisor", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80", category: "Work Photos", title: "Luxury property viewing", altText: "Luxury property viewing", sortOrder: 2, isActive: true },
  { id: "meera-1", profileSlug: "meera-sethi-makeup-artist", imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80", category: "Work Photos", title: "Bridal makeup kit", altText: "Bridal makeup kit", sortOrder: 1, isActive: true },
  { id: "meera-2", profileSlug: "meera-sethi-makeup-artist", imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80", category: "Portfolio", title: "Makeup portfolio", altText: "Makeup portfolio", sortOrder: 2, isActive: true },
  { id: "riya-1", profileSlug: "riya-independent-companion", imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80", category: "Portfolio", title: "Profile portfolio", altText: "Profile portfolio", sortOrder: 1, isActive: true },
  { id: "social-1", profileSlug: "delhi-social-companions", imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80", category: "Work Photos", title: "Public outing planning", altText: "Public outing planning", sortOrder: 1, isActive: true }
];

export const blogPosts = [
  {
    slug: "best-astrologer-in-delhi",
    title: "Best Astrologer in Delhi: How to Choose the Right Expert",
    excerpt: "A practical guide for users comparing trusted astrology and vastu consultation in Delhi.",
    date: "2026-05-08",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "how-to-choose-premium-service-provider",
    title: "How to Choose a Premium Service Provider Near You",
    excerpt: "Ratings, reviews, location signals and verified badges help users make confident decisions.",
    date: "2026-05-02",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
  }
];

export const cityNames: Record<string, string> = {
  delhi: "Delhi",
  gurugram: "Gurugram",
  mumbai: "Mumbai",
  bangalore: "Bangalore",
  "new-york": "New York",
  "los-angeles": "Los Angeles",
  dubai: "Dubai"
};

export const countryNames: Record<string, string> = {
  in: "India",
  us: "United States",
  ae: "United Arab Emirates"
};

export function isApprovedListing(listing: Listing) {
  return listing.status === "approved";
}

export function isIdVerifiedListing(listing: Pick<Listing, "verificationStatus">) {
  return listing.verificationStatus?.toUpperCase() === "VERIFIED";
}

function timestamp(value?: string) {
  const time = value ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function normalizePlacementPath(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === "*" || raw.toUpperCase() === "ALL") return "ALL";
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, "");
  const path = withoutOrigin.startsWith("/") ? withoutOrigin : `/${withoutOrigin}`;
  return path.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
}

export function isFeaturedPlacementCampaignActive(campaign: FeaturedPlacementCampaign, pagePath?: string, now = Date.now()) {
  if (campaign.status?.toUpperCase() !== "ACTIVE") return false;
  const startsAt = timestamp(campaign.startsAt);
  const endsAt = timestamp(campaign.endsAt);
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;

  const normalizedPage = normalizePlacementPath(pagePath);
  const campaignPath = normalizePlacementPath(campaign.pagePath);
  const pageType = campaign.pageType?.toUpperCase();
  if (!normalizedPage) return true;
  return campaignPath === normalizedPage || campaignPath === "ALL" || pageType === "ALL";
}

export function activeFeaturedCampaign(
  listing: Pick<Listing, "featuredPlacementCampaigns">,
  pagePath?: string,
  now = Date.now()
) {
  return (listing.featuredPlacementCampaigns || []).find((campaign) => isFeaturedPlacementCampaignActive(campaign, pagePath, now));
}

function activeFeaturedState(
  listing: Pick<Listing, "featured" | "featuredUntil" | "featuredPlacementCampaigns">,
  now = Date.now(),
  pagePath?: string
) {
  const campaign = activeFeaturedCampaign(listing, pagePath, now);
  if (campaign) return { active: true, endsAt: campaign.endsAt };
  if (pagePath && listing.featuredPlacementCampaigns?.length) return { active: false, endsAt: listing.featuredUntil };
  if (!listing.featured) return false;
  const expiresAt = timestamp(listing.featuredUntil);
  return { active: !expiresAt || expiresAt >= now, endsAt: listing.featuredUntil };
}

export function isFeaturedActive(
  listing: Pick<Listing, "featured" | "featuredUntil" | "featuredPlacementCampaigns">,
  now = Date.now(),
  pagePath?: string
) {
  const state = activeFeaturedState(listing, now, pagePath);
  return typeof state === "boolean" ? state : state.active;
}

export function isFeaturedExpired(listing: Pick<Listing, "featured" | "featuredUntil">, now = Date.now()) {
  if (!listing.featured || !listing.featuredUntil) return false;
  const expiresAt = timestamp(listing.featuredUntil);
  return Boolean(expiresAt && expiresAt < now);
}

export function featuredDaysRemaining(
  listing: Pick<Listing, "featured" | "featuredUntil" | "featuredPlacementCampaigns">,
  now = Date.now(),
  pagePath?: string
) {
  const state = activeFeaturedState(listing, now, pagePath);
  if (typeof state === "boolean" || !state.active) return 0;
  if (!state.endsAt) return null;
  const expiresAt = timestamp(state.endsAt);
  if (!expiresAt) return null;
  return Math.max(Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)), 0);
}

export function sortByFeaturedVisibility(items: Listing[], pagePath?: string) {
  const now = Date.now();
  return [...items].sort((first, second) => {
    const featuredDiff = Number(isFeaturedActive(second, now, pagePath)) - Number(isFeaturedActive(first, now, pagePath));
    if (featuredDiff) return featuredDiff;
    const verifiedDiff = Number(isIdVerifiedListing(second)) - Number(isIdVerifiedListing(first));
    if (verifiedDiff) return verifiedDiff;
    const ratingDiff = second.rating - first.rating;
    if (ratingDiff) return ratingDiff;
    const reviewDiff = second.reviews - first.reviews;
    if (reviewDiff) return reviewDiff;
    return timestamp(second.createdAt) - timestamp(first.createdAt);
  });
}

export function isAdultCategory(category: Category) {
  return Boolean(category.isAdult);
}

export function getStandardCategories() {
  return categories.filter((category) => !category.isAdult && category.showOnHomepage !== false);
}

export function getAdultCategories() {
  return categories.filter((category) => category.isAdult);
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getListing(slug: string, country?: string, city?: string) {
  return listings.find((listing) => {
    const routeMatch = listing.slug === slug;
    const countryMatch = !country || listing.country === country;
    const cityMatch = !city || listing.city === city;
    return routeMatch && countryMatch && cityMatch;
  });
}

export function getListingByPath(slug: string, country: string, city: string, categorySlug: string) {
  return listings.find((listing) => (
    isApprovedListing(listing) &&
    listing.slug === slug &&
    listing.country === country &&
    listing.city === city &&
    listing.categorySlug === categorySlug
  ));
}

export function getListingUrl(listing: Listing) {
  return `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`;
}

export function getListingsByCity(country: string, city: string) {
  return listings.filter((listing) => isApprovedListing(listing) && listing.country === country && listing.city === city);
}

export function getListingsByCategory(country: string, city: string, categorySlug: string) {
  return listings.filter((listing) => isApprovedListing(listing) && listing.country === country && listing.city === city && listing.categorySlug === categorySlug);
}

export function getApprovedListings(options: { includeAdult?: boolean; adultOnly?: boolean } = {}) {
  return listings.filter((listing) => (
    isApprovedListing(listing) &&
    (options.adultOnly ? listing.isAdult : options.includeAdult || !listing.isAdult)
  ));
}

export function getCitiesForCountry(country: string) {
  return publicCities.filter((city) => city.country === country);
}

export function getCategoryCounts(listingPool: Listing[] = getApprovedListings()) {
  return categories.reduce<Record<string, number>>((counts, category) => {
    counts[category.slug] = listingPool.filter((listing) => listing.categorySlug === category.slug).length;
    return counts;
  }, {});
}

export function getCategoriesWithCounts(listingPool: Listing[] = getApprovedListings(), options: { includeAdult?: boolean; adultOnly?: boolean } = {}) {
  const counts = getCategoryCounts(listingPool);
  return categories
    .filter((category) => options.adultOnly ? category.isAdult : options.includeAdult ? true : !category.isAdult)
    .map((category) => ({ ...category, count: counts[category.slug] || 0 }));
}

export function resolveLocation(input: string, fallback = { country: "in", city: "delhi" }) {
  const normalized = input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const city = publicCities.find((item) => item.aliases.some((alias) => normalized.includes(alias)));
  if (city) return { country: city.country, city: city.slug };

  const country = publicCountries.find((item) => normalized.includes(item.name.toLowerCase()) || tokens.includes(item.code));
  if (country) return { country: country.code, city: getCitiesForCountry(country.code)[0]?.slug || fallback.city };

  return fallback;
}

export function getFeaturedListings(country?: string, city?: string, categorySlug?: string) {
  return sortByFeaturedVisibility(listings.filter((listing) => (
    isApprovedListing(listing) &&
    isFeaturedActive(listing) &&
    (!country || listing.country === country) &&
    (!city || listing.city === city) &&
    (!categorySlug || listing.categorySlug === categorySlug)
  )));
}

export function getGalleryByProfileSlug(profileSlug: string) {
  return galleryImages
    .filter((image) => image.profileSlug === profileSlug && image.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const iconMap = {
  BadgeCheck,
  Building2,
  Utensils,
  HeartPulse,
  Palette,
  Car,
  GraduationCap,
  BriefcaseBusiness,
  Star,
  Home
};

export const adminCountries = [
  { code: "in", name: "India", cities: 4, profiles: 10, status: "Active" },
  { code: "us", name: "United States", cities: 2, profiles: 1, status: "Active" },
  { code: "ae", name: "United Arab Emirates", cities: 1, profiles: 0, status: "Draft" }
];

export const adminCities = [
  { slug: "delhi", name: "Delhi", country: "in", profiles: 8, status: "Active" },
  { slug: "gurugram", name: "Gurugram", country: "in", profiles: 2, status: "Active" },
  { slug: "mumbai", name: "Mumbai", country: "in", profiles: 0, status: "Draft" },
  { slug: "bangalore", name: "Bangalore", country: "in", profiles: 0, status: "Draft" },
  { slug: "new-york", name: "New York", country: "us", profiles: 1, status: "Active" },
  { slug: "los-angeles", name: "Los Angeles", country: "us", profiles: 0, status: "Draft" },
  { slug: "dubai", name: "Dubai", country: "ae", profiles: 0, status: "Draft" }
];
