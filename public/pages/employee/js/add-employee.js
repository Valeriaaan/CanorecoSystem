// -------------------------------------------------- Firebase Imports

import { auth, firestore, storage } from '../../../resources/js/config.js';  
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getDownloadURL, ref as storageRef, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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
    const address = document.getElementById('address').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const birthdate = document.getElementById('birthdate').value;
    const profilePicture = document.getElementById('profilePicture').files[0];
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const roles = 'employee'; // You can adjust this according to your roles structure

    try {
        // 1. Create a new user account with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // 2. Upload the profile picture to Firebase Storage (if a file is selected)
        let profilePictureUrl = '';
        if (profilePicture) {
            const storageReference = storageRef(storage, `profile_pictures/${userId}`);
            await uploadBytes(storageReference, profilePicture);
            profilePictureUrl = await getDownloadURL(storageReference);
        }

        // 3. Save user data in Firestore under the "users" collection
        await addDoc(collection(firestore, 'users'), {
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            address: address,
            contactNumber: contactNumber,
            birthdate: birthdate,
            profilePicture: profilePictureUrl,
            email: email,
            roles: roles,
            status: 'Deactivated',
            timestamp: Math.floor(new Date().getTime()/1000.0)
        });

        // Show success message or redirect to another page
        alert('Employee added successfully!');
        form.reset();
        form.classList.remove('was-validated');
        document.getElementById('profilePicturePreview').style.display = 'none';
        
    } catch (error) {
        // Handle errors here
        console.error('Error adding employee:', error);
        alert('Failed to add employee. Please try again.');
    }
});

// -------------------------------------------------- Profile Picture Preview

document.getElementById('profilePicture').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('profilePicturePreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
});
