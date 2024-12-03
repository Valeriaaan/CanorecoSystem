import { firestore, database } from '../../../resources/js/config.js';
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js"; // Import set for RTDB operations

let map;
let markers = [];
let locations = [];
let selectedLocation = null; // Store the selected location

// -------------------------------------------------- Map Setup

window.initMap = async () => {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 14.126453952452705, lng: 122.93794081616616 },
        zoom: 12,
    });

    const locationsSnapshot = await getDocs(collection(firestore, 'posts'));
    locations = locationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(location => !location.hasDevice && location.hasTransformer === true);

    updateLocationsDisplay(locations);

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('addDeviceForm').classList.remove('d-none');
    document.getElementById('map').classList.remove('d-none');
};

function updateLocationsDisplay(filteredLocations) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    filteredLocations.forEach(location => {
        addMarker(location, location.id);
    });
}

function addMarker(location, id) {
    const icon = '../../resources/images/img-electric-pole.png';

    const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.id,
        icon: {
            url: icon,
            scaledSize: new google.maps.Size(32, 32),
        },
    });
    markers.push(marker);

    marker.addListener('click', () => {
        zoomToLocation(location.latitude, location.longitude);

        // Populate fields with location data
        document.getElementById('deviceID').value = `${location.barangay}-${location.id}`;
        document.getElementById('municipality').value = location.municipality || 'N/A';
        document.getElementById('barangay').value = location.barangay || 'N/A';

        // Store the selected location
        selectedLocation = location;
    });
}

function zoomToLocation(lat, lng) {
    if (map) {
        map.setCenter({ lat, lng });
        map.setZoom(18);
    } else {
        console.error('Map is not initialized');
    }
}

// -------------------------------------------------- Add Device Form

document.getElementById('addDeviceForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    if (!selectedLocation) {
        // No location selected, show an error message
        Swal.fire('Error', 'Please select an electric post on the map.', 'error');
        return;
    }

    const deviceID = document.getElementById('deviceID').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;

    // Show confirmation dialog
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to save this Device?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true,
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Saving...',
                text: 'Please wait while the device is being saved.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            try {
                const deviceData = {
                    id: selectedLocation.id, 
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    locationName:barangay,
                    municipality:municipality,
                    barangay:barangay,
                    assigned: '', 
                    date: '', 
                    endTime: '', 
                    isFromDevice: false, 
                    startTime: '', 
                    status: 'Inactive',
                    timestamp: 0 
                };

                await set(ref(database, `devices/${selectedLocation.id}`), deviceData);

                const postRef = doc(firestore, 'posts', selectedLocation.id);
                await updateDoc(postRef, { hasDevice: true });

                Swal.fire('Saved!', 'The device has been saved.', 'success').then(() => {
                    document.getElementById('addDeviceForm').reset();
                    form.classList.remove('was-validated');
                    selectedLocation = null; 
                    window.location.href = 'devices.html';
                });
            } catch (error) {
                console.error('Error saving document:', error);
                Swal.fire('Error', 'An error occurred while saving the device.', 'error');
            }
        }
    });
});
