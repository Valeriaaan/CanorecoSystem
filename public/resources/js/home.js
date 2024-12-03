// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate, formatTime } from '../../../resources/js/main.js'; 
