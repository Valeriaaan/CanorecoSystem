// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';  
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatMobileNumber } from '../../../resources/js/main.js'; 
import { geocodeLatLng } from '../js/functions-center.js'; 

// -------------------------------------------------- Map and Marker Setup

let map;
let marker;
let selectedLatLng = null;  
let businessCenterId = null;  // Store the business center ID for updating

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

    // Load business center data if an ID is provided
    const urlParams = new URLSearchParams(window.location.search);
    businessCenterId = urlParams.get('id');

    if (businessCenterId) {
        await loadBusinessCenterData(businessCenterId);
    }

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('editBusinessCenterForm').classList.remove('d-none')
    document.getElementById('map').classList.remove('d-none')
}

// -------------------------------------------------- Load Existing Business Center Data

async function loadBusinessCenterData(id) {
    const docRef = doc(firestore, 'business_centers', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        // Populate form fields with existing data
        document.getElementById('locationName').value = data.locationName || '';
        document.getElementById('municipality').value = data.municipality || '';
        document.getElementById('barangay').value = data.barangay || '';
        document.getElementById('street').value = data.street || '';
        document.getElementById('unit').value = data.unit || '';
        document.getElementById('mobile').value = data.mobile || '';
        document.getElementById('additionalMobile').value = data.additionalMobile || '';

        // Set the marker on the map
        const latLng = { lat: data.latitude, lng: data.longitude };
        selectedLatLng = latLng;
        marker = new google.maps.Marker({
            position: latLng,
            map: map,
            draggable: true,
        });
        map.setCenter(latLng);
    } else {
        Swal.fire('Error', 'Business center not found.', 'error');
    }
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('editBusinessCenterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    // Validate mobile numbers
    const mobileInput = document.getElementById('mobile');
    const additionalMobileInput = document.getElementById('additionalMobile');
    const mobile = mobileInput.value;
    const additionalMobile = additionalMobileInput.value;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    if (mobile.length !== 11) {
        Swal.fire('Error', 'Mobile number should be 11 digits long.', 'error');
        return;
    }

    if (additionalMobile && additionalMobile.length !== 11) {
        Swal.fire('Error', 'Additional mobile number should be 11 digits long.', 'error');
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

    // Confirmation prompt before updating
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this Business Center?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });

    if (result.isConfirmed) {
        // Show loading animation
        Swal.fire({
            title: 'Updating...',
            text: 'Please wait while the Business Center is being updated.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const docRef = doc(firestore, 'business_centers', businessCenterId);
            const latitude = typeof selectedLatLng.lat === 'function' ? selectedLatLng.lat() : selectedLatLng.lat;
            const longitude = typeof selectedLatLng.lng === 'function' ? selectedLatLng.lng() : selectedLatLng.lng;

            await updateDoc(docRef, {
                locationName: locationName,
                latitude: latitude,
                longitude: longitude,
                municipality: municipality,
                barangay: barangay,
                street: street,
                unit: unit,
                mobile: mobile,
                additionalMobile: additionalMobile
            });

            // Success message after update
            Swal.fire('Updated!', 'The Business Center information has been updated.', 'success').then(() => {
                // Reset the form and marker
                document.getElementById('editBusinessCenterForm').reset();
                form.classList.remove('was-validated');
                if (marker) {
                    marker.setMap(null);
                    marker = null;
                }
                selectedLatLng = null;

                window.location.href = 'business-center.html';
            });

        } catch (error) {
            console.error('Error updating document:', error);
            Swal.fire('Error', 'An error occurred while updating the Business Center.', 'error');
        }
    }
});

