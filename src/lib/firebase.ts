import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Partner } from '../types';
import defaultPartnersData from '../partners.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const PARTNERS_COLLECTION = 'partners';

/**
 * Real-time listener for demand partners from Firestore.
 * Automatically seeds default partners if Firestore collection is empty on first launch.
 */
export function subscribeToPartners(onPartnersUpdate: (partners: Partner[]) => void): () => void {
  const partnersRef = collection(db, PARTNERS_COLLECTION);
  const q = query(partnersRef);

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      console.log('Firestore partners collection is empty. Seeding default partners...');
      await seedDefaultPartners();
      return;
    }

    const partnersList: Partner[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      partnersList.push({
        id: docSnap.id,
        name: data.name || '',
        lines: data.lines || [],
        primaryLines: data.primaryLines,
        ortbLines: data.ortbLines,
        secondaryLines: data.secondaryLines,
      });
    });

    // Sort alphabetically by partner name
    partnersList.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    onPartnersUpdate(partnersList);
  }, (error) => {
    console.error('Error listening to Firestore partners:', error);
    // Fallback to local default partners on error
    onPartnersUpdate(defaultPartnersData as Partner[]);
  });

  return unsubscribe;
}

/**
 * Seeds the initial set of default partners into Firestore in batches.
 */
export async function seedDefaultPartners(): Promise<void> {
  try {
    const defaultPartners = defaultPartnersData as Partner[];
    const batchSize = 400; // Firestore batch limit is 500
    for (let i = 0; i < defaultPartners.length; i += batchSize) {
      const chunk = defaultPartners.slice(i, i + batchSize);
      const batch = writeBatch(db);
      
      chunk.forEach((partner) => {
        const docRef = doc(db, PARTNERS_COLLECTION, partner.id);
        batch.set(docRef, {
          name: partner.name,
          lines: partner.lines || [],
          primaryLines: partner.primaryLines || [],
          ortbLines: partner.ortbLines || [],
          secondaryLines: partner.secondaryLines || [],
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
    }
    console.log(`Successfully seeded ${defaultPartners.length} partners to Firestore.`);
  } catch (err) {
    console.error('Failed to seed default partners to Firestore:', err);
  }
}

/**
 * Adds a new partner to Firestore (instantly synced to all connected users).
 */
export async function addPartnerInFirestore(partner: Omit<Partner, 'id'> & { id?: string }): Promise<string> {
  const newId = partner.id || crypto.randomUUID();
  const docRef = doc(db, PARTNERS_COLLECTION, newId);
  
  await setDoc(docRef, {
    name: partner.name,
    lines: partner.lines || [],
    primaryLines: partner.primaryLines || [],
    ortbLines: partner.ortbLines || [],
    secondaryLines: partner.secondaryLines || [],
    updatedAt: new Date().toISOString()
  });

  return newId;
}

/**
 * Updates an existing partner or partner lines in Firestore (synced to all users in real-time).
 */
export async function updatePartnerInFirestore(partnerId: string, updatedFields: Partial<Partner>): Promise<void> {
  const docRef = doc(db, PARTNERS_COLLECTION, partnerId);
  const dataToUpdate: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };

  if (updatedFields.name !== undefined) dataToUpdate.name = updatedFields.name;
  if (updatedFields.lines !== undefined) dataToUpdate.lines = updatedFields.lines;
  if (updatedFields.primaryLines !== undefined) dataToUpdate.primaryLines = updatedFields.primaryLines;
  if (updatedFields.ortbLines !== undefined) dataToUpdate.ortbLines = updatedFields.ortbLines;
  if (updatedFields.secondaryLines !== undefined) dataToUpdate.secondaryLines = updatedFields.secondaryLines;

  await updateDoc(docRef, dataToUpdate);
}

/**
 * Deletes a partner from Firestore (synced to all users).
 */
export async function deletePartnerFromFirestore(partnerId: string): Promise<void> {
  const docRef = doc(db, PARTNERS_COLLECTION, partnerId);
  await deleteDoc(docRef);
}

/**
 * Resets all partners in Firestore back to the default dataset.
 */
export async function resetPartnersToDefault(): Promise<void> {
  const partnersRef = collection(db, PARTNERS_COLLECTION);
  const snapshot = await getDocs(partnersRef);
  
  // Delete existing
  const deleteBatches: any[] = [];
  let currentBatch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    currentBatch.delete(docSnap.ref);
    count++;
    if (count % 400 === 0) {
      deleteBatches.push(currentBatch.commit());
      currentBatch = writeBatch(db);
    }
  });
  if (count % 400 !== 0) {
    deleteBatches.push(currentBatch.commit());
  }

  await Promise.all(deleteBatches);
  await seedDefaultPartners();
}
