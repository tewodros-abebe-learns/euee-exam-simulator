import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable = 
    errMessage.includes('unavailable') || 
    errMessage.includes('offline') || 
    errMessage.includes('Could not reach Cloud Firestore backend') ||
    errMessage.includes('Failed to get document because the client is offline') ||
    errMessage.includes('network');

  // The identity fields are logged for debugging, but the student's email is
  // personal data that has no business sitting in a browser console (or in a
  // pasted bug report): only the provider names are kept.
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email ? '[redacted]' : null,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: null,
        email: null,
        photoUrl: null
      })) || []
    },
    operationType,
    path
  };
  
  const errorMessage = JSON.stringify(errInfo);
  if (isOfflineOrUnavailable) {
    console.warn('Firestore Warning (Network/Offline mode active):', errorMessage);
  } else {
    console.error('Firestore Error: ', errorMessage);
  }
}
