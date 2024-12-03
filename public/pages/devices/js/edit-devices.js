import { firestore, database } from '../../../resources/js/config.js';
import { collection, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, update, get  } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

let map;
let markers = [];
let locations = [];
let selectedDevice = null; // Store the selected device for editing

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

    const urlParams = new URLSearchParams(window.location.search);
    const deviceID = urlParams.get('id');

    if (deviceID) {
        fetchDeviceData(deviceID);
    } else {
        Swal.fire('Error', 'Device ID is missing from the URL.', 'error');
    }

    updateLocationsDisplay(locations);

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('editDeviceForm').classList.remove('d-none');
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

    marker.addListener('click', async () => {
        zoomToLocation(location.latitude, location.longitude);

        document.getElementById('deviceID').value = `${location.barangay}-${location.id}`;
        document.getElementById('municipality').value = location.municipality || 'N/A';
        document.getElementById('barangay').value = location.barangay || 'N/A';

        selectedDevice = location;
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

// -------------------------------------------------- Fetch device data

async function fetchDeviceData(deviceID) {
    try {
        const deviceRef = ref(database, `devices/${deviceID}`);
        const postRef = doc(firestore, 'posts', deviceID);

        // Fetch both Realtime Database and Firestore data
        const [deviceSnapshot, postDoc] = await Promise.all([get(deviceRef), getDoc(postRef)]);

        if (deviceSnapshot.exists() && postDoc.exists()) {
            const deviceData = deviceSnapshot.val();
            const postData = postDoc.data();

            populateFormFields(deviceID, deviceData, postData);

            // Set map marker and zoom
            if (deviceData.latitude && deviceData.longitude) {
                map.setCenter({ lat: deviceData.latitude, lng: deviceData.longitude });
                map.setZoom(18);
                addMarker(deviceData, deviceID);
            }

            selectedDevice = { id: deviceID, ...deviceData, ...postData };
        } else {
            Swal.fire('Error', 'Device data not found.', 'error');
        }
    } catch (error) {
        console.error('Error fetching device data:', error);
        Swal.fire('Error', 'Failed to load device details.', 'error');
    }
}

function populateFormFields(deviceID, deviceData, postData) {
    document.getElementById('deviceID').value = `${deviceData.barangay}-${deviceID}` || 'N/A';
    document.getElementById('municipality').value = deviceData.municipality || 'N/A';
    document.getElementById('barangay').value = deviceData.barangay || 'N/A';
}

// -------------------------------------------------- Edit Device Form

document.getElementById('editDeviceForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    if (!selectedDevice) {
        Swal.fire('Error', 'Please select a device to edit.', 'error');
        return;
    }

    const deviceID = document.getElementById('deviceID').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;

    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this device?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true,
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Updating...',
                text: 'Please wait while the device is being updated.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            try {
                const updatedData = {
                    ...selectedDevice,
                    locationName: barangay,
                    municipality: municipality,
                    barangay: barangay,
                    status: selectedDevice.status || 'Inactive',
                };

                await update(ref(database, `devices/${selectedDevice.id}`), updatedData);

                const postRef = doc(firestore, 'posts', selectedDevice.id);
                await updateDoc(postRef, { ...updatedData });

                Swal.fire('Updated!', 'The device details have been updated.', 'success').then(() => {
                    document.getElementById('editDeviceForm').reset();
                    form.classList.remove('was-validated');
                    selectedDevice = null; 
                    window.location.href = 'devices.html';
                });
            } catch (error) {
                console.error('Error updating device:', error);
                Swal.fire('Error', 'An error occurred while updating the device.', 'error');
            }
        }
    });
});
