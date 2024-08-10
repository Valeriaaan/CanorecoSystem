import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

let map;
let marker;
let geocoder;
let selectedLatLng = null;

window.initMap = initMap;

async function loadBusinessCenterData(id) {
    try {
        const docRef = doc(firestore, "business_centers", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('locationName').value = data.locationName;
            document.getElementById('unit').value = data.unit;
            document.getElementById('municipality').value = data.municipality;
            document.getElementById('barangay').value = data.barangay;
            document.getElementById('street').value = data.street;

            const position = { lat: data.latitude, lng: data.longitude };
            selectedLatLng = position;

            marker = new google.maps.Marker({
                position: position,
                map: map,
                draggable: true,
            });
            map.setCenter(position);

            geocodeLatLng(position);

        } else {
            console.error("No such document!");
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
}

function initMap() {
    const initialLocation = { lat: 14.126453952452705, lng: 122.93794081616616 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: initialLocation,
    });

    geocoder = new google.maps.Geocoder();

    map.addListener("click", (event) => {
        const clickedLocation = event.latLng.toJSON();
        placeMarker(clickedLocation);
        selectedLatLng = clickedLocation;
        geocodeLatLng(clickedLocation);
    });
}

function placeMarker(location) {
    if (marker) {
        marker.setPosition(location);
    } else {
        marker = new google.maps.Marker({
            position: location,
            map: map,
            draggable: true,
        });
    }

    map.panTo(location);
}

function geocodeLatLng(latLng) {
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                const addressComponents = results[0].address_components;
                document.getElementById('municipality').value = getAddressComponent(addressComponents, 'locality');
                document.getElementById('barangay').value = getAddressComponent(addressComponents, 'sublocality_level_1');
                document.getElementById('street').value = getAddressComponent(addressComponents, 'route');
            }
        } else {
            console.error("Geocoder failed due to: " + status);
        }
    });
}

function getAddressComponent(components, type) {
    for (let component of components) {
        if (component.types.includes(type)) {
            return component.long_name;
        }
    }
    return '';
}

document.getElementById("editBusinessCenterForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = new URLSearchParams(window.location.search).get("id");

    const form = event.target;
    if (form.checkValidity() === false || !selectedLatLng) {
        event.stopPropagation();
        Swal.fire('Error', 'Please complete the form and select a location on the map.', 'error');
        return;
    }
    form.classList.add('was-validated');

    const updatedData = {
        locationName: form.locationName.value,
        unit: form.unit.value,
        municipality: form.municipality.value,
        barangay: form.barangay.value,
        street: form.street.value,
        latitude: selectedLatLng.lat,
        longitude: selectedLatLng.lng
    };

    try {
        const docRef = doc(firestore, "business_centers", id);
        await updateDoc(docRef, updatedData);

        Swal.fire('Success', 'Business Center updated successfully!', 'success')
            .then(() => window.location.href = "../centers/business-center.html");
    } catch (error) {
        console.error("Error updating document:", error);
        Swal.fire('Error', 'Failed to update Business Center. Please try again.', 'error');
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
        loadBusinessCenterData(id);
    } else {
        console.error("No ID provided in the URL.");
    }
});
