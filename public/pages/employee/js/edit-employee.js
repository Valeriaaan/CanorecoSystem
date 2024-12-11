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

// -------------------------------------------------- Load Employee Data

const employeeID = getQueryParam('id');
if (employeeID) {
    loadEmployeeData(employeeID);
}

async function loadEmployeeData(employeeID) {
    try {
        const docRef = doc(firestore, 'users', employeeID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const employeeData = docSnap.data();

            document.getElementById('firstName').value = employeeData.firstName || "";
            document.getElementById('lastName').value = employeeData.lastName || "";
            document.getElementById('contactNumber').value = employeeData.phone || "";
            document.getElementById('municipality').value = employeeData.municipality || "";
            document.getElementById('area').value = employeeData.area || "";
            document.getElementById('userType').value = employeeData.userType || "";

            // Trigger change event to populate barangay
            const municipalitySelect = document.getElementById('municipality');
            municipalitySelect.dispatchEvent(new Event('change'));

            // Set the barangay after the event
            document.getElementById('barangay').value = employeeData.barangay || "";

            // Hide the loading spinner and show the news container
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('editEmployeeForm').classList.remove('d-none');
        } else {
            console.error('No such document!');
            Swal.fire('Error', 'No such news document found.', 'error');
        }
    } catch (error) {
        console.error('Error getting document:', error);
        Swal.fire('Error', 'An error occurred while loading the news data.', 'error');
    }
}

// -------------------------------------------------- Form Submission Handling

document.getElementById('editEmployeeForm').addEventListener('submit', async function(event) {
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
    const area = document.getElementById('area').value;
    const userType = document.getElementById('userType').value;

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this employee?",
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
            text: 'Please wait while employee details is being updated.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading(); 
            }
        });

        try {
            const docRef = doc(firestore, 'users', employeeID);
            const employeeSnapshot = await getDoc(docRef);

            await updateDoc(docRef, {
                firstName: firstName,
                lastName: lastName,
                municipality: municipality,
                barangay: barangay,
                phone: contactNumber,
                area: area,
                userType: userType
            });

            Swal.fire('Updated!', 'Employee details has been updated.', 'success').then(() => {
                document.getElementById('editEmployeeForm').reset();
                form.classList.remove('was-validated');
                window.location.href = 'employee.html';
            });

        } catch (error) {
            console.error('Error updating document:', error);
            Swal.fire('Error', 'An error occurred while updating the employee.', 'error');
        }
    }
});
