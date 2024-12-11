// -------------------------------------------------- Firebase Imports

import { firestore, storage } from '../../../resources/js/config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// -------------------------------------------------- Helper Functions

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// -------------------------------------------------- Fetch Barangays JSON data

async function fetchBarangaysData() {
    const response = await fetch('../../../resources/json/filtered_Barangays.json');
    const data = await response.json();
    return data.features.map(feature => ({
        municipalityId: feature.properties.ID_2,
        municipalityName: feature.properties.NAME_2,

        barangayId: feature.properties.ID_3,
        barangayName: feature.properties.NAME_3,
        
        fullName: `${feature.properties.NAME_2}, ${feature.properties.NAME_3}`, 
        coordinates: feature.geometry.coordinates 
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    const municipalitySelect = document.getElementById('municipality');
    const barangaySelect = document.getElementById('barangay');

    const barangaysData = await fetchBarangaysData();

    const municipalities = new Set(barangaysData.map(item => item.municipalityName));

    municipalities.forEach(municipality => {
        const option = document.createElement('option');
        option.value = municipality;
        option.textContent = municipality;
        municipalitySelect.appendChild(option);
    });

    municipalitySelect.addEventListener('change', function() {
        barangaySelect.innerHTML = '<option value="" disabled selected>Select barangay</option>';

        const selectedMunicipality = municipalitySelect.value;
        const filteredBarangays = barangaysData.filter(item => item.municipalityName === selectedMunicipality);

        filteredBarangays.forEach(barangay => {
            const option = document.createElement('option');
            option.value = barangay.barangayName;
            option.textContent = barangay.barangayName;
            barangaySelect.appendChild(option);
        });
    });
});

// -------------------------------------------------- Load Consumer Data

const consumerID = getQueryParam('id');
if (consumerID) {
    loadConsumerData(consumerID);
}

async function loadConsumerData(consumerID) {
    try {
        const docRef = doc(firestore, 'users', consumerID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const consumerData = docSnap.data();

            document.getElementById('firstName').value = consumerData.firstName || "";
            document.getElementById('lastName').value = consumerData.lastName || "";
            document.getElementById('contactNumber').value = consumerData.phone || "";
            document.getElementById('municipality').value = consumerData.municipality || "";

            const municipalitySelect = document.getElementById('municipality');
            municipalitySelect.dispatchEvent(new Event('change'));

            document.getElementById('barangay').value = consumerData.barangay || "";

            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('editConsumerForm').classList.remove('d-none');
        } else {
            console.error('No such document!');
            Swal.fire('Error', 'No such consumer document found.', 'error');
        }
    } catch (error) {
        console.error('Error getting document:', error);
        Swal.fire('Error', 'An error occurred while loading the consumer data.', 'error');
    }
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('editConsumerForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;
    const contactNumber = document.getElementById('contactNumber').value;

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this consumer?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true
    });
 
    if (result.isConfirmed) {
        
        Swal.fire({
            title: 'Updating...',
            text: 'Please wait while consumer details are being updated.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading(); 
            }
        });

        try {
            const docRef = doc(firestore, 'users', consumerID);
            const consumerSnapshot = await getDoc(docRef);

            await updateDoc(docRef, {
                firstName: firstName,
                lastName: lastName,
                municipality: municipality,
                barangay: barangay,
                phone: contactNumber
            });

            Swal.fire('Updated!', 'Consumer details have been updated.', 'success').then(() => {
                document.getElementById('editConsumerForm').reset();
                form.classList.remove('was-validated');
                window.location.href = 'consumer.html';
            });

        } catch (error) {
            console.error('Error updating document:', error);
            Swal.fire('Error', 'An error occurred while updating the consumer.', 'error');
        }
    }
});
