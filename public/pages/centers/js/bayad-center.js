// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const locationsCollection = collection(firestore, 'bayad_centers');

// -------------------------------------------------- Map and Marker Setup

let map;
let markers = [];
let locations = []; 

window.initMap = async () => {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 14.126453952452705, lng: 122.93794081616616 },
        zoom: 12,
    });

    const locationsSnapshot = await getDocs(locationsCollection);
    locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    updateLocationsDisplay(locations);

    document.getElementById('searchInput').addEventListener('input', filterLocations);
    document.getElementById('municipalityFilter').addEventListener('change', filterLocations);

    updateLocationCount(locations.length);

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('map').classList.remove('d-none')
};

function addMarker(location, id) {
    const bayadCenterIcon = '../../resources/images/payment-center-icon.png'; 

    const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.locationName,
        icon: {
            url: bayadCenterIcon,
            scaledSize: new google.maps.Size(64, 77) 
        }
    });
    markers.push(marker);

    marker.addListener('click', () => {
        highlightLocationCard(id);
        zoomToLocation(location.latitude, location.longitude);
    });
}

function zoomToLocation(lat, lng) {
    if (map) {
        map.setCenter({ lat: lat, lng: lng });
        map.setZoom(18); 
    } else {
        console.error('Map is not initialized');
    }
}

// -------------------------------------------------- Highlight Selected Card

function highlightLocationCard(id) {
    const locationsContainer = document.getElementById('locationsContainer');
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

// -------------------------------------------------- Location Filter

function updateLocationsDisplay(filteredLocations) {
    markers.forEach(marker => marker.setMap(null)); 
    markers = [];

    const locationsContainer = document.getElementById('locationsContainer');
    locationsContainer.innerHTML = '';

    filteredLocations.forEach(location => {
        addMarker(location, location.id);
        addLocationToCard(location, location.id);
    });

    updateLocationCount(filteredLocations.length);
}

function filterLocations() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const municipalityFilter = document.getElementById('municipalityFilter').value;

    const filteredLocations = locations.filter(location => {
        const matchesTitle = location.locationName.toLowerCase().includes(searchInput);
        const matchesMunicipality = municipalityFilter === '' || location.municipality === municipalityFilter;
        return matchesTitle && matchesMunicipality;
    });

    updateLocationsDisplay(filteredLocations);
}

function updateLocationCount(count) {
    const countElement = document.querySelector('.location-count');
    if (countElement) {
        countElement.textContent = `${count} of ${locations.length}`;
    }
}

// -------------------------------------------------- Add Location 

function addLocationToCard(location, id) {
    const locationsContainer = document.getElementById('locationsContainer');
    const col = document.createElement('div');

    col.className = 'center-card card shadow-sm mb-3';
    col.setAttribute('data-lat', location.latitude);
    col.setAttribute('data-lng', location.longitude);
    col.setAttribute('data-id', id);

    col.innerHTML = `
        <div class="card-body" role="button">
            <div class="p-2">
                <h5 class="card-title fw-bold">${location.locationName}</h5>
                <p class="text-muted mb-0 mt-2"><i class="fas fa-globe fa-sm me-2"></i>${location.latitude}, ${location.latitude}</p>
                <p class="text-muted mb-0 mt-2"><i class="fas fa-location-dot fa-sm me-2"></i>${location.municipality}, ${location.barangay}, ${location.street}, ${location.unit}</p>
            <div class="d-flex gap-2 p-2">
                <a href="edit-bayad-center.html?id=${id}" class="btn btn-sm btn-outline-primary w-50">Edit</a>
                <button type="button" class="btn btn-sm btn-outline-danger w-50" onclick="confirmDeleteLocation('${id}', '${location.locationName}')">Delete</button>
            </div>
        </div>
    `;
    
    locationsContainer.appendChild(col);

    col.addEventListener('click', () => {
        const lat = parseFloat(col.getAttribute('data-lat'));
        const lng = parseFloat(col.getAttribute('data-lng'));
        
        if (!isNaN(lat) && !isNaN(lng)) {
            zoomToLocation(lat, lng);
            highlightLocationCard(id);
        } else {
            console.error('Invalid latitude or longitude:', lat, lng);
        }
    });
}

// -------------------------------------------------- Delete Location 

window.confirmDeleteLocation = async (id, name) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you really want to delete the location "${name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',  
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });

    if (result.isConfirmed) {
        deleteLocation(id);
    } else {
        console.log('Cancelled: No deletion performed');
    }
};

async function deleteLocation(id) {
    try {
        const locationDoc = doc(firestore, 'bayad_centers', id);
        await deleteDoc(locationDoc);
        Swal.fire('Deleted!', 'The location has been deleted.', 'success');
        window.initMap(); 
    } catch (error) {
        Swal.fire('Error!', 'There was an error deleting the location.', 'error');
        console.error('Error deleting location:', error);
    }
}
