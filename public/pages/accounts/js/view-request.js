import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

function formatTimestamp(timestamp) {
    const date = new Date(timestamp.seconds * 1000); 
    return date.toLocaleString();
}

async function loadRequests() {
    const accountsCollectionRef = collection(firestore, "accounts");
    const accountsSnapshot = await getDocs(accountsCollectionRef);

    const requestsContainer = document.querySelector("#requestsContainer");
    requestsContainer.innerHTML = ''; 

    for (const accountDoc of accountsSnapshot.docs) {
        const accountData = accountDoc.data();
        const accountId = accountDoc.id;

        const requestsCollectionRef = collection(firestore, `accounts/${accountId}/requests`);
        const requestsSnapshot = await getDocs(requestsCollectionRef);

        requestsSnapshot.forEach((requestDoc) => {
            const requestData = requestDoc.data();

            const address = `${requestData.municipality || "N/A"}, ${requestData.barangay || "N/A"}`;
            const fullName = `${requestData.firstName || "Unknown"} ${requestData.lastName || "Unknown"}`;
            const accountNumber = requestData.accountNumber;
            const accountDetails = accountData.accountNumber === accountNumber ? accountData : null;

            const card = `
                <div class="col">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Request ID: ${requestDoc.id}</h5>
                            <p class="card-text"><strong>Name:</strong> ${fullName}</p>
                            <p class="card-text"><strong>Account Name:</strong> ${accountDetails?.accountName || "Unknown"}</p>
                            <p class="card-text"><strong>Barangay Name:</strong> ${accountDetails?.barangay || "Unknown"}</p>
                            <p class="card-text"><strong>Address:</strong> ${address}</p>
                            <p class="card-text"><strong>Status:</strong> ${requestData.status || "Pending"}</p>
                            <p class="card-text"><strong>Time Requested:</strong> ${formatTimestamp(requestData.timestamp)}</p>
                        </div>
                        <div class="card-footer d-flex justify-content-between">
                            <button class="btn btn-primary btn-sm">View</button>
                            <button class="btn btn-danger btn-sm">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            
            requestsContainer.insertAdjacentHTML('beforeend', card);
        });
    }
}

// Call the function to load the requests when the page is ready
window.addEventListener('DOMContentLoaded', loadRequests);
