// ===== ДІАГНОСТИКА ПАРСИНГУ =====
// Оригінальні рядки: L6301-L6330

import { db } from '../config/firebase.js';
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function saveParseDiagnostic({ url, ua, platform, playerUrls, allRawSources, rawHtml }) {
            try {
                if (!firebaseInitialized || !db) {
                    console.warn('[diagnostic] Firebase not initialized, skipping');
                    return;
                }
                const id = `${Date.now()}_${Math.floor(Math.random()*10000)}`;
                const rawSnippet = (rawHtml && rawHtml.slice(0, 20000)) || '';
                const payload = {
                    url,
                    ua,
                    platform,
                    playerUrls: playerUrls || [],
                    allRawSources: allRawSources ? allRawSources.slice(0, 20) : [],
                    rawSnippet,
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, 'diagnostics', id), payload);
                console.log('[diagnostic] saved to Firestore id=', id);
            } catch (e) {
                console.warn('[diagnostic] saveParseDiagnostic error:', e);
            }
        }

