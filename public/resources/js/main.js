import { auth, firestore } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Auth State Change

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../../../index.html';
    } else {
        displayUserDetails(user.uid);
    }
});

// -------------------------------------------------- Fetch and display user details

async function displayUserDetails(uid) {
    try {
        const userDocRef = doc(firestore, 'users', uid);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            document.getElementById('userFullName').textContent = userData.fullName;
            document.getElementById('userProfilePicture').src = userData.profilePicture;
        } else {
            console.error('No user data found');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// -------------------------------------------------- Logout functionality

document.getElementById('logout').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../../../index.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

// -------------------------------------------------- Include Sidebar

async function includeHTML() {
    try {
        const sideNav = await fetch('../../../template/main-sidenav.html');
        if (sideNav.ok) {
            const sidenavHTML = await sideNav.text();
            document.getElementById('side-nav').innerHTML = sidenavHTML;
        } else {
            console.error('Failed to fetch sidenav.html:', sideNav.statusText);
        }
    } catch (error) {
        console.error('Error fetching HTML files:', error);
    }
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', includeHTML);
