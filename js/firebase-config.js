import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-init.js';

export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc };
