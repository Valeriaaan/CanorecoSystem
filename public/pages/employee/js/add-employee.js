// -------------------------------------------------- Firebase Imports

import { auth, firestore, storage, messaging } from '../../../resources/js/config.js';  
import { getToken, getMessaging } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js";
import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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

// -------------------------------------------------- Add Employee

document.getElementById('addEmployeeForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    // Validate the form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // Get form field values
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const barangay = document.getElementById('barangay').value;
    const municipality = document.getElementById('municipality').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const birthdate = document.getElementById('birthdate').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value; // New employee password
    const userType = document.getElementById('userType').value;
    const area = document.getElementById('area').value;

    try {
        // Create the new employee user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        const usersCollection = collection(firestore, 'users');
        const userDoc = doc(usersCollection, userId);

        await setDoc(userDoc, {
            uid: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            barangay: barangay,
            municipality: municipality,
            dateOfBirth: `${birthdate[1].padStart(2, '0')}-${birthdate[2].padStart(2, '0')}-${birthdate[0]}`,
            phone: contactNumber,
            image: "",
            userType: userType,
            area: area,
            access: true,
            timestamp: Math.floor(new Date().getTime() / 1000.0)
        });

        // Show success message
        Swal.fire({
            title: 'Employee Added',
            text: 'The employee has been successfully added!',
            icon: 'success',
        }).then(() => {
            form.reset();
            form.classList.remove('was-validated');
            document.getElementById('profilePicturePreview').style.display = 'none';
            // Redirect to employee.html if needed
            window.location.href = 'employee.html'; // Redirect to employee.html
        });
        
    } catch (error) {
        console.error('Error adding employee:', error);
        Swal.fire({
            title: 'Error',
            text: `Failed to add employee: ${error.message}`,
            icon: 'error',
        });
    }
});


