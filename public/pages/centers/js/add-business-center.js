// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';  
import { collection, addDoc} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatMobileNumber } from '../../../resources/js/main.js'; 

// -------------------------------------------------- Map and Marker Setup

let map;
let marker;
let geocoder;
let selectedLatLng = null;  

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
// -------------------------------------------------- Locate Marker Function

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
                    } else if (types.includes("route")) {
                        street = component.long_name;
                    }
                }

                document.getElementById('municipality').value = municipality;
                document.getElementById('street').value = street;

                fetchBarangayData(municipality, latlng);
            }
        } else {
            console.error("Geocode was not successful for the following reason: " + status);
        }
    });
}


// -------------------------------------------------- Fetch Barangay Function

function fetchBarangayData(municipality, latlng) {
    const barangayDataUrl = `../centers/ph-json/Barangays.json`;

    fetch(barangayDataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const barangay = findBarangay(data, latlng);

            if (barangay) {
                document.getElementById('barangay').value = barangay;
            } else {
                console.error("No barangay data found for the location.");
            }
        })
        .catch(error => {
            console.error('Error fetching barangay data:', error);
        });
}

function findBarangay(data, latlng) {
    for (const feature of data.features) {
        const coordinates = feature.geometry.coordinates[0];
        // Transform coordinates to [lng, lat] format
        const polygon = coordinates.map(coord => [coord[0], coord[1]]);
        if (isPointInPolygon(latlng, polygon)) {
            return feature.properties.NAME_3; 
        }
    }
    return null;
}

function isPointInPolygon(point, polygon) {
    const x = point.lng();
    const y = point.lat();

    let inside = false;
    const numVertices = polygon.length;

    let j = numVertices - 1;
    for (let i = 0; i < numVertices; i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            inside = !inside;
        }

        j = i;
    }

    return inside;
}

// -------------------------------------------------- Format Mobile Number Inputs

document.getElementById('mobile').addEventListener('input', function() {
    formatMobileNumber(this);
});

document.getElementById('additionalMobile').addEventListener('input', function() {
    formatMobileNumber(this);
});
// -------------------------------------------------- Form Submission Handling

document.getElementById('addBusinessCenterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    // Validate mobile numbers
    const mobileInput = document.getElementById('mobile');
    const additionalMobileInput = document.getElementById('additionalMobile');
    const mobile = mobileInput.value;
    const additionalMobile = additionalMobileInput.value;

    // Clear existing validation messages
    mobileInput.setCustomValidity('');
    additionalMobileInput.setCustomValidity('');

    if (mobile.length !== 11) {
        mobileInput.setCustomValidity('Mobile number must be 11 digits long.');
    }

    if (additionalMobile && additionalMobile.length !== 11) {
        additionalMobileInput.setCustomValidity('Additional mobile number must be 11 digits long.');
    }

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

        // Reset the form and marker
        document.getElementById('addBusinessCenterForm').reset();
        form.classList.remove('was-validated');
        if (marker) {
            marker.setMap(null);
            marker = null;
        }
        selectedLatLng = null;

    } catch (error) {
        console.error('Error saving document:', error);
        Swal.fire('Error', 'An error occurred while saving the business center.', 'error');
    }
});
