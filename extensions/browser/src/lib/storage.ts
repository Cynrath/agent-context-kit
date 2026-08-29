export type SitePrefs = {
  disabled: boolean;
  performanceMode: "balanced" | "off";
  keepRecent: number;
  autoThreshold: number;
};

export type BridgeSession = {
  endpoint: string; // e.g. http://127.0.0.1:58732
  token: string;
  host: string;
  port: number;
};

const DISABLED_SITES_KEY = "ackit:browser:disabledSites";
const SITE_PREFS_PREFIX = "ackit:browser:site:";
const SESSION_KEY = "ackit:browser:session";
const ENDPOINT_KEY = "ackit:browser:endpoint";

export async function getDisabledSites(): Promise<Record<string, boolean>> {
  const obj = await chrome.storage.local.get(DISABLED_SITES_KEY);
  const val = obj[DISABLED_SITES_KEY] as Record<string, boolean> | undefined;
  return val ?? {};
}

export async function setDisabledSite(host: string, disabled: boolean): Promise<void> {
  const all = await getDisabledSites();
  if (disabled) all[host] = true;
  else delete all[host];
  await chrome.storage.local.set({ [DISABLED_SITES_KEY]: all });
}

export async function isSiteDisabled(host: string): Promise<boolean> {
  const all = await getDisabledSites();
  return all[host] === true;
}

export async function getSitePrefs(host: string): Promise<SitePrefs> {
  const key = `${SITE_PREFS_PREFIX}${host}`;
  const obj = await chrome.storage.local.get(key);
  const val = obj[key] as SitePrefs | undefined;
  return (
    val ?? {
      disabled: false,
      performanceMode: "balanced",
      keepRecent: 10,
      autoThreshold: 30,
    }
  );
}

export async function setSitePrefs(host: string, prefs: Partial<SitePrefs>): Promise<void> {
  const key = `${SITE_PREFS_PREFIX}${host}`;
  const cur = await getSitePrefs(host);
  await chrome.storage.local.set({ [key]: { ...cur, ...prefs } });
}

export async function getBridgeSession(): Promise<BridgeSession | null> {
  // Token lives in session storage (cleared on browser close / Emergency Disconnect)
  const sess = await chrome.storage.session.get([SESSION_KEY, ENDPOINT_KEY]);
  const token = sess[SESSION_KEY] as string | undefined;
  const endpoint = sess[ENDPOINT_KEY] as string | undefined;
  if (!token || !endpoint) return null;
  try {
    const url = new URL(endpoint);
    const port = Number.parseInt(url.port, 10);
    return { token, endpoint, host: url.hostname, port };
  } catch {
    return null;
  }
}

export async function setBridgeSession(session: BridgeSession): Promise<void> {
  await chrome.storage.session.set({
    [SESSION_KEY]: session.token,
    [ENDPOINT_KEY]: session.endpoint,
  });
  await chrome.storage.local.set({
    [ENDPOINT_KEY]: session.endpoint,
    "ackit:browser:bridge:host": session.host,
    "ackit:browser:bridge:port": session.port,
  });
}

export async function clearBridgeSession(): Promise<void> {
  await chrome.storage.session.remove([SESSION_KEY, ENDPOINT_KEY]);
}

export async function getBridgeEndpoint(): Promise<string | null> {
  const obj = await chrome.storage.local.get(ENDPOINT_KEY);
  return (obj[ENDPOINT_KEY] as string | undefined) ?? null;
}
