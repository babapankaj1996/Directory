export type PricingMode = {
  value: string;
  label: string;
  suffix: string;
  amountLabel?: string;
};

export type CategoryProfileConfig = {
  title: string;
  guidance: string;
  serviceLabel: string;
  serviceSuggestions: string[];
  pricingLabel: string;
  pricingItemPlaceholder: string;
  defaultCurrency: string;
  pricingModes: PricingMode[];
  hoursPresets: {
    label: string;
    lines: string[];
  }[];
};

const commonModes: PricingMode[] = [
  { value: "fixed", label: "Fixed price", suffix: "fixed price" },
  { value: "hourly", label: "Hourly", suffix: "per hour" },
  { value: "session", label: "Per session", suffix: "per session" },
  { value: "package", label: "Package", suffix: "package" },
  { value: "from", label: "Starting from", suffix: "starting price" }
];

const consultationModes: PricingMode[] = [
  { value: "session", label: "Per session", suffix: "per session" },
  { value: "hourly", label: "Hourly", suffix: "per hour" },
  { value: "package", label: "Package", suffix: "package" },
  { value: "from", label: "Starts from", suffix: "starting price" }
];

const projectModes: PricingMode[] = [
  { value: "fixed", label: "Fixed project", suffix: "fixed project fee" },
  { value: "hourly", label: "Hourly", suffix: "per hour" },
  { value: "package", label: "Package", suffix: "package" },
  { value: "from", label: "Starts from", suffix: "starting price" }
];

const visitModes: PricingMode[] = [
  { value: "visit", label: "Per visit", suffix: "per visit" },
  { value: "fixed", label: "Fixed service", suffix: "fixed price" },
  { value: "hourly", label: "Hourly", suffix: "per hour" },
  { value: "from", label: "Starts from", suffix: "starting price" }
];

const adultModes: PricingMode[] = [
  { value: "hourly", label: "Hourly", suffix: "per hour" },
  { value: "session", label: "Per booking", suffix: "per booking" },
  { value: "package", label: "Package", suffix: "package" },
  { value: "from", label: "Starts from", suffix: "starting price" }
];

const businessHours = [
  { label: "Business hours", lines: ["Mon - Fri: 9:00 AM - 6:00 PM", "Sat: 10:00 AM - 4:00 PM", "Sun: Closed"] },
  { label: "Daily", lines: ["Mon - Sun: 10:00 AM - 8:00 PM"] },
  { label: "Appointment only", lines: ["By appointment only", "Online and in-person appointments available"] }
];

const fieldVisitHours = [
  { label: "Field visits", lines: ["Mon - Sat: 9:00 AM - 7:00 PM", "Site visits by appointment"] },
  { label: "Daily support", lines: ["Mon - Sun: 9:00 AM - 8:00 PM"] },
  { label: "Emergency", lines: ["Mon - Sun: 24 hours", "Emergency calls by availability"] }
];

const adultHours = [
  { label: "Advance booking", lines: ["Mon - Sun: 12:00 PM - 10:00 PM", "Advance booking and ID verification required"] },
  { label: "Evening bookings", lines: ["Mon - Sun: 5:00 PM - 11:00 PM", "Public meeting locations only"] },
  { label: "Appointment only", lines: ["By appointment only", "18+ verification required before confirmation"] }
];

type ServiceConfigInput = Omit<CategoryProfileConfig, "defaultCurrency" | "pricingModes" | "hoursPresets"> & {
  defaultCurrency?: string;
  pricingModes?: PricingMode[];
  hoursPresets?: CategoryProfileConfig["hoursPresets"];
};

function serviceConfig({
  title,
  guidance,
  serviceLabel,
  serviceSuggestions,
  pricingLabel,
  pricingItemPlaceholder,
  pricingModes = commonModes,
  hoursPresets = businessHours
}: ServiceConfigInput) {
  return {
    title,
    guidance,
    serviceLabel,
    serviceSuggestions,
    pricingLabel,
    pricingItemPlaceholder,
    defaultCurrency: "INR",
    pricingModes,
    hoursPresets
  };
}

function adultCompanionConfig(title: string, serviceSuggestions: string[]) {
  return serviceConfig({
    title,
    guidance: "Add only legal 18+ services, public meeting rules, verification requirements, availability and booking boundaries. Government ID and latest DOB photo are required for admin review.",
    serviceLabel: "18+ service options",
    serviceSuggestions,
    pricingLabel: "Booking pricing",
    pricingItemPlaceholder: "Public meeting",
    pricingModes: adultModes,
    hoursPresets: adultHours
  });
}

export const categoryProfileConfig: Record<string, CategoryProfileConfig> = {
  astrologer: serviceConfig({
    title: "Astrology profile details",
    guidance: "Add consultation systems, languages, online/offline modes, remedies, certificates and appointment rules.",
    serviceLabel: "Consultation services",
    serviceSuggestions: ["Kundli Analysis", "Vastu Consultation", "Palmistry", "Marriage Matching", "Gemstone Guidance", "Business Astrology", "Muhurat Selection", "Online Consultation"],
    pricingLabel: "Consultation pricing",
    pricingItemPlaceholder: "Kundli consultation",
    pricingModes: [
      { value: "session", label: "Per session", suffix: "per session" },
      { value: "fixed", label: "Fixed report", suffix: "fixed report price" },
      { value: "visit", label: "Site visit", suffix: "per visit" },
      { value: "from", label: "Starts from", suffix: "starting price" }
    ],
    hoursPresets: [
      { label: "Daily consultation", lines: ["Mon - Sun: 10:00 AM - 8:00 PM", "Online Consultation Available", "Prior appointment recommended"] },
      { label: "Weekday only", lines: ["Mon - Fri: 10:00 AM - 6:00 PM", "Sat - Sun: Closed"] },
      { label: "Appointment only", lines: ["By appointment only", "Online and in-person consultation available"] }
    ]
  }),
  lawyers: serviceConfig({
    title: "Legal profile details",
    guidance: "Add practice areas, court or documentation focus, licence details, consultation process and appointment rules.",
    serviceLabel: "Legal services",
    serviceSuggestions: ["Legal Consultation", "Document Drafting", "Property Law", "Family Law", "Corporate Law", "Court Representation", "Notary Support", "Contract Review"],
    pricingLabel: "Legal pricing",
    pricingItemPlaceholder: "Legal consultation",
    pricingModes: consultationModes
  }),
  doctors: serviceConfig({
    title: "Doctor profile details",
    guidance: "Add specialties, appointment flow, registration proof, online consultation, follow-up rules and patient facilities.",
    serviceLabel: "Healthcare services",
    serviceSuggestions: ["General Consultation", "Online Appointment", "Preventive Health", "Follow-up Visit", "Diagnostics Review", "Family Care", "Wellness Consultation", "Vaccination"],
    pricingLabel: "Consultation pricing",
    pricingItemPlaceholder: "Doctor consultation",
    pricingModes: consultationModes,
    hoursPresets: [
      { label: "Clinic hours", lines: ["Mon - Sat: 8:00 AM - 8:00 PM", "Sun: 10:00 AM - 2:00 PM"] },
      { label: "Weekday clinic", lines: ["Mon - Fri: 9:00 AM - 6:00 PM", "Sat - Sun: Closed"] },
      { label: "Appointment only", lines: ["By appointment only", "Online consultation available"] }
    ]
  }),
  "home-tutors": serviceConfig({
    title: "Tutor profile details",
    guidance: "Add subjects, grade level, teaching mode, demo class, language, batch size and parent communication rules.",
    serviceLabel: "Teaching services",
    serviceSuggestions: ["Home Tuition", "Online Classes", "Math Tutoring", "Science Tutoring", "Exam Preparation", "Language Classes", "Demo Class", "Homework Support"],
    pricingLabel: "Tuition pricing",
    pricingItemPlaceholder: "Monthly tuition",
    pricingModes: [
      { value: "monthly", label: "Monthly", suffix: "per month" },
      { value: "hourly", label: "Hourly", suffix: "per hour" },
      { value: "package", label: "Course package", suffix: "course package" },
      { value: "from", label: "Starts from", suffix: "starting price" }
    ]
  }),
  "makeup-artists": serviceConfig({
    title: "Makeup artist profile details",
    guidance: "Add event type, product brands, travel availability, trial rules, portfolio proof and booking advance.",
    serviceLabel: "Makeup services",
    serviceSuggestions: ["Bridal Makeup", "Party Makeup", "Engagement Look", "Hair Styling", "Makeup Trial", "Editorial Makeup", "Venue Visit", "Saree Draping"],
    pricingLabel: "Makeup pricing",
    pricingItemPlaceholder: "Party makeup",
    pricingModes: projectModes,
    hoursPresets: [
      { label: "Daily bookings", lines: ["Mon - Sun: 8:00 AM - 9:00 PM", "Advance booking required"] },
      { label: "Wedding season", lines: ["Mon - Sun: 6:00 AM - 11:00 PM", "Venue visits by appointment"] },
      { label: "Studio only", lines: ["Mon - Sat: 10:00 AM - 8:00 PM", "Sun: Appointment only"] }
    ]
  }),
  photographers: serviceConfig({
    title: "Photographer profile details",
    guidance: "Add shoot type, editing timelines, deliverables, equipment, portfolio proof and travel rules.",
    serviceLabel: "Photography services",
    serviceSuggestions: ["Wedding Photography", "Event Photography", "Portrait Shoot", "Product Shoot", "Pre-wedding Shoot", "Video Coverage", "Photo Editing", "Album Design"],
    pricingLabel: "Shoot pricing",
    pricingItemPlaceholder: "Event shoot",
    pricingModes: projectModes
  }),
  "fitness-trainers": serviceConfig({
    title: "Fitness trainer profile details",
    guidance: "Add training style, certifications, diet support, online/offline sessions, health limitations and progress tracking.",
    serviceLabel: "Training services",
    serviceSuggestions: ["Personal Training", "Weight Loss Coaching", "Strength Training", "Yoga Classes", "Mobility Training", "Online Fitness Plan", "Diet Support", "Home Training"],
    pricingLabel: "Training pricing",
    pricingItemPlaceholder: "Monthly coaching",
    pricingModes: consultationModes,
    hoursPresets: [
      { label: "Morning/evening", lines: ["Mon - Sat: 6:00 AM - 10:00 AM", "Mon - Sat: 5:00 PM - 9:00 PM"] },
      { label: "Daily coaching", lines: ["Mon - Sun: 6:00 AM - 8:00 PM", "Online sessions available"] },
      { label: "Appointment only", lines: ["By appointment only", "Trial session available"] }
    ]
  }),
  "real-estate-agents": serviceConfig({
    title: "Real estate agent profile details",
    guidance: "Add property type, service area, brokerage model, RERA/licence details, owner verification and site visit process.",
    serviceLabel: "Property services",
    serviceSuggestions: ["Residential Sales", "Rental Search", "Commercial Leasing", "Property Management", "Investment Consulting", "RERA Advisory", "Site Visits", "Property Valuation"],
    pricingLabel: "Brokerage and advisory pricing",
    pricingItemPlaceholder: "Residential brokerage",
    pricingModes: [
      { value: "commission", label: "Commission", suffix: "commission", amountLabel: "Percent" },
      { value: "fixed", label: "Fixed advisory", suffix: "fixed advisory fee" },
      { value: "package", label: "Management package", suffix: "package" },
      { value: "free", label: "Free estimate", suffix: "free estimate" }
    ],
    hoursPresets: fieldVisitHours
  }),
  "financial-advisors": serviceConfig({
    title: "Financial advisor profile details",
    guidance: "Add advisory area, licences, client type, risk approach, appointment process and required disclaimers.",
    serviceLabel: "Financial services",
    serviceSuggestions: ["Investment Planning", "Insurance Review", "Tax Planning", "Retirement Planning", "Portfolio Review", "SIP Planning", "Loan Advisory", "Business Finance"],
    pricingLabel: "Advisory pricing",
    pricingItemPlaceholder: "Planning session",
    pricingModes: consultationModes
  }),
  "web-designers": serviceConfig({
    title: "Web designer profile details",
    guidance: "Add platform skills, portfolio links, revision rules, timelines, deliverables and maintenance options.",
    serviceLabel: "Web design services",
    serviceSuggestions: ["Business Website", "Landing Page", "UI Design", "WordPress Website", "Ecommerce Website", "Website Redesign", "Maintenance", "SEO Setup"],
    pricingLabel: "Project pricing",
    pricingItemPlaceholder: "Business website",
    pricingModes: projectModes
  }),
  "digital-marketers": serviceConfig({
    title: "Digital marketer profile details",
    guidance: "Add channels, campaign setup, reporting cadence, ad spend handling, SEO scope and portfolio proof.",
    serviceLabel: "Marketing services",
    serviceSuggestions: ["SEO", "Google Ads", "Meta Ads", "Social Media Management", "Lead Generation", "Content Marketing", "Local SEO", "Analytics Setup"],
    pricingLabel: "Marketing pricing",
    pricingItemPlaceholder: "SEO package",
    pricingModes: projectModes
  }),
  electricians: serviceConfig({
    title: "Electrician profile details",
    guidance: "Add repair type, emergency support, service radius, safety process, material policy and visit charges.",
    serviceLabel: "Electrical services",
    serviceSuggestions: ["Wiring Repair", "Switchboard Repair", "Fan Installation", "Lighting Setup", "Inverter Setup", "Emergency Repair", "Inspection", "Commercial Maintenance"],
    pricingLabel: "Visit and repair pricing",
    pricingItemPlaceholder: "Service visit",
    pricingModes: visitModes,
    hoursPresets: fieldVisitHours
  }),
  plumbers: serviceConfig({
    title: "Plumber profile details",
    guidance: "Add repair type, emergency support, service radius, material policy and visit charges.",
    serviceLabel: "Plumbing services",
    serviceSuggestions: ["Leak Repair", "Tap Installation", "Bathroom Fitting", "Drain Cleaning", "Water Tank Repair", "Emergency Repair", "Inspection", "Commercial Maintenance"],
    pricingLabel: "Visit and repair pricing",
    pricingItemPlaceholder: "Service visit",
    pricingModes: visitModes,
    hoursPresets: fieldVisitHours
  }),
  "car-mechanics": serviceConfig({
    title: "Car mechanic profile details",
    guidance: "Add vehicle types, repair categories, inspection process, pickup/drop, warranty, parts quality and labor pricing.",
    serviceLabel: "Automotive services",
    serviceSuggestions: ["Car Service", "Inspection", "Repairs", "Detailing", "Wheel Alignment", "Battery Replacement", "Pickup and Drop", "Insurance Repair"],
    pricingLabel: "Service and labor pricing",
    pricingItemPlaceholder: "General inspection",
    pricingModes: visitModes,
    hoursPresets: fieldVisitHours
  }),
  "interior-designers": serviceConfig({
    title: "Interior designer profile details",
    guidance: "Add space type, design process, site visits, vendor handling, timelines, portfolio proof and project budget range.",
    serviceLabel: "Interior services",
    serviceSuggestions: ["Home Interiors", "Office Interiors", "Modular Kitchen", "3D Design", "Site Visit", "Renovation", "Furniture Planning", "Turnkey Project"],
    pricingLabel: "Design pricing",
    pricingItemPlaceholder: "Design consultation",
    pricingModes: projectModes,
    hoursPresets: fieldVisitHours
  }),
  "event-planners": serviceConfig({
    title: "Event planner profile details",
    guidance: "Add event type, vendor network, planning scope, guest size, decor options and booking advance.",
    serviceLabel: "Event services",
    serviceSuggestions: ["Wedding Planning", "Birthday Party", "Corporate Event", "Decor Management", "Vendor Coordination", "Venue Search", "Event Hosting", "Travel Planning"],
    pricingLabel: "Event pricing",
    pricingItemPlaceholder: "Event planning",
    pricingModes: projectModes
  }),
  "female-escorts": adultCompanionConfig("Female escort profile details", ["Public Meeting", "Dinner Companion", "Event Companion", "Travel Companion", "Social Outing", "VIP Booking"]),
  "male-escorts": adultCompanionConfig("Male escort profile details", ["Public Meeting", "Dinner Companion", "Event Companion", "Travel Companion", "Social Outing", "VIP Booking"]),
  "trans-escorts": adultCompanionConfig("Trans escort profile details", ["Public Meeting", "Dinner Companion", "Event Companion", "Travel Companion", "Social Outing", "VIP Booking"]),
  "independent-escorts": adultCompanionConfig("Independent escort profile details", ["Public Meeting", "Dinner Companion", "Event Companion", "Travel Companion", "Independent Booking", "VIP Booking"]),
  "vip-companions": adultCompanionConfig("VIP companion profile details", ["VIP Booking", "Event Companion", "Dinner Companion", "Travel Companion", "Public Meeting", "Social Outing"]),
  "dating-companions": adultCompanionConfig("Dating companion profile details", ["Public Date", "Cafe Meet", "Dinner Companion", "Movie Outing", "Event Companion", "Social Outing"]),
  "party-companions": adultCompanionConfig("Party companion profile details", ["Party Companion", "Event Companion", "Club Outing", "Public Meeting", "Social Outing", "Group Event"]),
  "travel-companions": adultCompanionConfig("Travel companion profile details", ["Travel Companion", "Day Trip", "Public Outing", "Dinner Companion", "Event Companion", "Itinerary Support"]),
  "rent-a-girlfriend": adultCompanionConfig("Rent a girlfriend profile details", ["Public Date", "Cafe Meet", "Dinner Companion", "Movie Outing", "Event Companion", "Social Outing"]),
  "rent-a-boyfriend": adultCompanionConfig("Rent a boyfriend profile details", ["Public Date", "Cafe Meet", "Dinner Companion", "Movie Outing", "Event Companion", "Social Outing"]),
  "massage-services": serviceConfig({
    title: "Massage service profile details",
    guidance: "Add only legal 18+ service details, therapist verification, location rules, hygiene practices, booking limits and admin-verifiable documents.",
    serviceLabel: "Massage services",
    serviceSuggestions: ["Relaxation Massage", "Deep Tissue Massage", "Aromatherapy", "Home Visit", "Studio Booking", "Wellness Package"],
    pricingLabel: "Massage pricing",
    pricingItemPlaceholder: "Relaxation massage",
    pricingModes: adultModes,
    hoursPresets: adultHours
  }),
  "adult-massage-services": serviceConfig({
    title: "Adult massage profile details",
    guidance: "Add only legal 18+ service details, boundaries, verification documents, hygiene practices, location rules and booking limits.",
    serviceLabel: "18+ massage services",
    serviceSuggestions: ["Adult Massage", "Wellness Session", "Studio Booking", "Home Visit", "Relaxation Package", "VIP Booking"],
    pricingLabel: "Booking pricing",
    pricingItemPlaceholder: "Adult massage booking",
    pricingModes: adultModes,
    hoursPresets: adultHours
  }),
  "adult-models": adultCompanionConfig("Adult model profile details", ["Portfolio Booking", "Event Appearance", "Brand Shoot", "Public Event", "Photo Session", "VIP Booking"]),
  "social-companions": adultCompanionConfig("Social companion profile details", ["Public Meeting", "Cafe Meet", "Dinner Companion", "Movie Outing", "Event Companion", "Social Outing"])
};

export const defaultCategoryProfileConfig: CategoryProfileConfig = {
  title: "Profile details",
  guidance: "Add the services, pricing, timing, proof of work and business information customers need before contacting you.",
  serviceLabel: "Services",
  serviceSuggestions: ["Consultation", "Online Appointment", "Support", "Custom Service", "Packages", "Home Visit"],
  pricingLabel: "Pricing",
  pricingItemPlaceholder: "Service name",
  defaultCurrency: "INR",
  pricingModes: commonModes,
  hoursPresets: businessHours
};

export function getCategoryProfileConfig(categorySlug?: string) {
  return categoryProfileConfig[categorySlug || ""] || defaultCategoryProfileConfig;
}
