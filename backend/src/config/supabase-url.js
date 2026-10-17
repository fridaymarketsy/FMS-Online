function normalizeSupabaseUrl(configuredUrl) {
  const url = new URL(configuredUrl);
  const path = url.pathname.replace(/\/+$/, '');
  const restPath = '/rest/v1';

  url.pathname = path.endsWith(restPath)
    ? path.slice(0, -restPath.length)
    : path;

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

module.exports = { normalizeSupabaseUrl };
