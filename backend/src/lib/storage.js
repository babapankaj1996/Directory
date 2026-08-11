const ensuredBuckets = new Map();

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  return { url, serviceKey };
}

function bucketName(value, fallback) {
  const name = String(value || fallback).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(name)) {
    throw new Error(`Invalid Supabase Storage bucket name: ${name}`);
  }
  return name;
}

function storageHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra
  };
}

function objectUrl(baseUrl, bucket, objectPath, visibility = 'object') {
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/storage/v1/${visibility}/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function responseError(response, action) {
  const payload = await response.json().catch(() => ({}));
  const message = payload.message || payload.error || response.statusText;
  const error = new Error(`Supabase Storage ${action} failed: ${message}`);
  error.statusCode = response.status === 413 ? 413 : 502;
  return error;
}

async function ensureBucket(bucket, isPublic) {
  const { url, serviceKey } = config();
  const cacheKey = `${bucket}:${isPublic}`;
  if (ensuredBuckets.has(cacheKey)) return ensuredBuckets.get(cacheKey);

  const pending = (async () => {
    const existing = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      headers: storageHeaders(serviceKey),
      cache: 'no-store'
    });
    if (existing.ok) {
      const details = await existing.json().catch(() => ({}));
      if (Boolean(details.public) !== isPublic) {
        const error = new Error(`Supabase Storage bucket ${bucket} has the wrong public/private setting.`);
        error.statusCode = 500;
        throw error;
      }
      return;
    }
    if (existing.status !== 404 && existing.status !== 400) throw await responseError(existing, 'bucket check');

    const created = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: storageHeaders(serviceKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: isPublic,
        file_size_limit: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024)
      })
    });
    if (!created.ok && created.status !== 409) throw await responseError(created, 'bucket creation');
  })();

  ensuredBuckets.set(cacheKey, pending);
  try {
    await pending;
  } catch (error) {
    ensuredBuckets.delete(cacheKey);
    throw error;
  }
}

export function usesSupabaseStorage() {
  const { url, serviceKey } = config();
  return Boolean(url && serviceKey);
}

export async function uploadPublicObject(objectPath, buffer, contentType) {
  const { url, serviceKey } = config();
  const bucket = bucketName(process.env.SUPABASE_MEDIA_BUCKET, 'directory-media');
  await ensureBucket(bucket, true);
  const response = await fetch(objectUrl(url, bucket, objectPath), {
    method: 'POST',
    headers: storageHeaders(serviceKey, {
      'Content-Type': contentType,
      'x-upsert': 'false'
    }),
    body: buffer
  });
  if (!response.ok) throw await responseError(response, 'upload');
  return objectUrl(url, bucket, objectPath, 'object/public');
}

export async function uploadPrivateObject(objectPath, buffer, contentType) {
  const { url, serviceKey } = config();
  const bucket = bucketName(process.env.SUPABASE_PRIVATE_BUCKET, 'directory-private');
  await ensureBucket(bucket, false);
  const response = await fetch(objectUrl(url, bucket, objectPath), {
    method: 'POST',
    headers: storageHeaders(serviceKey, {
      'Content-Type': contentType,
      'x-upsert': 'false'
    }),
    body: buffer
  });
  if (!response.ok) throw await responseError(response, 'private upload');
}

export async function downloadPrivateObject(objectPath) {
  const { url, serviceKey } = config();
  const bucket = bucketName(process.env.SUPABASE_PRIVATE_BUCKET, 'directory-private');
  const response = await fetch(objectUrl(url, bucket, objectPath), {
    headers: storageHeaders(serviceKey),
    cache: 'no-store'
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw await responseError(response, 'private download');
  return Buffer.from(await response.arrayBuffer());
}
