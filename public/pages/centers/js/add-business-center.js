// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';  
import { collection, addDoc} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatMobileNumber } from '../../../resources/js/main.js'; 
import { geocodeLatLng } from '../js/functions-center.js'; 

// -------------------------------------------------- Map and Marker Setup

let map;
let marker;
let selectedLatLng = null;  

window.initMap = initMap;

function initMap() {
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
    
    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('addBusinessCenterForm').classList.remove('d-none');
    document.getElementById('map').classList.remove('d-none');
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('addBusinessCenterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    const mobileInput = document.getElementById('mobile');
    const additionalMobileInput = document.getElementById('additionalMobile');
    const mobile = mobileInput.value;
    const additionalMobile = additionalMobileInput.value;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    if (mobile.length !== 13) {
        Swal.fire('Error!', 'The mobile number must be 13 characters long.', 'error');
        return;
    }

    if (additionalMobile && additionalMobile.length !== 13) {
        Swal.fire('Error!', 'The additional mobile number must be 13 characters long.', 'error');
        return;
    }

    if (!selectedLatLng) {
        // No location selected, show an error message
        Swal.fire('Error', 'Please select a location on the map.', 'error');
        return;
    }

    const locationName = document.getElementById('locationName').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;
    const street = document.getElementById('street').value;
    const unit = document.getElementById('unit').value;

    // Show confirmation dialog
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to save this Business Center?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true

    }).then(async (result) => {
        if (result.isConfirmed) {

            Swal.fire({
                title: 'Saving...',
                text: 'Please wait while the business center is being saved.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await addDoc(collection(firestore, 'business_centers'), {
                    locationName: locationName,
                    latitude: selectedLatLng.lat(),
                    longitude: selectedLatLng.lng(),
                    municipality: municipality,
                    barangay: barangay,
                    street: street,
                    unit: unit,
                    mobile: mobile,
                    additionalMobile: additionalMobile
                });

                Swal.fire('Saved!', 'The location has been saved.', 'success').then(() => {
                    // Reset the form and marker
                    document.getElementById('addBusinessCenterForm').reset();
                    form.classList.remove('was-validated');
                    if (marker) {
                        marker.setMap(null);
                        marker = null;
                    }
                    selectedLatLng = null;

                    window.location.href = 'business-center.html';
                });

            } catch (error) {
                console.error('Error saving document:', error);
                Swal.fire('Error', 'An error occurred while saving the business center.', 'error');
            }
        } 
    });
});
