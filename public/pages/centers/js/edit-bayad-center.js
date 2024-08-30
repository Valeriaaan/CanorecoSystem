// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';  
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { geocodeLatLng } from '../js/functions-center.js'; 

// -------------------------------------------------- Map and Marker Setup

let map;
let marker;
let selectedLatLng = null;  
let bayadCenterId = null;  // Store the Bayad center ID for updating

window.initMap = initMap;

async function initMap() {
    const initialLocation = { lat: 14.126453952452705, lng: 122.93794081616616 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: initialLocation,
    });

    map.addListener("click", (event) => {
        const clickedLocation = event.latLng;
        selectedLatLng = clickedLocation;
        if (!marker) {
            marker = new google.maps.Marker({
                position: clickedLocation,
                map: map,
                draggable: true,
            });
        } else {
            marker.setPosition(clickedLocation);
        }

        geocodeLatLng(clickedLocation);
    });

    // Load Bayad center data if an ID is provided
    const urlParams = new URLSearchParams(window.location.search);
    bayadCenterId = urlParams.get('id');

    if (bayadCenterId) {
        await loadBayadCenterData(bayadCenterId);
    }

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('editBayadCenterForm').classList.remove('d-none')
    document.getElementById('map').classList.remove('d-none')
}

// -------------------------------------------------- Load Existing Bayad Center Data

async function loadBayadCenterData(id) {
    const docRef = doc(firestore, 'bayad_centers', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        document.getElementById('locationName').value = data.locationName || '';
        document.getElementById('municipality').value = data.municipality || '';
        document.getElementById('barangay').value = data.barangay || '';
        document.getElementById('street').value = data.street || '';
        document.getElementById('unit').value = data.unit || '';

        const latLng = { lat: data.latitude, lng: data.longitude };
        selectedLatLng = latLng;
        marker = new google.maps.Marker({
            position: latLng,
            map: map,
            draggable: true,
        });
        map.setCenter(latLng);
    } else {
        Swal.fire('Error', 'Bayad center not found.', 'error');
    }
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('editBayadCenterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    if (!selectedLatLng) {
        Swal.fire('Error', 'Please select a location on the map.', 'error');
        return;
    }

    const locationName = document.getElementById('locationName').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;
    const street = document.getElementById('street').value;
    const unit = document.getElementById('unit').value;

    try {
        const docRef = doc(firestore, 'bayad_centers', bayadCenterId);
        
       const latitude = typeof selectedLatLng.lat === 'function' ? selectedLatLng.lat() : selectedLatLng.lat;
       const longitude = typeof selectedLatLng.lng === 'function' ? selectedLatLng.lng() : selectedLatLng.lng;

        await updateDoc(docRef, {
            locationName: locationName,
            latitude: latitude,
            longitude: longitude,
            municipality: municipality,
            barangay: barangay,
            street: street,
            unit: unit
        });

        Swal.fire('Updated!', 'The location has been updated.', 'success').then(() => {
            // Reset the form and marker
            document.getElementById('editBayadCenterForm').reset();
            form.classList.remove('was-validated');
            if (marker) {
                marker.setMap(null);
                marker = null;
            }
            selectedLatLng = null;

            window.location.href = 'bayad-center.html';
        });


    } catch (error) {
        console.error('Error updating document:', error);
        Swal.fire('Error', 'An error occurred while updating the Bayad center.', 'error');
    }
});
