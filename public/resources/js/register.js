// -------------------------------------------------- Firebase Imports

import { auth, firestore } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { collection, doc, setDoc,  } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// -------------------------------------------------- Auth State Change 

onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.endsWith('register.html')) {
        window.location.href = '../pages/dashboard/dashboard.html';
    }
});
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

// -------------------------------------------------- Register

document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const barangay = document.getElementById('barangay').value;
    const municipality = document.getElementById('municipality').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const birthdate = document.getElementById('birthdate').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value; 
    const userType = document.getElementById('userType').value;
    const area = document.getElementById('area').value;

    try {
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
            access: false,
            timestamp: Math.floor(new Date().getTime() / 1000.0)
        });

        Swal.fire({
            title: 'Register Success!',
            text: 'Account has been successfully registered! Please wait for your account to be validated by the head admin to have access to the system.',
            icon: 'success',
        }).then(() => {
            form.reset();
            form.classList.remove('was-validated');
            window.location.href = 'index.html'; 
        });
        
    } catch (error) {
        console.error('Error registering account:', error);
        Swal.fire({
            title: 'Error',
            text: `Failed to register account: ${error.message}`,
            icon: 'error',
        });
    }
});

// -------------------------------------------------- Include Header & Footer

async function includeHTML() {
    try {
        const headerResponse = await fetch('template/index-header.html');
        if (headerResponse.ok) {
            const headerHTML = await headerResponse.text();
            document.getElementById('header').innerHTML = headerHTML;
        } else {
            console.error('Failed to fetch header.html:', headerResponse.statusText);
        }

        const footerResponse = await fetch('template/index-footer.html');
        if (footerResponse.ok) {
            const footerHTML = await footerResponse.text();
            document.getElementById('footer').innerHTML = footerHTML;
        } else {
            console.error('Failed to fetch footer.html:', footerResponse.statusText);
        }
    } catch (error) {
        console.error('Error fetching HTML files:', error);
    }
}

window.addEventListener('DOMContentLoaded', includeHTML);
