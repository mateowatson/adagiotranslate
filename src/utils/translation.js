import { GOOGLE_TRANSLATE_ENDPOINT, MYMEMORY_TRANSLATE_ENDPOINT } from "../constants.js";

function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function isProviderConfigured(provider, googleApiKey = "") {
  if (provider === "google") return Boolean((googleApiKey || "").trim());
  if (provider === "mymemory") return true;
  return false;
}

export async function requestTranslationByProvider({ provider, source, target, text, googleApiKey, myMemoryEmail }) {
  if (provider === "google") {
    return requestGoogleTranslation({ apiKey: googleApiKey, source, target, text });
  }
  return requestMyMemoryTranslation({ source, target, text, email: myMemoryEmail });
}

async function requestGoogleTranslation({ apiKey, source, target, text }) {
  const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source,
      target,
      format: "text",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Google Translate API request failed (${response.status})`;
    throw new Error(message);
  }

  const translated = payload?.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error("Google Translate returned no translation.");
  return decodeHtmlEntities(translated);
}

async function requestMyMemoryTranslation({ source, target, text, email = "" }) {
  const sourceLang = source || "auto";
  const targetLang = target || "en";

  const params = new URLSearchParams();
  params.set("q", text);
  params.set("langpair", `${sourceLang}|${targetLang}`);
  if (email.trim()) params.set("de", email.trim());

  const response = await fetch(`${MYMEMORY_TRANSLATE_ENDPOINT}?${params.toString()}`, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MyMemory API request failed (${response.status})`);
  }

  const translated = payload?.responseData?.translatedText;
  if (!translated) throw new Error("MyMemory returned no translation.");
  return decodeHtmlEntities(translated);
}
