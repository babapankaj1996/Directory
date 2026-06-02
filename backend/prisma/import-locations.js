import 'dotenv/config';
import { City, Country } from 'country-state-city';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/helpers.js';

const prisma = new PrismaClient();

const validStatuses = new Set(['ACTIVE', 'DRAFT']);

function parseArgs(argv) {
  const defaults = {
    batchSize: process.env.npm_config_batch_size || '1000',
    countryStatus: process.env.npm_config_country_status || 'DRAFT',
    cityStatus: process.env.npm_config_city_status || 'DRAFT',
    countries: process.env.npm_config_countries || '',
    dryRun: ['true', '1', 'yes'].includes(String(process.env.npm_config_dry_run || '').toLowerCase()),
    overwriteStatus: ['true', '1', 'yes'].includes(String(process.env.npm_config_overwrite_status || '').toLowerCase())
  };

  return argv.reduce((options, item) => {
    if (item === '--dry-run' || item === '--dryRun') return { ...options, dryRun: true };
    if (item === '--overwrite-status' || item === '--overwriteStatus') return { ...options, overwriteStatus: true };
    const [key, value] = item.replace(/^--/, '').split('=');
    if (!key || value === undefined) return options;
    return { ...options, [key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())]: value };
  }, defaults);
}

function normalizeStatus(value, fallback) {
  const status = String(value || fallback).trim().toUpperCase();
  return validStatuses.has(status) ? status : fallback;
}

function shortHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function uniqueCitySlug(city, used) {
  const base = slugify(city.name) || `city-${shortHash(`${city.countryCode}-${city.stateCode}-${city.name}`)}`;
  const stateSlug = slugify(city.stateCode);
  let candidate = base;

  if (used.has(candidate) && stateSlug) {
    candidate = `${base}-${stateSlug}`;
  }

  let suffix = 2;
  const baseWithState = candidate;
  while (used.has(candidate)) {
    candidate = `${baseWithState}-${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

function toCountryRows(countries, countryStatus) {
  return countries.map((country) => ({
    code: country.isoCode.toLowerCase(),
    name: country.name,
    status: countryStatus,
    seoTitle: `${country.name} Directory`,
    seoDesc: `Find verified service providers in ${country.name}.`
  }));
}

function toCityRows(cities, cityStatus) {
  const usedByCountry = new Map();

  return cities
    .slice()
    .sort((first, second) => (
      first.countryCode.localeCompare(second.countryCode) ||
      String(first.stateCode || '').localeCompare(String(second.stateCode || '')) ||
      first.name.localeCompare(second.name)
    ))
    .map((city) => {
      const countryCode = city.countryCode.toLowerCase();
      if (!usedByCountry.has(countryCode)) usedByCountry.set(countryCode, new Set());
      const slug = uniqueCitySlug(city, usedByCountry.get(countryCode));
      return {
        countryCode,
        slug,
        name: city.name,
        status: cityStatus,
        seoTitle: `${city.name} Directory`,
        seoDesc: `Find verified service providers in ${city.name}.`
      };
    });
}

async function createManyInBatches(model, rows, batchSize) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const result = await model.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
    process.stdout.write(`\rInserted ${inserted.toLocaleString()} new rows...`);
  }
  process.stdout.write('\n');
  return inserted;
}

async function upsertCountries(rows, overwriteStatus, dryRun) {
  if (dryRun) return 0;

  let changed = 0;
  for (const row of rows) {
    await prisma.country.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        seoTitle: row.seoTitle,
        seoDesc: row.seoDesc,
        ...(overwriteStatus ? { status: row.status } : {})
      },
      create: row
    });
    changed += 1;
  }
  return changed;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const countryStatus = normalizeStatus(options.countryStatus, 'DRAFT');
  const cityStatus = normalizeStatus(options.cityStatus, 'DRAFT');
  const batchSize = Math.max(Number.parseInt(options.batchSize, 10) || 1000, 100);
  const countryFilter = String(options.countries || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const countrySet = countryFilter.length ? new Set(countryFilter) : null;

  const sourceCountries = Country.getAllCountries()
    .filter((country) => !countrySet || countrySet.has(country.isoCode))
    .sort((first, second) => first.isoCode.localeCompare(second.isoCode));
  const sourceCities = (countrySet ? countryFilter.flatMap((code) => City.getCitiesOfCountry(code) || []) : City.getAllCities())
    .filter((city) => !countrySet || countrySet.has(city.countryCode));

  const countryRows = toCountryRows(sourceCountries, countryStatus);
  const cityRows = toCityRows(sourceCities, cityStatus);

  console.log(`Location import source: country-state-city ${countryRows.length.toLocaleString()} countries, ${cityRows.length.toLocaleString()} cities.`);
  console.log(`Default statuses for new rows: countries=${countryStatus}, cities=${cityStatus}. Existing row statuses are preserved${options.overwriteStatus ? ' except overwritten by request' : ''}.`);

  if (options.dryRun) {
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  const countryChanges = await upsertCountries(countryRows, options.overwriteStatus, options.dryRun);
  const cityInserts = await createManyInBatches(prisma.city, cityRows, batchSize);

  const [countryCount, cityCount] = await Promise.all([
    prisma.country.count(),
    prisma.city.count()
  ]);

  console.log(`Countries processed: ${countryChanges.toLocaleString()}.`);
  console.log(`New cities inserted: ${cityInserts.toLocaleString()}.`);
  console.log(`Database totals: ${countryCount.toLocaleString()} countries, ${cityCount.toLocaleString()} cities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
