// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Helper Functions

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

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
            document.getElementById('birthdate').value = employeeData.dateOfBirth || "";
            document.getElementById('profilePicturePreview').src = employeeData.image || "";
            document.getElementById('profilePicturePreview').style.display = employeeData.image ? 'block' : 'none';
            document.getElementById('area').value = employeeData.area || "";

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

    // Check form validity
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const municipality = document.getElementById('municipality').value;
    const barangay = document.getElementById('barangay').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const birthdate = document.getElementById('birthdate').value;
    const profilePicture = document.getElementById('profilePicture').files[0];
    const area = document.getElementById('area').value;

    // Confirmation prompt
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
                Swal.showLoading(); // Show loading animation
            }
        });

        try {
            const docRef = doc(firestore, 'users', employeeID);

            let profilePictureUrl = '';
            if (profilePicture) {
                const storageReference = storageRef(storage, `profile_pictures/${employeeID}/updated`);
                await uploadBytes(storageReference, profilePicture);
                profilePictureUrl = await getDownloadURL(storageReference);
            }

            await updateDoc(docRef, {
                firstName: firstName,
                lastName: lastName,
                municipality: municipality,
                barangay: barangay,
                phone: contactNumber,
                birthdate: birthdate,
                image: profilePictureUrl,
                area: area
            });

            Swal.fire('Updated!', 'Employee details has been updated.', 'success').then(() => {
                document.getElementById('editEmployeeForm').reset();
                form.classList.remove('was-validated');
                window.location.href = 'employee.html';
            });

        } catch (error) {
            console.error('Error updating document:', error);

            // Error message in case of failure
            Swal.fire('Error', 'An error occurred while updating the employee.', 'error');
        }
    }
});
