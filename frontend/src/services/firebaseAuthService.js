import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig.js';

let app = null;
let auth = null;

const USERNAME_REGEX = /^[a-z0-9._-]{3,24}$/;
export const REMEMBER_SESSION_KEY = 'snakeclash.rememberSession.v1';

export const shouldRememberSession = () => localStorage.getItem(REMEMBER_SESSION_KEY) === 'true';

export const setRememberSessionPreference = (remember) => {
  if (remember) {
    localStorage.setItem(REMEMBER_SESSION_KEY, 'true');
  } else {
    localStorage.removeItem(REMEMBER_SESSION_KEY);
  }
};

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
    auth = initializeAuth(app, {
      persistence: shouldRememberSession() ? browserLocalPersistence : inMemoryPersistence,
    });
  }
  return auth;
};

export const prepareAuthPersistenceForLogin = async (remember) => {
  setRememberSessionPreference(remember);
  const currentAuth = getFirebaseAuth();
  await setPersistence(
    currentAuth,
    remember ? browserLocalPersistence : inMemoryPersistence,
  );
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

export const signOutUser = async () => {
  setRememberSessionPreference(false);
  const currentAuth = getFirebaseAuth();
  await signOut(currentAuth);
  await setPersistence(currentAuth, inMemoryPersistence);
};

/** Sin sesión al abrir la app salvo que el usuario eligió mantenerla. */
export const clearAuthSessionOnStartup = async () => {
  if (shouldRememberSession()) return;

  const currentAuth = getFirebaseAuth();

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          await signOut(currentAuth);
        } catch (error) {
          console.warn('No se pudo cerrar la sesión al iniciar.', error);
        }
      }
      resolve();
    });
  });
};

export const formatUserEmailForDisplay = (user) => String(user?.email ?? '—');

export const updateUserPassword = async (currentPassword, newPassword) => {
  const currentAuth = getFirebaseAuth();
  const user = currentAuth.currentUser;

  if (!user?.email) {
    throw new Error('No hay una sesión activa.');
  }

  if (!currentPassword) {
    throw new Error('La contraseña actual es obligatoria.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);

  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (error) {
    throw mapFirebaseAuthError(error);
  }
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

export const loginUser = async (username, password, { remember = false } = {}) => {
  const currentAuth = getFirebaseAuth();
  const validation = validateUserName(username);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  await prepareAuthPersistenceForLogin(remember);

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
    case 'auth/requires-recent-login':
      userMessage = 'Por seguridad, vuelve a iniciar sesión y prueba otra vez.';
      break;
    default:
      userMessage = error.message || 'Ha ocurrido un error desconocido.';
  }

  const processedError = new Error(userMessage);
  processedError.code = errorCode;
  return processedError;
};
