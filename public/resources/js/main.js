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
            document.getElementById('userFullName').textContent = userData.firstName + ' ' +userData.lastName;
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

// -------------------------------------------------- Enable Bootstrap Popovers

const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))

// -------------------------------------------------- Mobile Number Input Format

function formatMobileNumber(input) {
    let value = input.value.replace(/\D/g, ''); 
    const formattedValue = value
        .replace(/^(\d{4})(\d{0,3})(\d{0,4})$/, (match, p1, p2, p3) => {
            let result = p1;
            if (p2) result += '-' + p2;
            if (p3) result += '-' + p3;
            return result;
        });
    input.value = formattedValue;
}

export { formatMobileNumber };