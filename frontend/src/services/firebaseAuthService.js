// Firebase Authentication Service
// Centralized service for handling Firebase authentication operations
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig.js';

let app = null;
let auth = null;

/**
 * Initialize Firebase application
 * @returns {Object} Firebase auth instance
 */
export const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
};

/**
 * Get current Firebase auth instance
 * @returns {Object} Firebase auth instance
 */
export const getFirebaseAuth = () => {
  if (!auth) {
    return initializeFirebase();
  }
  return auth;
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} Current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Check if user is currently authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export const isUserLoggedIn = async () => {
  const user = await getCurrentUser();
  return user !== null;
};

/**
 * Register a new user with username (email) and password
 * @param {string} username - Username to use as email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credentials object
 * @throws {Error} Firebase authentication error
 */
export const registerUser = async (username, password) => {
  const auth = getFirebaseAuth();
  
  // Use username as email by appending a domain
  const email = `${username.toLowerCase()}@snakeclash.local`;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Handle Firebase specific errors
    throw handleFirebaseError(error);
  }
};

/**
 * Login a user with username (email) and password
 * @param {string} username - Username to use as email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credentials object
 * @throws {Error} Firebase authentication error
 */
export const loginUser = async (username, password) => {
  const auth = getFirebaseAuth();
  
  // Use username as email by appending a domain
  const email = `${username.toLowerCase()}@snakeclash.local`;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Handle Firebase specific errors
    throw handleFirebaseError(error);
  }
};

/**
 * Handle Firebase errors and return user-friendly messages
 * @param {Error} error - Firebase error object
 * @returns {Error} Processed error with user message
 */
const handleFirebaseError = (error) => {
  const errorCode = error.code;
  let userMessage = 'Ha ocurrido un error al registrar la cuenta.';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      userMessage = 'Este usuario ya está registrado.';
      break;
    case 'auth/invalid-email':
      userMessage = 'El correo electrónico no es válido.';
      break;
    case 'auth/weak-password':
      userMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      break;
    case 'auth/operation-not-allowed':
      userMessage = 'La creación de cuentas no está habilitada.';
      break;
    case 'auth/network-request-failed':
      userMessage = 'Error de conexión. Verifica tu conexión a internet.';
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      userMessage = 'El usuario no existe o la contraseña es incorrecta.';
      break;
    default:
      userMessage = error.message || 'Ha ocurrido un error desconocido.';
  }

  const processedError = new Error(userMessage);
  processedError.code = errorCode;
  return processedError;
};
