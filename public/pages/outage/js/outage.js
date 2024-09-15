// -------------------------------------------------- Firebase Imports
import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

let map;
let tooltip;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map();

const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes(); // Format: HHMM

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
        await fetchFilteredOutages(true);
        setupSearchBar();

        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('map').classList.remove('d-none');

    } catch (error) {
        console.error('Error initializing the application:', error);
    }
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
    } else {
        // Hide the empty state and display the outage cards
        emptyState.style.display = 'none';
        
        outages.forEach(outage => {
            const affectedLocations = outage.selectedLocations.map(loc => selectedLocations.get(loc)).join(', ');

            const card = document.createElement('div');
            card.className = 'card shadow-sm mb-3';
            card.setAttribute('data-id', outage.id);

            card.innerHTML = `
            <div class="card-body">
                <div class="p-2">
                    <h5 class="card-title fw-bold">${outage.title}</h5>
                    <p class="card-text mb-0 mt-2"><strong>Gawain:</strong> ${outage.gawain}</p>
                    <p class="card-text mb-0 mt-2"><strong>Date:</strong> ${new Date(outage.date).toLocaleDateString()}</p>
                    <p class="card-text mb-0 mt-2"><strong>Affected Locations:</strong> ${affectedLocations || 'None'}</p>
                </div>
                <div class="d-flex gap-2 p-2">
                    <button type="button" class="btn btn-sm btn-outline-primary w-50">Details</button>
                    <button type="button" class="btn btn-sm btn-outline-danger w-50" onclick="deleteOutage('${outage.id}')">Remove</button>
                </div>
            </div>
            `;

            outagesContainer.appendChild(card);
        });
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

// -------------------------------------------------- Highlight Selected Locations

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

        outageCards.forEach(card => {
            const gawainText = card.querySelector('.card-text strong').nextSibling.nodeValue.trim().toLowerCase();
            if (gawainText.includes(query)) {
                card.style.display = 'block'; 
            } else {
                card.style.display = 'none';
            }
        });
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
