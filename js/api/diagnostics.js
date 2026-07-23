import { db } from "../config/firebase.js";
import { doc, setDoc } from "firebase/firestore";

export async function saveParseDiagnostic({ url, ua, platform, playerUrls, allRawSources, rawHtml }) {
  try {
    if (!db) return;
    const id = `${Date.now()}_${Math.floor(Math.random()*10000)}`;
    const rawSnippet = (rawHtml && rawHtml.slice(0, 20000)) || '';
    const payload = {
      url, ua, platform,
      playerUrls: playerUrls || [],
      allRawSources: allRawSources ? allRawSources.slice(0, 20) : [],
      rawSnippet,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'diagnostics', id), payload);
  } catch (e) { /* ignore */ }
}
