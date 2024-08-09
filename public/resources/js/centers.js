import { firestore } from './config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const locationsCollection = collection(firestore, 'business_centers');

let map;
let markers = [];

window.initMap = async () => {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 14.126453952452705, lng: 122.93794081616616 },
        zoom: 12,
    });

    const locationsSnapshot = await getDocs(locationsCollection);
    const locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    markers.forEach(marker => marker.setMap(null)); 
    markers = [];

    const locationsContainer = document.getElementById('locationsContainer');
    locationsContainer.innerHTML = '';

    locations.forEach(location => {
        addMarker(location, location.id);
        addLocationToCard(location, location.id);
    });
};

function addMarker(location, id) {
    const bayadCenterIcon = 'http://127.0.0.1:5000/resources/images/business-center-icon.png'; 

    const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.locationName,
        icon: {
            url: bayadCenterIcon,
            scaledSize: new google.maps.Size(86, 64) // Adjust size here
        }  
    });
    markers.push(marker);
}

function addLocationToCard(location, id) {
    const locationsContainer = document.getElementById('locationsContainer');
    const col = document.createElement('div');

    // Correctly setting data attributes on the card
    col.className = 'card shadow-sm mb-3';
    col.setAttribute('data-lat', location.latitude);
    col.setAttribute('data-lng', location.longitude);

    col.innerHTML = `
        <div class="card-body" role="button">
            <h5 class="card-title">${location.locationName}</h5>
            <p class="card-text">Latitude: ${location.latitude}</p>
            <p class="card-text">Longitude: ${location.longitude}</p>
            <div class="d-flex justify-content-between">
                <a href="edit-location.html?id=${id}" class="btn btn-warning">Edit</a>
                <button class="btn btn-danger" onclick="confirmDeleteLocation('${id}', '${location.locationName}')">Delete</button>
            </div>
        </div>
    `;
    
    locationsContainer.appendChild(col);

    col.addEventListener('click', () => {
        const lat = parseFloat(col.getAttribute('data-lat'));
        const lng = parseFloat(col.getAttribute('data-lng'));
        
        if (!isNaN(lat) && !isNaN(lng)) {
            zoomToLocation(lat, lng);
        } else {
            console.error('Invalid latitude or longitude:', lat, lng);
        }
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
        const locationDoc = doc(firestore, 'business_centers', id);
        await deleteDoc(locationDoc);
        Swal.fire('Deleted!', 'The location has been deleted.', 'success');
        window.initMap(); 
    } catch (error) {
        Swal.fire('Error!', 'There was an error deleting the location.', 'error');
        console.error('Error deleting location:', error);
    }
}
