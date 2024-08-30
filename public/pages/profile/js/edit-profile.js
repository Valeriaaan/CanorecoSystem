// -------------------------------------------------- Firebase Imports
import { firestore, auth } from '../../../resources/js/config.js';  
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { formatMobileNumber } from '../../../resources/js/main.js'; 


// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        loadUserProfile(user);
    } else {
        Swal.fire('Error', 'No user is logged in.', 'error');
    }
});

// -------------------------------------------------- Load Existing Profile Data

async function loadUserProfile(user) {
    if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Populate form fields with existing data
            document.getElementById('userPicture').src = data.profilePicture || 'https://github.com/mdo.png';
            document.getElementById('userName').textContent = data.firstName + ' ' + data.lastName;
            document.getElementById('userRole').textContent = data.role || '';

            document.getElementById('profilePicturePreview').src = data.profilePicture || 'https://github.com/mdo.png';
            document.getElementById('editFirstName').value = data.firstName || '';
            document.getElementById('editLastName').value = data.lastName || '';
            document.getElementById('editEmail').value = data.email || '';
            document.getElementById('editMobileNumber').value = data.mobileNumber || '';

            
            // Hide the loading spinner and show the news container
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('profileContent').classList.remove('d-none');
        } else {
            Swal.fire('Error', 'User profile not found.', 'error');
        }
    } else {
        Swal.fire('Error', 'No user is logged in.', 'error');
    }
}

// -------------------------------------------------- Profile Picture Handling

document.getElementById('editProfilePicture').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePicturePreview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// -------------------------------------------------- Upload Profile Picture

async function uploadProfilePicture(file) {
    const storageRef = firebase.storage().ref(`profile_pictures/${file.name}`);
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
}

// -------------------------------------------------- Format Mobile Number Inputs

document.getElementById('editMobileNumber').addEventListener('input', function() {
    formatMobileNumber(this);
});

// -------------------------------------------------- Edit Profile Form Submission

document.getElementById('editProfileForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const isValid = form.checkValidity();
    form.classList.add('was-validated');

    if (isValid) {
        const user = auth.currentUser;

        if (user) {
            const firstName = document.getElementById('editFirstName').value;
            const lastName = document.getElementById('editLastName').value;
            const email = document.getElementById('editEmail').value;
            const mobileNumber = document.getElementById('editMobileNumber').value;
            const profilePicture = document.getElementById('editProfilePicture').files[0];

            try {
                const docRef = doc(firestore, 'users', user.uid);

                await updateDoc(docRef, {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    mobileNumber: mobileNumber,
                    profilePicture: profilePicture ? await uploadProfilePicture(profilePicture) : document.getElementById('profilePicturePreview').src
                });

                // Update profile details in Firebase Auth
                await updateProfile(user, {
                    displayName: `${firstName} ${lastName}`,
                    photoURL: document.getElementById('profilePicturePreview').src
                });

                Swal.fire('Updated!', 'Your profile has been updated.', 'success').then(() => {
                    form.reset();
                    form.classList.remove('was-validated');
                    location.reload()
                });
                
            } catch (error) {
                console.error('Error updating profile:', error);
                Swal.fire('Error', 'An error occurred while updating the profile.', 'error');
            }
        } else {
            Swal.fire('Error', 'No user is logged in.', 'error');
        }
    }
});

// -------------------------------------------------- Change Password Form Submission

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = event.target;
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;


    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Passwords do not match',
            text: 'Please make sure the new password and confirmation password match.',
        });
        return;
    }

    const user = auth.currentUser;

    if (user) {
        const credential = EmailAuthProvider.credential(user.email, oldPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            Swal.fire({
                icon: 'success',
                title: 'Password Changed',
                text: 'Your password has been updated successfully.',
            });

            form.reset();
            form.classList.remove('was-validated');
            location.reload();

        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                Swal.fire({
                    icon: 'error',
                    title: 'Incorrect Old Password',
                    text: 'The old password you entered is incorrect.',
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to update password: ${error.message}`,
                });
            }
        }
    } else {
        Swal.fire({
            icon: 'error',
            title: 'No User Logged In',
            text: 'Please log in to change your password.',
        });
    }
});

