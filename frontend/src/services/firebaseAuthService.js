import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig.js';

let app = null;
let auth = null;

const USERNAME_REGEX = /^[a-z0-9._-]{3,24}$/;

export const normalizeUserName = (value) => String(value ?? '').trim().toLowerCase();

export const buildAuthEmail = (username) => `${normalizeUserName(username)}@snakeclash.local`;

export const validateUserName = (username) => {
  const normalized = normalizeUserName(username);

  if (!normalized) {
    return { ok: false, message: 'El nombre del usuario es requerido.' };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      ok: false,
      message: 'El usuario debe tener 3-24 caracteres y solo puede usar letras, numeros, punto, guion o guion bajo.',
    };
  }

  return { ok: true, normalized };
};

export const extractLeaderboardUserName = (user) => {
  const displayName = normalizeUserName(user?.displayName ?? '');
  if (displayName) return displayName;

  const emailUserName = String(user?.email ?? '').split('@')[0];
  return normalizeUserName(emailUserName);
};

export const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
};

export const getFirebaseAuth = () => {
  if (!auth) {
    return initializeFirebase();
  }
  return auth;
};

export const getCurrentUser = () => new Promise((resolve) => {
  const currentAuth = getFirebaseAuth();
  const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
    unsubscribe();
    resolve(user);
  });
});

export const isUserLoggedIn = async () => {
  const user = await getCurrentUser();
  return user !== null;
};

export const registerUser = async (username, password) => {
  const currentAuth = getFirebaseAuth();
  const validation = validateUserName(username);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      currentAuth,
      buildAuthEmail(validation.normalized),
      password,
    );
    await updateProfile(userCredential.user, {
      displayName: validation.normalized,
    });
    return userCredential.user;
  } catch (error) {
    throw mapFirebaseAuthError(error);
  }
};

export const loginUser = async (username, password) => {
  const currentAuth = getFirebaseAuth();
  const validation = validateUserName(username);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      currentAuth,
      buildAuthEmail(validation.normalized),
      password,
    );
    return userCredential.user;
  } catch (error) {
    throw mapFirebaseAuthError(error);
  }
};

export const mapFirebaseAuthError = (error) => {
  const errorCode = error.code;
  let userMessage = 'Ha ocurrido un error al registrar la cuenta.';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      userMessage = 'Este usuario ya esta registrado.';
      break;
    case 'auth/invalid-email':
      userMessage = 'El correo electronico no es valido.';
      break;
    case 'auth/weak-password':
      userMessage = 'La contrasena es muy debil. Debe tener al menos 6 caracteres.';
      break;
    case 'auth/operation-not-allowed':
      userMessage = 'La creacion de cuentas no esta habilitada.';
      break;
    case 'auth/network-request-failed':
      userMessage = 'Error de conexion. Verifica tu conexion a internet.';
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      userMessage = 'El usuario no existe o la contrasena es incorrecta.';
      break;
    default:
      userMessage = error.message || 'Ha ocurrido un error desconocido.';
  }

  const processedError = new Error(userMessage);
  processedError.code = errorCode;
  return processedError;
};
