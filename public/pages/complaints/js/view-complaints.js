// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
            const userData = userDoc.data();
            
            const complaintRef = doc(firestore, `users/${userId}/my_complaints`, id);
            const docSnap = await getDoc(complaintRef);

            if (docSnap.exists()) {
                // Extract data from the complaint document
                const complaintData = docSnap.data();
                const { concern, concernDescription, timestamp, status, reportTitle, address } = complaintData;

                // Extract additional fields from user data
                const { firstName, lastName, phone, images } = userData;

                // Populate the complaintContainer with complaint data
                populateComplaintContent(concern, concernDescription, timestamp, status, reportTitle, firstName, lastName, phone, address, images);
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

function populateComplaintContent(concern, description, date, status, title, firstName, lastName, phone, address, images) {
    const complaintContainer = document.getElementById('complaintContainer');

    // Create HTML for images
    let imagesHTML = '';
    if (Array.isArray(images) && images.length > 0) {
        imagesHTML = images.map((imageUrl) => `
            <img src="${imageUrl}" alt="User Image" class="col-12 img-fluid rounded mb-3" style="width: 100%;">
        `).join('');
    }

    const complaintHTML = `
        <div class="mb-2">
            <span id="complaint-category" class="badge bg-primary">${title}</span>
        </div>

        <h4 id="complaint-title" class="card-title">${concern}</h4>

        <span class="far fa-calendar text-muted mb-3"></span><small id="complaint-date" class="text-muted ms-2 mb-3">${formatDate(date)}</small>

        <p id="complaint-description" class="card-text">${description}</p>
        
        <hr>
        
        <div id="user-info">
            <h5>User Information</h5>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Phone Number:</strong> ${phone}</p>
            <p><strong>Address:</strong> ${address}</p>
            <div id="user-images" class="mt-3">
                ${imagesHTML}
            </div>
        </div>
    `;

    complaintContainer.innerHTML = complaintHTML;
}
