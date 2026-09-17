import {
  addDoc,
  deleteDoc,
  updateDoc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';

import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

export function updateDocumentNonBlocking(
  docRef: DocumentReference,
  data: any
): Promise<void> {
  return updateDoc(docRef, data).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      })
    );
  });
}

export function addDocumentNonBlocking(
  colRef: CollectionReference,
  data: any
): Promise<any> {
  return addDoc(colRef, data).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      })
    );
  });
}

export function deleteDocumentNonBlocking(
  docRef: DocumentReference
): Promise<void> {
  return deleteDoc(docRef).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
        requestResourceData: undefined,
      })
    );
  });
}
