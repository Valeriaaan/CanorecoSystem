// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate } from '../../../resources/js/main.js';

// Get the 'id' parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
const complaintId = urlParams.get('id');

if (complaintId) {
    // Proceed to fetch and display the complaint data
    fetchComplaintData(complaintId);
} else {
    // Handle the case where no id is provided (optional)
    console.error("No complaint ID provided in the URL.");
}

// -------------------------------------------------- Fetch Complaint

async function fetchComplaintData(id) {
    try {
        // Query all users to find the complaint
        const usersSnapshot = await getDocs(collection(firestore, "users"));
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const complaintRef = doc(firestore, `users/${userId}/my_complaints`, id);
            const docSnap = await getDoc(complaintRef);

            if (docSnap.exists()) {
                // Extract data from the document
                const complaintData = docSnap.data();
                const { concern, concernDescription, timestamp, status, reportTitle } = complaintData;

                // Populate the complaintContainer with complaint data
                populateComplaintContent(concern, concernDescription, timestamp, status, reportTitle);
                return; 
            }
        }
        
        console.error("No such complaint found!");

    } catch (error) {
        console.error("Error fetching complaint:", error);
    } finally {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }
}

// -------------------------------------------------- Populate Content

function populateComplaintContent(concern, description, date, status, title) {
    const complaintContainer = document.getElementById('complaintContainer');

    const complaintHTML = `
        <div class="mb-2">
            <span id="complaint-category" class="badge bg-primary">${title}</span>
        </div>

        <h4 id="complaint-title" class="card-title">${concern}</h4>

        <span class="far fa-calendar text-muted mb-3"></span><small id="complaint-date" class="text-muted ms-2 mb-3">${formatDate(date)}</small>

        <p id="complaint-description" class="card-text">${description}</p>
    `;

    complaintContainer.innerHTML = complaintHTML;
}
