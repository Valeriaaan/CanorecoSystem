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

// -------------------------------------------------- Enable Bootstrap ToolTip

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

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

// -------------------------------------------------- Format Date and Time

function formatDate(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var formattedDate = month + ' ' + date + ', ' + year;
    return formattedDate;
}

function formatTime(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var formattedTime = hour + ':' + (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec);
    return formattedTime;
}

export { formatMobileNumber , formatDate, formatTime };