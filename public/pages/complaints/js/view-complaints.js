// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
        const complaintRef = doc(firestore, 'complaints', id);
        const docSnap = await getDoc(complaintRef);

        if (docSnap.exists()) {
            // Extract data from the document
            const complaintData = docSnap.data();
            const { title, description, timestamp, category } = complaintData;

            // Populate the complaintContainer with complaint data
            populateComplaintContent(title, description, timestamp, category);
        } else {
            console.error("No such document!");
        }
    } catch (error) {
        console.error("Error fetching complaint:", error);
    } finally {
        // Hide the loading spinner and show the complaint container
        document.getElementById('loadingSpinner').classList.add('d-none');
    }
}

// -------------------------------------------------- Populate Content

function populateComplaintContent(title, description, date, category) {
    // Get the complaint container element
    const complaintContainer = document.getElementById('complaintContainer');

    // Define the HTML structure for the complaint content
    const complaintHTML = `
        <div class="mb-2">
            <span id="complaint-category" class="badge bg-primary">${category}</span>
        </div>

        <h4 id="complaint-title" class="card-title">${title}</h4>

        <span class="far fa-calendar text-muted mb-3"></span><small id="complaint-date" class="text-muted ms-2 mb-3">${formatDate(date)}</small>

        <p id="complaint-description" class="card-text">${description}</p>
    `;

    // Set the innerHTML of the complaintContainer
    complaintContainer.innerHTML = complaintHTML;
}
