import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function gallery(imageUrl, category, title, sortOrder) {
  return {
    imageUrl,
    category,
    title,
    altText: title,
    sortOrder,
    isActive: true
  };
}

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const ownerPasswordHash = await bcrypt.hash('Owner@12345', 10);
  const reviewerPasswordHash = await bcrypt.hash('Review@12345', 10);

  await prisma.profile.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: 'codex-' } },
        { ownerEmail: { contains: 'codex-', mode: 'insensitive' } }
      ]
    }
  });
  await prisma.user.deleteMany({
    where: {
      email: { contains: 'codex-', mode: 'insensitive' }
    }
  });
  await prisma.category.deleteMany({
    where: {
      slug: { startsWith: 'codex-' }
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminPasswordHash, role: 'ADMIN', status: 'ACTIVE', emailVerified: true },
    create: {
      name: 'Directory Admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: { passwordHash: ownerPasswordHash, role: 'OWNER', status: 'ACTIVE', emailVerified: true },
    create: {
      name: 'Demo Business Owner',
      email: 'owner@example.com',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  const reviewerUser = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: { passwordHash: reviewerPasswordHash, role: 'USER', status: 'ACTIVE', emailVerified: true },
    create: {
      name: 'Demo Review User',
      email: 'reviewer@example.com',
      passwordHash: reviewerPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  const countries = [
    { code: 'in', name: 'India', status: 'ACTIVE' },
    { code: 'us', name: 'United States', status: 'ACTIVE' },
    { code: 'ae', name: 'United Arab Emirates', status: 'DRAFT' }
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: country,
      create: {
        ...country,
        seoTitle: `${country.name} Directory`,
        seoDesc: `Find verified service providers in ${country.name}.`
      }
    });
  }

  const citySeeds = [
    { countryCode: 'in', slug: 'delhi', name: 'Delhi', status: 'ACTIVE' },
    { countryCode: 'in', slug: 'gurugram', name: 'Gurugram', status: 'ACTIVE' },
    { countryCode: 'in', slug: 'mumbai', name: 'Mumbai', status: 'DRAFT' },
    { countryCode: 'in', slug: 'bangalore', name: 'Bangalore', status: 'DRAFT' },
    { countryCode: 'us', slug: 'new-york', name: 'New York', status: 'ACTIVE' },
    { countryCode: 'us', slug: 'los-angeles', name: 'Los Angeles', status: 'DRAFT' },
    { countryCode: 'ae', slug: 'dubai', name: 'Dubai', status: 'DRAFT' }
  ];

  const cities = {};
  for (const city of citySeeds) {
    const saved = await prisma.city.upsert({
      where: { countryCode_slug: { countryCode: city.countryCode, slug: city.slug } },
      update: city,
      create: {
        ...city,
        seoTitle: `${city.name} Directory`,
        seoDesc: `Find verified service providers in ${city.name}.`
      }
    });
    cities[`${saved.countryCode}:${saved.slug}`] = saved;
  }

  const removedCategorySlugs = [
    'real-estate',
    'restaurants',
    'healthcare',
    'beauty-spa',
    'automotive',
    'education',
    'consultants',
    'dating-service',
    'movie-date',
    'cuddling-service'
  ];
  await prisma.profile.deleteMany({ where: { categoryId: { in: removedCategorySlugs } } });
  await prisma.category.deleteMany({ where: { slug: { in: removedCategorySlugs } } });

  const categories = [
    { slug: 'astrologer', name: 'Astrologers', description: 'Trusted astrology, vastu and spiritual consultation experts.', iconName: 'BadgeCheck', status: 'ACTIVE' },
    { slug: 'lawyers', name: 'Lawyers', description: 'Verified legal consultants, advocates and documentation experts.', iconName: 'BriefcaseBusiness', status: 'ACTIVE' },
    { slug: 'doctors', name: 'Doctors', description: 'Doctors, clinics and healthcare professionals for appointments.', iconName: 'HeartPulse', status: 'ACTIVE' },
    { slug: 'home-tutors', name: 'Home Tutors', description: 'Private tutors, subject experts and online learning providers.', iconName: 'GraduationCap', status: 'ACTIVE' },
    { slug: 'makeup-artists', name: 'Makeup Artists', description: 'Bridal, party and event makeup artists with portfolios.', iconName: 'Palette', status: 'ACTIVE' },
    { slug: 'photographers', name: 'Photographers', description: 'Wedding, event, portrait and commercial photographers.', iconName: 'Star', status: 'ACTIVE' },
    { slug: 'fitness-trainers', name: 'Fitness Trainers', description: 'Personal trainers, yoga coaches and wellness instructors.', iconName: 'HeartPulse', status: 'ACTIVE' },
    { slug: 'real-estate-agents', name: 'Real Estate Agents', description: 'Property advisors, brokers and rental consultants.', iconName: 'Building2', status: 'ACTIVE' },
    { slug: 'financial-advisors', name: 'Financial Advisors', description: 'Tax, insurance, investment and finance planning professionals.', iconName: 'BriefcaseBusiness', status: 'ACTIVE' },
    { slug: 'web-designers', name: 'Web Designers', description: 'Website, landing page and UI design service providers.', iconName: 'Home', status: 'ACTIVE' },
    { slug: 'digital-marketers', name: 'Digital Marketers', description: 'SEO, ads, social media and lead generation experts.', iconName: 'Star', status: 'ACTIVE' },
    { slug: 'electricians', name: 'Electricians', description: 'Residential and commercial electrical repair specialists.', iconName: 'Home', status: 'ACTIVE' },
    { slug: 'plumbers', name: 'Plumbers', description: 'Plumbing repair, fitting and emergency maintenance providers.', iconName: 'Home', status: 'ACTIVE' },
    { slug: 'car-mechanics', name: 'Car Mechanics', description: 'Car repair, inspection, detailing and maintenance specialists.', iconName: 'Car', status: 'ACTIVE' },
    { slug: 'interior-designers', name: 'Interior Designers', description: 'Home, office and commercial interior design professionals.', iconName: 'Building2', status: 'ACTIVE' },
    { slug: 'event-planners', name: 'Event Planners', description: 'Wedding, party and corporate event planning experts.', iconName: 'Star', status: 'ACTIVE' },
    { slug: 'female-escorts', name: 'Female Escorts', description: 'Age-restricted adult companionship profiles for verified visitors.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'male-escorts', name: 'Male Escorts', description: 'Age-restricted male companionship profiles for adults.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'trans-escorts', name: 'Trans Escorts', description: 'Age-restricted trans companionship profiles for adults.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'independent-escorts', name: 'Independent Escorts', description: 'Independent adult companionship profiles with admin review.', iconName: 'Star', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'vip-companions', name: 'VIP Companions', description: 'Age-restricted premium social companionship profiles.', iconName: 'Star', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'dating-companions', name: 'Dating Companions', description: 'Age-restricted dating and public social outing companions.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'party-companions', name: 'Party Companions', description: 'Adult social companions for public events and parties.', iconName: 'Star', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'travel-companions', name: 'Travel Companions', description: 'Age-restricted travel companion profiles for adults.', iconName: 'Star', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'rent-a-girlfriend', name: 'Rent a Girlfriend', description: 'Adult social companionship and public outing profiles.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'rent-a-boyfriend', name: 'Rent a Boyfriend', description: 'Adult social companionship and public outing profiles.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'massage-services', name: 'Massage Services', description: 'Age-restricted massage service profiles with verification review.', iconName: 'Palette', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'adult-massage-services', name: 'Adult Massage Services', description: '18+ massage and bodywork service profiles for adults.', iconName: 'Palette', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'adult-models', name: 'Adult Models', description: 'Age-restricted adult model and portfolio profiles.', iconName: 'Star', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true },
    { slug: 'social-companions', name: 'Social Companions', description: 'Age-restricted social companionship profiles for adults.', iconName: 'HeartPulse', status: 'ACTIVE', isAdult: true, adultLevel: 'AGE_RESTRICTED', minimumAge: 18, showOnHomepage: false, indexable: true }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: {
        ...category,
        seoTitle: `${category.name} Directory`,
        seoDesc: `Find trusted ${category.name} near you.`
      }
    });
  }

  const profileSeeds = [
    {
      slug: 'aditya-pareek',
      name: 'Pandit Aditya Pareek',
      ownerName: 'Aditya Pareek',
      ownerEmail: 'hello@apastro.store',
      ownerUserId: ownerUser.id,
      phone: '+91 92891 09245',
      whatsapp: '+91 92891 09245',
      website: 'https://apastro.store',
      address: 'Delhi NCR, India',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'astrologer',
      status: 'APPROVED',
      isFeatured: true,
      featuredUntil: new Date('2026-12-31T23:59:59.000Z'),
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      reviewCount: 318,
      viewCount: 12840,
      description: 'Fourth-generation astrologer and vastukar offering astrology, vastu, spiritual guidance and premium remedial consultation for families, founders and professionals.',
      shortDescription: 'Fourth-generation astrologer and vastukar offering premium consultation in Delhi NCR.',
      services: ['Kundli Analysis', 'Vastu Consultation', 'Palmistry', 'Gemstone Guidance', 'Business Astrology'],
      pricing: ['Online consultation from INR 2100', 'Vastu visit from INR 11000'],
      businessHours: ['Mon - Sun: 10:00 AM - 8:00 PM', 'Online Consultation Available', 'Prior appointment recommended'],
      seoTitle: 'Pandit Aditya Pareek - Astrologer in Delhi',
      seoDescription: 'Profile page for Pandit Aditya Pareek, fourth-generation astrologer and vastukar.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80', 'Interior', 'Consultation room', 1),
        gallery('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80', 'Office', 'Private consultation office', 2),
        gallery('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', 'Team', 'Consultation support team', 3),
        gallery('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80', 'Certificates', 'Professional certificates', 4),
        gallery('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Vastu site visit', 5)
      ]
    },
    {
      slug: 'vedic-vision-astro',
      name: 'Vedic Vision Astro Studio',
      ownerName: 'Rashi Mehra',
      ownerEmail: 'care@vedicvision.example',
      phone: '+91 98111 22222',
      whatsapp: '+91 98111 22222',
      website: 'https://vedicvision.example',
      address: 'Greater Kailash, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'astrologer',
      status: 'APPROVED',
      isFeatured: false,
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      rating: 4.7,
      reviewCount: 142,
      viewCount: 6240,
      description: 'Modern Vedic astrology studio focused on relationship guidance, career planning, muhurat selection and gemstone recommendations.',
      shortDescription: 'Modern Vedic astrology consultations for career, relationship and muhurat guidance.',
      services: ['Career Astrology', 'Marriage Matching', 'Muhurta', 'Gemstone Consultation'],
      pricing: ['Video consultation from INR 1500'],
      businessHours: ['Mon - Sat: 11:00 AM - 7:00 PM', 'Sun: Closed'],
      seoTitle: 'Vedic Vision Astro Studio in Delhi',
      seoDescription: 'Approved astrology studio in Delhi for Vedic consultation and guidance.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80', 'Interior', 'Studio seating', 1),
        gallery('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80', 'Office', 'Consultation desk', 2),
        gallery('https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Client guidance session', 3)
      ]
    },
    {
      slug: 'karan-malhotra-property-advisor',
      name: 'Karan Malhotra Property Advisor',
      ownerName: 'Karan Malhotra',
      ownerEmail: 'karan@propertyadvisor.example',
      phone: '+91 98100 00000',
      whatsapp: '+91 98100 00000',
      website: 'https://propertyadvisor.example',
      address: 'Connaught Place, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'real-estate-agents',
      status: 'APPROVED',
      isFeatured: false,
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      rating: 4.8,
      reviewCount: 120,
      viewCount: 5120,
      description: 'Independent property advisor helping owners, tenants and investors compare residential and commercial opportunities across Delhi NCR.',
      shortDescription: 'Independent residential and commercial property advisor across Delhi NCR.',
      services: ['Residential Sales', 'Rental Search', 'Commercial Leasing', 'Site Visits', 'Investment Consulting'],
      pricing: ['Brokerage as per property value', 'Consulting packages available'],
      businessHours: ['Mon - Fri: 9:00 AM - 6:00 PM', 'Sat: 10:00 AM - 4:00 PM', 'Sun: Closed'],
      seoTitle: 'Karan Malhotra - Real Estate Agent in Delhi',
      seoDescription: 'Independent real estate agent in Delhi for rentals, sales and site visits.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80', 'Office', 'Property advisory office', 1),
        gallery('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Luxury property viewing', 2),
        gallery('https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80', 'Interior', 'Client lounge', 3)
      ]
    },
    {
      slug: 'meera-sethi-makeup-artist',
      name: 'Meera Sethi Makeup Artist',
      ownerName: 'Meera Sethi',
      ownerEmail: 'bookings@meerasethi.example',
      phone: '+91 98200 00000',
      whatsapp: '+91 98200 00000',
      website: 'https://meerasethi.example',
      address: 'Saket, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'makeup-artists',
      status: 'APPROVED',
      isFeatured: false,
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
      rating: 4.6,
      reviewCount: 89,
      viewCount: 3840,
      description: 'Freelance makeup artist offering bridal, engagement, party and editorial makeup with trial sessions and venue visits across Delhi.',
      shortDescription: 'Bridal and event makeup artist with venue visits across Delhi.',
      services: ['Bridal Makeup', 'Party Makeup', 'Engagement Look', 'Hair Styling', 'Makeup Trial'],
      pricing: ['Party makeup from INR 4500', 'Bridal package from INR 22000'],
      businessHours: ['Mon - Sun: 8:00 AM - 9:00 PM', 'Advance booking required'],
      seoTitle: 'Meera Sethi - Makeup Artist in Delhi',
      seoDescription: 'Bridal and event makeup artist in Delhi with trial sessions and venue bookings.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Bridal makeup kit', 1),
        gallery('https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80', 'Portfolio', 'Makeup portfolio', 2)
      ]
    },
    {
      slug: 'dr-nisha-arora',
      name: 'Dr. Nisha Arora',
      ownerName: 'Dr. Nisha Arora',
      ownerEmail: 'care@nishaarora.example',
      ownerUserId: null,
      phone: '+91 98300 00000',
      whatsapp: '+91 98300 00000',
      website: 'https://nishaarora.example',
      address: 'Greater Kailash, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'doctors',
      status: 'PENDING',
      isFeatured: false,
      coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      rating: 0,
      reviewCount: 0,
      viewCount: 0,
      description: 'General physician profile submitted for admin review with online appointment support and preventive health consultation.',
      shortDescription: 'General physician profile pending admin approval.',
      services: ['General Consultation', 'Preventive Health', 'Online Appointment', 'Follow-up Consultation'],
      pricing: ['Consultation from INR 900'],
      businessHours: ['Mon - Sat: 8:00 AM - 8:00 PM', 'Sun: 10:00 AM - 2:00 PM'],
      seoTitle: 'Dr. Nisha Arora in Delhi',
      seoDescription: 'Doctor profile submitted for review in Delhi.'
    },
    {
      slug: 'ananya-rao-fitness-coach',
      name: 'Ananya Rao Fitness Coach',
      ownerName: 'Ananya Rao',
      ownerEmail: 'hello@ananyafit.example',
      phone: '+91 98400 00000',
      whatsapp: '+91 98400 00000',
      website: 'https://ananyafit.example',
      address: 'Sector 56, Gurugram',
      countryId: 'in',
      cityId: cities['in:gurugram'].id,
      categoryId: 'fitness-trainers',
      status: 'PENDING',
      isFeatured: false,
      coverImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
      rating: 0,
      reviewCount: 0,
      viewCount: 0,
      description: 'Personal trainer profile for weight loss, mobility, strength coaching and online fitness plans across Gurugram.',
      shortDescription: 'Personal trainer profile pending approval.',
      services: ['Personal Training', 'Weight Loss Coaching', 'Strength Training', 'Online Fitness Plans'],
      pricing: ['Monthly coaching from INR 9000'],
      businessHours: ['Mon - Sat: 6:00 AM - 8:00 PM', 'Online sessions by appointment'],
      seoTitle: 'Ananya Rao Fitness Coach in Gurugram',
      seoDescription: 'Fitness trainer profile submitted for review.'
    },
    {
      slug: 'rahul-batra-financial-advisor',
      name: 'Rahul Batra Financial Advisor',
      ownerName: 'Rahul Batra',
      ownerEmail: 'hello@rahulfinance.example',
      phone: '+91 98500 00000',
      address: 'Nehru Place, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'financial-advisors',
      status: 'REJECTED',
      isFeatured: false,
      rejectionReason: 'Incomplete professional verification documents.',
      adminNotes: 'Ask owner to submit updated ID and professional certificate.',
      coverImage: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
      rating: 0,
      reviewCount: 0,
      viewCount: 0,
      description: 'Financial advisor listing awaiting corrected documents after rejection.',
      shortDescription: 'Rejected financial advisory profile with missing documents.',
      services: ['Investment Planning', 'Insurance Review', 'Tax Planning'],
      pricing: ['Planning session from INR 2500'],
      businessHours: ['Mon - Fri: 10:00 AM - 6:00 PM'],
      seoTitle: 'Rahul Batra Financial Advisor in Delhi',
      seoDescription: 'Financial advisor listing currently rejected.'
    },
    {
      slug: 'olivia-carter-family-doctor',
      name: 'Dr. Olivia Carter',
      ownerName: 'Dr. Olivia Carter',
      ownerEmail: 'care@manhattanwellness.example',
      phone: '+1 212 555 0188',
      whatsapp: '+1 212 555 0188',
      website: 'https://manhattanwellness.example',
      address: 'Manhattan, New York',
      countryId: 'us',
      cityId: cities['us:new-york'].id,
      categoryId: 'doctors',
      status: 'APPROVED',
      isFeatured: false,
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      rating: 4.8,
      reviewCount: 76,
      viewCount: 2140,
      description: 'Family doctor in New York offering preventive health, primary care and wellness consultations by appointment.',
      shortDescription: 'Family doctor for preventive health and primary care in New York.',
      services: ['Primary Care', 'Preventive Health', 'Wellness Consultation', 'Follow-up Visit'],
      pricing: ['Consultation from USD 180'],
      businessHours: ['Mon - Fri: 8:00 AM - 6:00 PM', 'Sat: 9:00 AM - 2:00 PM'],
      seoTitle: 'Dr. Olivia Carter - Doctor in New York',
      seoDescription: 'Approved family doctor profile in New York.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80', 'Interior', 'Clinic reception', 1),
        gallery('https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80', 'Office', 'Consultation room', 2)
      ]
    },
    {
      slug: 'vikram-singh-car-mechanic',
      name: 'Vikram Singh Car Mechanic',
      ownerName: 'Vikram Singh',
      ownerEmail: 'service@autoelite.example',
      phone: '+91 98600 00000',
      address: 'Udyog Vihar, Gurugram',
      countryId: 'in',
      cityId: cities['in:gurugram'].id,
      categoryId: 'car-mechanics',
      status: 'SUSPENDED',
      isFeatured: false,
      adminNotes: 'Temporarily suspended after repeated contact complaints.',
      coverImage: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&q=80',
      rating: 3.8,
      reviewCount: 41,
      viewCount: 0,
      description: 'Car mechanic profile currently suspended from public directory pages.',
      shortDescription: 'Suspended car mechanic profile.',
      services: ['Car Service', 'Inspection', 'Repairs'],
      pricing: ['Inspection from INR 700'],
      businessHours: ['Mon - Sat: 9:00 AM - 7:00 PM'],
      seoTitle: 'Vikram Singh Car Mechanic in Gurugram',
      seoDescription: 'Suspended car mechanic listing.'
    },
    {
      slug: 'delhi-social-companions',
      name: 'Delhi Social Companions',
      ownerName: 'Aarav Mehta',
      ownerEmail: 'hello@socialcompanions.example',
      phone: '+91 98700 00000',
      whatsapp: '+91 98700 00000',
      website: 'https://socialcompanions.example',
      address: 'South Delhi, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'rent-a-girlfriend',
      status: 'APPROVED',
      isFeatured: false,
      isAdult: true,
      ageRestricted: true,
      adultLevel: 'AGE_RESTRICTED',
      adultDisclaimerAcceptedAt: new Date('2026-05-01T10:00:00.000Z'),
      verificationStatus: 'PENDING',
      verificationNotes: 'Seeded adult profile intentionally pending ID verification to test public note.',
      coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80',
      rating: 4.4,
      reviewCount: 18,
      viewCount: 940,
      description: 'Age-restricted social companionship profile for public dates, cafe meetings and event outings. This listing does not offer illegal services.',
      shortDescription: '18+ social companionship and public outing services in Delhi.',
      services: ['Public Date', 'Cafe Meet', 'Event Companion', 'Movie Outing'],
      pricing: ['Public social outing from INR 2500', 'Advance booking required'],
      businessHours: ['Mon - Sun: 12:00 PM - 10:00 PM', 'Advance booking required'],
      seoTitle: 'Rent a Girlfriend in Delhi - Delhi Social Companions',
      seoDescription: 'Age-restricted social companionship profile in Delhi.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Public outing planning', 1),
        gallery('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80', 'Portfolio', 'Social companion profile', 2)
      ]
    },
    {
      slug: 'riya-independent-companion',
      name: 'Riya Independent Companion',
      ownerName: 'Riya Kapoor',
      ownerEmail: 'bookings@riyacompanion.example',
      phone: '+91 98700 11111',
      whatsapp: '+91 98700 11111',
      website: 'https://riyacompanion.example',
      address: 'Central Delhi, Delhi',
      countryId: 'in',
      cityId: cities['in:delhi'].id,
      categoryId: 'female-escorts',
      status: 'APPROVED',
      isFeatured: true,
      featuredUntil: new Date('2026-09-30T23:59:59.000Z'),
      isAdult: true,
      ageRestricted: true,
      adultLevel: 'AGE_RESTRICTED',
      adultDisclaimerAcceptedAt: new Date('2026-05-01T10:00:00.000Z'),
      verificationStatus: 'VERIFIED',
      coverImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=80',
      avatarImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      rating: 4.6,
      reviewCount: 26,
      viewCount: 1180,
      description: 'Age-restricted independent companionship profile for verified adult visitors and public social bookings. This listing does not offer illegal services.',
      shortDescription: '18+ independent companion profile for public social bookings in Delhi.',
      services: ['Public Meeting', 'Dinner Companion', 'Event Companion', 'Travel Companion'],
      pricing: ['Public meeting from INR 4000', 'Event packages available'],
      businessHours: ['Mon - Sun: 11:00 AM - 11:00 PM', 'ID verification required before booking'],
      seoTitle: 'Female Escorts in Delhi - Riya Independent Companion',
      seoDescription: 'Age-restricted independent companionship profile in Delhi.',
      gallery: [
        gallery('https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', 'Portfolio', 'Profile portfolio', 1),
        gallery('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80', 'Work Photos', 'Social booking planning', 2)
      ]
    }
  ];

  const savedProfilesBySlug = {};
  for (const profile of profileSeeds) {
    const { gallery: galleryImages = [], ...profileData } = profile;
    const saved = await prisma.profile.upsert({
      where: {
        countryId_cityId_categoryId_slug: {
          countryId: profileData.countryId,
          cityId: profileData.cityId,
          categoryId: profileData.categoryId,
          slug: profileData.slug
        }
      },
      update: profileData,
      create: profileData
    });

    await prisma.profileGallery.deleteMany({ where: { profileId: saved.id } });
    if (galleryImages.length) {
      await prisma.profileGallery.createMany({
        data: galleryImages.map((item) => ({ ...item, profileId: saved.id }))
      });
    }

    await prisma.profileStatusHistory.deleteMany({ where: { profileId: saved.id } });
    await prisma.profileStatusHistory.create({
      data: {
        profileId: saved.id,
        oldStatus: null,
        newStatus: saved.status,
        reason: saved.rejectionReason,
        adminNote: saved.adminNotes
      }
    });
    await prisma.featuredPlacementCampaign.deleteMany({ where: { profileId: saved.id, source: 'SEED' } });
    if (saved.isFeatured) {
      const city = Object.values(cities).find((item) => item.id === profileData.cityId);
      const pagePath = city ? `/${profileData.countryId}/${city.slug}/${profileData.categoryId}` : 'ALL';
      await prisma.featuredPlacementCampaign.create({
        data: {
          profileId: saved.id,
          ownerUserId: saved.ownerUserId,
          pageType: 'CATEGORY',
          pagePath,
          slot: 'TOP',
          status: 'ACTIVE',
          startsAt: new Date(),
          endsAt: saved.featuredUntil,
          approvedAt: new Date(),
          source: 'SEED'
        }
      });
    }
    savedProfilesBySlug[saved.slug] = saved;
  }

  const insightSeeds = {
    'aditya-pareek': { PROFILE_VIEW: 24, WHATSAPP_CLICK: 9, PHONE_CLICK: 6, WEBSITE_CLICK: 4 },
    'vedic-vision-astro': { PROFILE_VIEW: 14, WHATSAPP_CLICK: 5, PHONE_CLICK: 3, WEBSITE_CLICK: 2 },
    'karan-malhotra-property-advisor': { PROFILE_VIEW: 11, WHATSAPP_CLICK: 3, PHONE_CLICK: 4, WEBSITE_CLICK: 2 },
    'meera-sethi-makeup-artist': { PROFILE_VIEW: 8, WHATSAPP_CLICK: 4, PHONE_CLICK: 2, WEBSITE_CLICK: 3 },
    'olivia-carter-family-doctor': { PROFILE_VIEW: 7, WHATSAPP_CLICK: 2, PHONE_CLICK: 3, WEBSITE_CLICK: 3 },
    'riya-independent-companion': { PROFILE_VIEW: 16, WHATSAPP_CLICK: 7, PHONE_CLICK: 5, WEBSITE_CLICK: 1 }
  };

  for (const [slug, counts] of Object.entries(insightSeeds)) {
    const profile = savedProfilesBySlug[slug];
    if (!profile) continue;
    await prisma.profileInsightEvent.deleteMany({ where: { profileId: profile.id } });
    const rows = Object.entries(counts).flatMap(([type, count]) => (
      Array.from({ length: count }, (_, index) => ({
        profileId: profile.id,
        type,
        referrer: 'seed',
        createdAt: new Date(Date.now() - ((index % 21) + 1) * 24 * 60 * 60 * 1000)
      }))
    ));
    if (rows.length) await prisma.profileInsightEvent.createMany({ data: rows });
  }

  const blogPosts = [
    {
      slug: 'best-astrologer-in-delhi',
      title: 'Best Astrologer in Delhi: How to Choose the Right Expert',
      excerpt: 'A practical SEO-friendly guide for users searching for trusted astrology and vastu consultation in Delhi.',
      content: 'Use verified profiles, reviews, experience, consultation process, location and transparency to choose the best astrologer in Delhi.',
      image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
      status: 'PUBLISHED'
    },
    {
      slug: 'how-to-choose-premium-service-provider',
      title: 'How to Choose a Premium Service Provider Near You',
      excerpt: 'Ratings, reviews, location signals and verified badges help users make confident decisions.',
      content: 'Compare verified badges, reviews, response time, business details and portfolio before finalizing a provider.',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      status: 'PUBLISHED'
    }
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: {
        ...post,
        seoTitle: post.title,
        seoDesc: post.excerpt
      }
    });
  }

  const demoReviewProfile = savedProfilesBySlug['aditya-pareek'];
  if (demoReviewProfile) {
    await prisma.profileReview.upsert({
      where: {
        profileId_userId: {
          profileId: demoReviewProfile.id,
          userId: reviewerUser.id
        }
      },
      update: {
        rating: 5,
        title: 'Helpful and professional consultation',
        comment: 'The consultation was clear, practical and easy to understand. This seeded review is useful for testing the review-user account flow.',
        status: 'APPROVED'
      },
      create: {
        profileId: demoReviewProfile.id,
        userId: reviewerUser.id,
        rating: 5,
        title: 'Helpful and professional consultation',
        comment: 'The consultation was clear, practical and easy to understand. This seeded review is useful for testing the review-user account flow.',
        status: 'APPROVED'
      }
    });
  }

  const savedSeedSlugs = ['aditya-pareek', 'vedic-vision-astro', 'karan-malhotra-property-advisor', 'olivia-carter-family-doctor'];
  await prisma.profileSave.deleteMany({ where: { userId: reviewerUser.id } });
  for (const slug of savedSeedSlugs) {
    const profile = savedProfilesBySlug[slug];
    if (!profile || profile.status !== 'APPROVED') continue;
    await prisma.profileSave.upsert({
      where: {
        profileId_userId: {
          profileId: profile.id,
          userId: reviewerUser.id
        }
      },
      update: {},
      create: {
        profileId: profile.id,
        userId: reviewerUser.id
      }
    });
  }

  await prisma.profileLead.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'Seed ' } },
        { email: { contains: '@lead.example' } }
      ]
    }
  });
  const leadProfile = savedProfilesBySlug['aditya-pareek'];
  const adultLeadProfile = savedProfilesBySlug['delhi-social-companions'];
  const leadSeeds = [
    leadProfile ? {
      profileId: leadProfile.id,
      userId: reviewerUser.id,
      name: 'Seed Priya Sharma',
      email: 'priya@lead.example',
      phone: '+91 90000 11111',
      whatsapp: '+91 90000 11111',
      serviceNeeded: 'Kundli Analysis',
      budget: 'INR 3000',
      timeline: 'This week',
      contactPreference: 'WhatsApp',
      preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      preferredTime: '16:00',
      message: 'I need a detailed consultation this week and can share birth details before the call.',
      source: 'PROFILE_QUOTE',
      sourcePath: '/in/delhi/astrologer/aditya-pareek',
      leadScore: 92,
      leadQuality: 'HOT',
      status: 'CONTACTED',
      responseAt: new Date(Date.now() - 45 * 60 * 1000),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    } : null,
    leadProfile ? {
      profileId: leadProfile.id,
      name: 'Seed Rohan Mehta',
      email: 'rohan@lead.example',
      phone: '+91 90000 22222',
      serviceNeeded: 'Vastu Consultation',
      budget: 'INR 12000',
      timeline: 'This month',
      contactPreference: 'Phone',
      message: 'Planning a home layout review and need pricing for a site visit.',
      source: 'PROFILE_QUOTE',
      sourcePath: '/in/delhi/astrologer/aditya-pareek',
      leadScore: 78,
      leadQuality: 'HOT',
      status: 'CONVERTED',
      responseAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
      convertedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000)
    } : null,
    adultLeadProfile ? {
      profileId: adultLeadProfile.id,
      name: 'Seed Alex Kumar',
      email: 'alex@lead.example',
      phone: '+91 90000 33333',
      whatsapp: '+91 90000 33333',
      serviceNeeded: 'Public Date',
      budget: 'INR 2500',
      timeline: 'Today',
      contactPreference: 'WhatsApp',
      message: 'Looking for a public social outing booking today evening.',
      source: 'PROFILE_QUOTE',
      sourcePath: '/in/delhi/rent-a-girlfriend/delhi-social-companions',
      leadScore: 86,
      leadQuality: 'HOT',
      status: 'NEW',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    } : null
  ].filter(Boolean);
  if (leadSeeds.length) await prisma.profileLead.createMany({ data: leadSeeds });

  const seoItems = [
    { path: '/', title: 'Service Directory Website', description: 'Find verified service providers with a premium responsive directory experience.', canonical: 'http://localhost:3000/' },
    { path: '/in/delhi/astrologer', title: 'Best Astrologers in Delhi', description: 'Explore approved astrologers and vastu consultants in Delhi.', canonical: 'http://localhost:3000/in/delhi/astrologer' },
    { path: '/in/delhi/astrologer/aditya-pareek', title: 'Pandit Aditya Pareek - Astrologer in Delhi', description: 'Profile page for Pandit Aditya Pareek, fourth-generation astrologer and vastukar.', canonical: 'http://localhost:3000/in/delhi/astrologer/aditya-pareek' },
    { path: '/in/delhi/rent-a-girlfriend/delhi-social-companions', title: 'Rent a Girlfriend in Delhi - Delhi Social Companions', description: 'Age-restricted social companionship profile in Delhi.', canonical: 'http://localhost:3000/in/delhi/rent-a-girlfriend/delhi-social-companions' }
  ];

  for (const item of seoItems) {
    await prisma.seoMeta.upsert({
      where: { path: item.path },
      update: item,
      create: item
    });
  }

  console.log('Seed completed successfully.');
  console.log('Admin login: admin@example.com / Admin@12345');
  console.log('Business owner login: owner@example.com / Owner@12345');
  console.log('Review user login: reviewer@example.com / Review@12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
