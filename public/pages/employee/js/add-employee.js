// -------------------------------------------------- Firebase Imports

import { auth, firestore, storage, messaging } from '../../../resources/js/config.js';  
import { getToken, getMessaging } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js";
import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getDownloadURL, ref as storageRef, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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
    const roles = 'employee';
    const area = document.getElementById('area').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        let profilePictureUrl = '';
        if (profilePicture) {
            const storageReference = storageRef(storage, `profile_pictures/${userId}`);
            await uploadBytes(storageReference, profilePicture);
            profilePictureUrl = await getDownloadURL(storageReference);
        }

        const usersCollection = collection(firestore, 'users');
        const userDoc = doc(usersCollection, userId);

        await setDoc(userDoc, {
            uid: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            address: address,
            birthdate: birthdate,
            contactNumber: contactNumber,
            profilePicture: profilePictureUrl,
            roles: roles,
            area: area,
            access: 'Deactivated',
            timestamp: Math.floor(new Date().getTime()/1000.0),
            password: password
        });

        Swal.fire({
            title: 'Employee Added',
            text: 'The employee has been successfully added!',
            icon: 'success',

        }).then(() => {
            form.reset();
            form.classList.remove('was-validated');
            document.getElementById('profilePicturePreview').style.display = 'none';
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
