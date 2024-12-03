// -------------------------------------------------- Firebase Imports
import { firestore, database } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, get, child, onValue,  } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js"; 
import { formatDate, formatTime, formatTimeTo12Hour, calculateDuration } from '../../../resources/js/main.js'; 

let map;
let tooltip;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map();

const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes(); // Format: HHMM

let selectedOutageId = null;

window.showEditStatusModal = function(outageId) {
    selectedOutageId = outageId;
    const modal = new bootstrap.Modal(document.getElementById('editStatusModal'));
    modal.show();
}

window.updateOutageStatus = async function() {
    const status = document.getElementById('outageStatusSelect').value;

    if (selectedOutageId) {
        // Confirm the update action
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to update the outage status?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, update it!'

        }).then(async (result) => {
            
            if (result.isConfirmed) {
                
                Swal.fire({
                    title: 'Updating...',
                    text: 'Please wait while the outage status is being updated.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const outageRef = doc(firestore, 'outages', selectedOutageId);
                    await updateDoc(outageRef, { status });

                    // Close the modal and refresh the outage list
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editStatusModal'));
                    modal.hide();
                    await fetchFilteredOutages(true);

                    // Show success message
                    Swal.fire({
                        title: 'Updated!',
                        text: `Outage status has been updated to: ${status}`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    console.log(`Outage status updated to: ${status}`);
                } catch (error) {
                    console.error("Error updating outage status:", error);
                    Swal.fire({
                        title: 'Error!',
                        text: 'There was a problem updating the outage status.',
                        icon: 'error'
                    });
                }
            }
        });
    }
};


// -------------------------------------------------- Fetch and Process Damaged Devices from RTDB

function fetchDamagedDevicesFromRTDB() {
    const damagedDevicesRef = ref(database, 'devices'); 

    onValue(damagedDevicesRef, async (snapshot) => {
        selectedLocations.clear(); // Clear the map to avoid duplicate entries
        await fetchFilteredOutages(true); 

        if (snapshot.exists()) {
            const barangaysData = await fetchBarangaysData(); // Fetch barangay data
            const devicesData = snapshot.val();

            // Iterate over devices to find damaged ones and add them to selectedLocations
            Object.keys(devicesData).forEach(deviceId => {
                const device = devicesData[deviceId];
                if (device.status === 'damaged') {
                    const barangayId = device.id; // Use idName as the barangay ID
                    const locationData = barangaysData.find(item => String(item.barangayId) === String(barangayId));

                    if (locationData) {
                        const combinedId = String(barangayId);
                        const timestamp = new Date().getTime(); 

                        selectedLocations.set(combinedId, {
                            name: locationData.barangayName,
                            type: 'current',
                            outageId: String(timestamp),
                            outageGawain: 'nulled'
                        });

                        console.log(`Added damaged device location ID: ${combinedId} (${locationData.barangayName}) with outageId: ${timestamp}`);
                    } else {
                        console.log('No matching barangay found for ID:', barangayId);
                    }
                }
            });

            console.log('Selected Locations with Damaged Devices:', Array.from(selectedLocations.entries()));
            highlightSelectedLocations(); 
        } else {
            console.log("No damaged devices found.");
        }
    }, (error) => {
        console.error("Error fetching damaged devices in real-time:", error);
    });
}


// -------------------------------------------------- Fetch Data and Log to Console

async function init() {
    try {
        const outagesSnapshot = await getDocs(outagesCollection);
        const outages = outagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const barangaysData = await fetchBarangaysData();

        outages.forEach(outage => {
            outage.selectedLocations.forEach(location => {
                const locationName = getLocationName(location, barangaysData);
                if (locationName) {
                    selectedLocations.set(location, locationName);
                }
            });
        });

        await initMap();
        
        fetchDamagedDevicesFromRTDB();
        await fetchFilteredOutages(true);
        setupSearchBar();
        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('map').classList.remove('d-none');

        // Update outage count after initialization

    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

// -------------------------------------------------- Initialize Map

async function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 14.222795, lng: 122.689153 },
        zoom: 10,
        mapId: "976f61fbc51048c2",
    });

    // Load the GeoJSON data for the barangays
    map.data.loadGeoJson('../../../resources/json/filtered_Barangays.json', null, (features) => {
        if (features.length === 0) {
            console.error("No features were loaded. Please check the GeoJSON file and its path.");
        }
    });

    // Style the polygons on the map
    map.data.setStyle((feature) => {
        let color = '#810FCB';
        const featureId = `${feature.getProperty('ID_3')}`;
        if (selectedLocations.has(featureId)) {
            color = '#FF0000';
        }
        return {
            fillColor: color,
            strokeColor: color,
            strokeWeight: 0,
            fillOpacity: selectedLocations.has(featureId) ? 0.5 : 0,
        };
    });

    highlightSelectedLocations();
}

// -------------------------------------------------- Fetch Barangays JSON data

async function fetchBarangaysData() {
    const response = await fetch('../../../resources/json/filtered_Barangays.json');
    const data = await response.json();
    return data.features.map(feature => ({
        municipalityId: feature.properties.ID_2,
        municipalityName: feature.properties.NAME_2,
        barangayId: feature.properties.ID_3,
        barangayName: feature.properties.NAME_3,
        fullName: `${feature.properties.NAME_3}`, 
        coordinates: feature.geometry.coordinates 
    }));
}

// -------------------------------------------------- Get Location Name

function getLocationName(locationId, barangaysData) {
    const location = barangaysData.find(loc => `${loc.barangayId}` === locationId);
    return location ? location.fullName : null;
}

// -------------------------------------------------- Display Outage Cards

function displayOutageCards(outages) {
    const outagesContainer = document.getElementById('outagesContainer');
    const emptyState = document.getElementById('emptyState');
    
    outagesContainer.innerHTML = ''; // Clear existing cards
    
    if (outages.length === 0) {
        // Show the empty state if no outages are available
        emptyState.style.display = 'block';
        document.getElementById('outagesContainer').classList.add('d-none');
    } else {
        // Hide the empty state and display the outage cards
        emptyState.style.display = 'none';
        document.getElementById('outagesContainer').classList.remove('d-none');
        
        outages.forEach(outage => {
            const affectedLocations = outage.selectedLocations.map(loc => selectedLocations.get(loc)).join(', ');

            const card = document.createElement('div');
            card.className = 'card shadow-sm mb-3';
            card.setAttribute('data-id', outage.id);

            card.innerHTML = `
            <div class="card-body" role="button">
                <div class="p-2">
                    <h5 class="card-title fw-bold">${outage.title}</h5>
                    <p class="card-text mb-0 mt-2"><strong>Activity:</strong> ${outage.gawain}</p>
                    <p class="card-text mb-0 mt-2"><strong>Date:</strong> ${new Date(outage.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
                    <p class="card-text mb-0 mt-2"><strong>Time:</strong> ${formatTimeTo12Hour(outage.startTime)} - ${formatTimeTo12Hour(outage.endTime)} (${calculateDuration(outage.startTime,outage.endTime)})</p>
                    <p class="card-text mb-0 mt-2"><strong>Affected Locations:</strong> ${affectedLocations || 'None'}</p>
                </div>
                <div class="d-flex gap-2 p-2">
                    <a type="button" class="btn btn-sm btn-outline-primary w-50" href="edit-outage.html?id=${outage.id}">Edit</a>
                    <button type="button" class="btn btn-sm btn-outline-danger w-50" onclick="deleteOutage('${outage.id}')">Delete</button>
                </div>
            </div>
            `;

            // Add a click event listener to the card
            card.addEventListener('click', () => {
                highlightLocations(outage.selectedLocations);
                highlightLocationCard(outage.id);
            });

            outagesContainer.appendChild(card);
        });
    }
}

// -------------------------------------------------- Update Outage Count

function updateOutageCount(count, totalCount) {
    const countElement = document.querySelector('.outage-count'); // Assuming there's an element with class 'outage-count'
    if (countElement) {
        countElement.textContent = `${count} of ${totalCount}`; // Update the display with the count
    }
}

// -------------------------------------------------- Highlight Functions

function highlightLocationCard(id) {
    const locationsContainer = document.getElementById('outagesContainer');
    const locationCards = locationsContainer.querySelectorAll('.card');

    locationCards.forEach(card => {
        card.classList.remove('highlight');  
        if (card.getAttribute('data-id') === id) {
            card.classList.add('highlight');  
        }
    });

    const highlightedCard = locationsContainer.querySelector(`.card[data-id="${id}"]`);
    if (highlightedCard) {
        highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        console.log('Highlighted card not found.');
    }
}

function highlightLocations(locationIds) { // for Card Clicks
    map.data.setStyle((feature) => {
        const featureId = `${feature.getProperty('ID_3')}`;
        if (locationIds.includes(featureId)) {
            return {
                fillColor: '#ff7b07',
                strokeColor: '#ff7b07',
                strokeWeight: 1.5,
                fillOpacity: 0.7,
            };
        } else {
            return {
                fillColor: '#810FCB',
                strokeColor: '#FFFFFF',
                strokeWeight: 0,
                fillOpacity: 0,
            };
        }
    });
}

function highlightSelectedLocations() {
    map.data.setStyle((feature) => {
        const featureId = `${feature.getProperty('ID_3')}`;
        if (selectedLocations.has(featureId)) {
            return {
                fillColor: '#ff7b07',
                strokeColor: '#ff7b07',
                strokeWeight: 1.5,
                fillOpacity: 0.7,
            };
        } else {
            return {
                fillColor: '#810FCB',
                strokeColor: '#FFFFFF',
                strokeWeight: 0,
                fillOpacity: 0,
            };
        }
    });
}

// -------------------------------------------------- Filter Outages by Date and Time

async function fetchFilteredOutages(isCurrentOutages) {
    console.log(`Fetching ${isCurrentOutages ? 'current' : 'future'} outages...`);
    const outagesSnapshot = await getDocs(outagesCollection);
    const barangaysData = await fetchBarangaysData();

    const filteredOutages = [];
    selectedLocations.clear();

    outagesSnapshot.forEach((doc) => {
        const outage = doc.data();
        const outageId = doc.id;
        const outageDate = outage.date;
        const outageStartTime = parseInt(outage.startTime.replace(':', '')); 
        const outageEndTime = parseInt(outage.endTime.replace(':', '')); 

        let isMatchingOutage = false;
        if (isCurrentOutages) {
            // Check if the outage is happening today and within the current time range
            if (outageDate === formattedDate && currentTime >= outageStartTime && currentTime <= outageEndTime) {
                isMatchingOutage = true;
            }
        } else {
            // Check if the outage is in the future or later today
            if (outageDate > formattedDate || (outageDate === formattedDate && currentTime < outageStartTime)) {
                isMatchingOutage = true;
            }
        }

        // If the outage matches the filter (current/future), add it to the map and the card list
        if (isMatchingOutage) {
            outage.selectedLocations.forEach(location => {
                const locationName = getLocationName(location, barangaysData);
                if (locationName) {
                    selectedLocations.set(location, locationName);
                }
            });
            filteredOutages.push({ id: outageId, ...outage });
        }
    });

    highlightSelectedLocations();
    displayOutageCards(filteredOutages); 
    updateOutageCount(filteredOutages.length, outagesSnapshot.size);
}

// -------------------------------------------------- Dropdown event listener

document.getElementById('outageFilter').addEventListener('change', async (event) => {
    const isCurrentOutages = event.target.value === 'current';

    document.getElementById('map').classList.add('d-none');
    document.getElementById('loadingSpinner').classList.remove('d-none');
    await fetchFilteredOutages(isCurrentOutages);
    document.getElementById('map').classList.remove('d-none');
    document.getElementById('loadingSpinner').classList.add('d-none');
});

// -------------------------------------------------- Search Bar Functionality

function setupSearchBar() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const outageCards = document.querySelectorAll('#outagesContainer .card');
        let visibleCount = 0; // Counter for visible cards

        outageCards.forEach(card => {
            const gawainText = card.querySelector('.card-text strong').nextSibling.nodeValue.trim().toLowerCase();
            if (gawainText.includes(query)) {
                card.style.display = 'block'; 
                visibleCount++; // Increment the count for visible cards
            } else {
                card.style.display = 'none';
            }
        });

        // Update outage count based on visible cards
        updateOutageCount(visibleCount, outageCards.length);
    });
}

// -------------------------------------------------- Delete Outage Function

window.deleteOutage = async (id) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you really want to delete this scheduled outage?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',  
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });

    if (result.isConfirmed) {

        Swal.fire({
            title: 'Deleting...',
            text: 'Please wait while the outage is being deleted.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const outageDocRef = doc(firestore, 'outages', id);
            await deleteDoc(outageDocRef);
            Swal.fire({
                title: 'Deleted!',
                text: 'Outage has been removed.',
                icon: 'success',
                confirmButtonColor: "#007bff"
            });

            // Refresh the outage data after deletion
            const outageFilter = document.getElementById('outageFilter');
            const isCurrentOutages = outageFilter.value === 'current';
            await fetchFilteredOutages(isCurrentOutages);
            
        } catch (error) {
            console.error('Error deleting outage:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Unable to delete the outage. Please try again.',
                icon: 'error',
                confirmButtonColor: "#007bff"
            });
        }
    }
};

// -------------------------------------------------- Initialize the App

init();
