// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

let map;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map(); // Change Set to Map to store location IDs and names

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

        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('map').classList.remove('d-none');

        displayOutageCards(outages); // Call function to display the outage cards

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
        fullName: `${feature.properties.NAME_3}`, // Full name for display
        coordinates: feature.geometry.coordinates // Save coordinates for highlighting
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
    outagesContainer.innerHTML = ''; // Clear any existing content

    outages.forEach(outage => {
        const card = document.createElement('div');
        card.className = 'card shadow-sm mb-3';
        card.setAttribute('data-id', outage.id);

        card.innerHTML = `
        <div class="card-body">
                <div class="p-2">
                    <h5 class="card-title fw-bold">${outage.title}</h5>
                    <p class="card-text mb-0 mt-2"><strong>Gawain:</strong> ${outage.gawain}</p>
                    <p class="card-text mb-0 mt-2"><strong>Date:</strong> ${new Date(outage.date).toLocaleDateString()}</p>
                    <p class="card-text mb-0 mt-2"><strong>Affected Locations:</strong> ${outage.selectedLocations.map(loc => selectedLocations.get(loc)).join(', ')}</p>
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
            fillOpacity = 0.5;
        }

        return {
            fillColor: color,
            strokeColor: color,
            strokeWeight: 0,
            fillOpacity: 0
        };
    });

    // Add mouseover event to show tooltip
    map.data.addListener('mouseover', (event) => {
        const featureName = event.feature.getProperty('NAME_3') || event.feature.getProperty('NAME_2');
        const tooltipContent = featureName || 'No name available';
        const tooltip = document.createElement('div');
        tooltip.className = 'map-tooltip';
        tooltip.innerText = tooltipContent;
        document.body.appendChild(tooltip);

        const position = event.latLng;
        tooltip.style.position = 'absolute';
        tooltip.style.left = `${position.lng()}px`;
        tooltip.style.top = `${position.lat()}px`;
    });

    // Add mouseout event to hide tooltip
    map.data.addListener('mouseout', () => {
        const tooltips = document.getElementsByClassName('map-tooltip');
        while (tooltips.length > 0) {
            tooltips[0].parentNode.removeChild(tooltips[0]);
        }
    });

    // Initial highlight of selected locations
    highlightSelectedLocations();
}

function highlightSelectedLocations() {
    map.data.setStyle((feature) => {
        const featureId = `${feature.getProperty('ID_3')}`;

        if (selectedLocations.has(featureId)) {
            return {
                fillColor: '#ff7b07',
                strokeColor: '#ff7b07',
                strokeWeight: 1.5,
                fillOpacity: 0.7
            };
        } else {
            return {
                fillColor: '#810FCB',
                strokeColor: '#FFFFFF',
                strokeWeight: 0,
                fillOpacity: 0
            };
        }
    });
}


// -------------------------------------------------- Delete Outage Function

window.deleteOutage = async (id) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you really want to delete this scheduled outage"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',  
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });

    if (result.isConfirmed) {
        deleteOutage(id);
    } else {
        console.log('Cancelled: No deletion performed');
    }
};

async function deleteOutage(outageId) {
    try {
        const outageDocRef = doc(firestore, 'outages', outageId);
        await deleteDoc(outageDocRef);

        // Remove the outage card from the DOM
        const cardToRemove = document.querySelector(`[data-id='${outageId}']`);
        if (cardToRemove) {
            cardToRemove.remove();
        }

        Swal.fire('Deleted!', 'The location has been deleted.', 'success');
        init();

    } catch (error) {
        Swal.fire('Error!', 'There was an error deleting the location.', 'error');
        console.error('Error deleting outage:', error);
    }

}

// -------------------------------------------------- Kick off the initialization process

init();
