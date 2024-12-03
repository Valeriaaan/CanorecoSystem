// -------------------------------------------------- Firebase Imports
import { firestore, database } from '../../../resources/js/config.js';
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, get, remove } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { calculateDuration, formatTime, formatTimeTo12Hour } from '../../../resources/js/main.js'; 

let map;
let markers = [];
let locations = [];
let devices = [];

// -------------------------------------------------- Map Setup

window.initMap = async () => {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 14.126453952452705, lng: 122.93794081616616 },
        zoom: 12,
    });

    // Fetch Firestore Posts locations
    const locationsSnapshot = await getDocs(collection(firestore, 'posts'));
    locations = locationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(location => !location.hasDevice);

    // Fetch RTDB devices
    const devicesRef = ref(database, 'devices');
    const devicesSnapshot = await get(devicesRef);

    if (devicesSnapshot.exists()) {
        devices = Object.entries(devicesSnapshot.val()).map(([key, value]) => ({
            id: key,
            ...value,
        }));
    }

    // Combine locations and devices data
    const combinedData = [...locations, ...devices];

    updateLocationsDisplay(combinedData);

    document.getElementById('searchInput').addEventListener('input', filterDevices);
    document.getElementById('devicesFilter').addEventListener('change', filterDevices);

    updateLocationCount(devices.length);

    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('map').classList.remove('d-none');
};

// -------------------------------------------------- Marker Setup

function addMarker(location, id) {
    let icon;
    let iconSize;

    if (location.locationName) {
        // Device-specific icons based on status
        switch (location.status?.toLowerCase()) {
            case 'damaged':
                icon = '../../resources/images/img_device_red.png';
                break;
            case 'working':
                icon = '../../resources/images/img_device_green.png';
                break;
            case 'under repair':
                icon = '../../resources/images/img_device_blue.png';
                break;
            case 'inactive':
                icon = '../../resources/images/img_device_gray.png';
                break;
            default:
                icon = '../../resources/images/img_device_gray.png'; // Default icon for unknown status
        }
        iconSize = new google.maps.Size(38, 38);
    } else {
        // Electric pole icon
        icon = '../../resources/images/img-electric-pole.png';
        iconSize = new google.maps.Size(32, 32);
    }

    const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.locationName || location.deviceName,
        icon: {
            url: icon,
            scaledSize: iconSize,
        },
    });

    markers.push(marker);

    marker.addListener('click', () => {
        zoomToLocation(location.latitude, location.longitude);
        highlightLocationCard(id);
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

// -------------------------------------------------- Location Display

function updateLocationsDisplay(filteredLocations) {
    // Remove all existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    const devicesContainer = document.getElementById('devicesContainer');
    devicesContainer.innerHTML = ''; // Clear existing cards in the container

    // Add markers and corresponding cards for each location/device
    filteredLocations.forEach(location => {
        addMarker(location, location.id);

        // Only add cards for devices from RTDB
        if (devices.some(device => device.id === location.id)) {
            addDeviceToCard(location, location.id);
        }
    });

    updateLocationCount(filteredLocations.filter(location => devices.some(device => device.id === location.id)).length);
}

function updateLocationCount(count) {
    const countElement = document.querySelector('.device-count');
    if (countElement) {
        countElement.textContent = `${count} of ${devices.length}`;
    }
}

function filterDevices() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('devicesFilter').value;

    const filteredDevices = devices.filter(device => {
        const matchesSearch = device.locationName.toLowerCase().includes(searchInput);
        const matchesStatus = statusFilter === '' || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    
    const combinedFilteredData = [...locations, ...filteredDevices];
    updateLocationsDisplay(combinedFilteredData);
}


// -------------------------------------------------- Add Device Card

function addDeviceToCard(device, id) {
    const devicesContainer = document.getElementById('devicesContainer');
    const col = document.createElement('div');

    col.className = 'center-card card shadow-sm mb-3';
    col.setAttribute('data-lat', device.latitude);
    col.setAttribute('data-lng', device.longitude);
    col.setAttribute('data-id', id);

    let address = `${device.municipality || 'Unknown Municipality'}, ${device.barangay || 'Unknown Barangay'}`;

    const timeRange =
    formatTimeTo12Hour(device.startTime) && formatTimeTo12Hour(device.endTime)
        ? `${formatTimeTo12Hour(device.startTime)} - ${formatTimeTo12Hour(device.endTime)} (${calculateDuration(device.startTime, device.endTime)})`
        : formatTimeTo12Hour(device.startTime) || formatTimeTo12Hour(device.endTime) || null;

    const dateTimestamp =
    (device.date && device.timestamp > 0 && formatTime(device.timestamp))
        ? `${device.date} ${formatTime(device.timestamp)}`
        : device.date || (device.timestamp > 0 ? formatTime(device.timestamp) : null);

    // Building the additional details conditionally
    const details = [
        { label: 'Assigned', value: device.assigned },
        { label: 'Time to Fix', value: timeRange },
        { label: 'Outage Date & Time', value: dateTimestamp },
    ]
        .filter(detail => detail.value) 
        .map(detail => `<p class="card-text mb-0 mt-2"><strong>${detail.label}:</strong> ${detail.value}</p>`)
        .join('');
 
    // Include divider if details exist
    const divider = details ? `<hr class="my-3">` : '';

    col.innerHTML = `
        <div class="card-body" role="button">
            <div class="p-2">
                <h5 class="card-title fw-bold">${device.locationName}-${device.id}</h5>
                <p class="text-muted mb-0 mt-2"><i class="fas fa-globe fa-sm me-2"></i>${device.latitude}, ${device.longitude}</p>
                <p class="text-muted mb-0 mt-2"><i class="fas fa-location-dot fa-sm me-2"></i> ${address}</p>
                <p class="card-text mb-0 mt-2"><strong>Status:</strong> ${device.status}</p>

                ${divider}
                ${details}
            </div>
            <div class="d-flex gap-2 p-2">
                <a href="edit-devices.html?id=${id}" class="btn btn-sm btn-outline-primary w-50">Edit</a>
                <button type="button" class="btn btn-sm btn-outline-danger w-50" onclick="confirmDeleteDevice('${id}', '${device.locationName}-${device.id}')">Delete</button>
            </div>
        </div>
    `;

    devicesContainer.appendChild(col);

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

// -------------------------------------------------- Helper Functions

function highlightLocationCard(id) {
    const locationsContainer = document.getElementById('devicesContainer');
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

// -------------------------------------------------- Delete Device


window.confirmDeleteDevice = async (id, name) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you really want to delete the device "${name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',  
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });

    if (result.isConfirmed) {
        
        Swal.fire({
            title: 'Deleting...',
            text: 'Please wait while the device is being deleted.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        deleteDevice(id);
    } else {
        console.log('Cancelled: No deletion performed');
    }
};

async function deleteDevice(id) {
    try {
        const deviceRef = ref(database, `devices/${id}`);
        
        await remove(deviceRef);

        const postRef = doc(firestore, 'posts', id);
        await updateDoc(postRef, { hasDevice: false });

        Swal.fire('Deleted!', 'The device has been deleted.', 'success');
        window.initMap(); 

    } catch (error) {
        Swal.fire('Error!', 'There was an error deleting the device.', 'error');
        console.error('Error deleting device:', error);
    }
}
