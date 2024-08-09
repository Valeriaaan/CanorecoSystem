// -------------------------------------------------- Firebase Imports

import { firestore } from './config.js';  
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Map and Marker Setup
let map;
let marker;
let geocoder;
let selectedLatLng = null;  // Variable to store the selected lat/lng

window.initMap = initMap;

function initMap() {
    const initialLocation = { lat: 14.126453952452705, lng: 122.93794081616616 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: initialLocation,
    });

    geocoder = new google.maps.Geocoder();

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
}


function geocodeLatLng(latlng) {
    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                const addressComponents = results[0].address_components;
                
                let municipality = "";
                let barangay = "";
                let street = "";

                for (const component of addressComponents) {
                    const types = component.types;
                    if (types.includes("locality")) {
                        municipality = component.long_name;
                    } else if (types.includes("sublocality_level_1") || types.includes("sublocality") || types.includes("sublocality_level_2") || types.includes("sublocality_level_3")) {
                        barangay = component.long_name;
                    } else if (types.includes("route")) {
                        street = component.long_name;
                    }
                }

                document.getElementById('municipality').value = municipality;
                document.getElementById('barangay').value = barangay;
                document.getElementById('street').value = street;
            }
        } else {
            console.error("Geocode was not successful for the following reason: " + status);
        }
    });
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('addBusinessCenterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
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

    Swal.fire({
        title: 'Confirm Save',
        text: "Do you want to save this business center?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Save'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await addDoc(collection(firestore, 'business_centers'), {
                    locationName: locationName,
                    latitude: selectedLatLng.lat(),
                    longitude: selectedLatLng.lng(),
                    municipality: municipality,
                    barangay: barangay,
                    street: street,
                    unit: unit
                });

                Swal.fire('Saved!', 'Business center has been saved.', 'success');
                // Optionally, reset the form and marker
                document.getElementById('addBusinessCenterForm').reset();
                if (marker) {
                    marker.setMap(null);
                    marker = null;
                }
                selectedLatLng = null;
            } catch (error) {
                console.error('Error saving document:', error);
                Swal.fire('Error', 'An error occurred while saving the business center.', 'error');
            }
        }
    });
});

