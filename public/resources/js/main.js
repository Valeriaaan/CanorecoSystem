import { auth, firestore } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc, collection, onSnapshot, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Auth State Change

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../../../index.html';
    } else {
        displayUserDetails(user.uid);
        listenForNotifications(user.uid); 
    }
});

// -------------------------------------------------- Fetch and display user details

async function displayUserDetails(uid) {
    try {
        
        includeHTML();
        const userDocRef = doc(firestore, 'users', uid);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            document.getElementById('userFullName').textContent = userData.firstName + ' ' +userData.lastName;
            document.getElementById('userProfilePicture').src = userData.image;
        } else {
            console.error('No user data found');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// -------------------------------------------------- Listen for Notifications

function listenForNotifications(uid) {
    const userNotificationsRef = collection(firestore, `users/${uid}/notifications`);
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationBadge = document.getElementById('notificationBadge');

    onSnapshot(userNotificationsRef, (snapshot) => {
        let notificationCount = 0;

        // Clear current dropdown content
        notificationDropdown.innerHTML = '';

        if (snapshot.empty) {
            // Show message if no notifications
            notificationDropdown.innerHTML = '<li><span class="dropdown-item text-dark mb-0">No new notifications</span></li>';
            notificationBadge.style.display = 'none';
        } else {
            snapshot.forEach(async (doc) => {
                const notificationData = doc.data();
                const notificationId = doc.id;
                const title = notificationData.title.length > 30 ? notificationData.title.substring(0, 30) + '...' : notificationData.title;
                const message = notificationData.text || '';
                const timestamp = notificationData.timestamp || '';
                const status = notificationData.status;
                const isRead = notificationData.isRead;

                const backgroundClass = status === false ? 'notification-body' : '';

                // Format the notification content for the dropdown
                const notificationHTML = `
                    <li class="notification-item m-0 py-1 ${backgroundClass}" id="notification-${notificationId}">
                        <a class="dropdown-item text-dark" href="#">
                            <div class="d-flex flex-column">
                                <div class="d-flex justify-content-between align-items-start">
                                    <strong class="me-2">${title}</strong>
                                    <button type="button" class="btn-close ms-2" aria-label="Close" data-id="${notificationId}"></button>
                                </div>
                                <div class="d-flex justify-content-between align-items-start">
                                    <small class="me-2">${message}</small>
                                    <small class="text-muted">${getTimeElapsed(timestamp)}</small>
                                </div>
                            </div>
                        </a>
                    </li>
                    <li><hr class="dropdown-divider m-0"></li>
                `;

                notificationDropdown.insertAdjacentHTML('beforeend', notificationHTML);
                notificationCount++;

                // Show toast only if isRead is false
                if (!isRead) {
                    showNotificationToast(title, message, timestamp);
                    await updateNotificationReadStatus(uid, notificationId); // Mark notification as read after showing toast
                }
            });
            
            // Add the "View All" button at the end of the list
            const viewAllHTML = `
                <li><a class="dropdown-item text-muted text-center m-0" href="../notification/notification.html">View All</a></li>
            `;
            notificationDropdown.insertAdjacentHTML('beforeend', viewAllHTML);
            
            if (notificationCount > 0) {
                notificationBadge.style.display = 'inline-block';
            } else {
                notificationBadge.style.display = 'none';
            }

            // Add event listeners for all dynamically added close buttons
            const closeButtons = document.querySelectorAll('.btn-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const notificationId = event.target.getAttribute('data-id');
                    deleteNotification(uid, notificationId);
                });
            });
        }
    });
}

// -------------------------------------------------- Function to delete notification from Firestore

async function deleteNotification(uid, notificationId) {
    try {
        const notificationRef = doc(firestore, `users/${uid}/notifications/${notificationId}`);
        await deleteDoc(notificationRef);
        // Show toast notification after deletion
        showDeletionToast("Notification has been removed");
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// -------------------------------------------------- Show Deletion Toast

function showDeletionToast(message) {
    const toastHTML = `
        <div class="toast align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    let toastContainer = document.getElementById('deletionToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'deletionToastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.left = '20px';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }

    const newToast = document.createElement('div');
    newToast.innerHTML = toastHTML;
    toastContainer.appendChild(newToast);

    const toastElement = new bootstrap.Toast(newToast.querySelector('.toast'));
    toastElement.show();
}

// -------------------------------------------------- Show Toast Notification

function showNotificationToast(title, message, timestamp, uid) {
    const timeElapsed = getTimeElapsed(timestamp); // Calculate time since the notification was created

    const toastHTML = `
        <div class="toast my-1" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">${title}</strong>
                    <small>${timeElapsed}</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
        </div>
    `;

    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }

    if (toastContainer.children.length >= 3) {
        toastContainer.removeChild(toastContainer.firstChild); // Remove the oldest toast
    }

    const newToast = document.createElement('div');
    newToast.innerHTML = toastHTML;
    toastContainer.appendChild(newToast);

    const toastElement = new bootstrap.Toast(newToast.querySelector('.toast'));
    toastElement.show();
}

async function updateNotificationReadStatus(uid, notificationId) {
    try {
        const notificationRef = doc(firestore, `users/${uid}/notifications/${notificationId}`);
        await updateDoc(notificationRef, {
            isRead: true
        });
        console.log(`Notification ${notificationId} marked as read.`);
    } catch (error) {
        console.error('Error updating notification read status:', error);
    }
}

// -------------------------------------------------- Calculate Elapsed Time

function getTimeElapsed(epochTime) {
    const now = Date.now(); // Get the current timestamp
    const diffInSeconds = Math.floor((now - epochTime * 1000) / 1000); 

    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minutes ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hours ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} days ago`;
    }
}

// -------------------------------------------------- Logout functionality

document.getElementById('logout').addEventListener('click', async () => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Logout',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            await signOut(auth);
            Swal.fire({
                icon: 'success',
                title: 'Logged out',
                text: 'You have been logged out successfully.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '../../../index.html'; 
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Logout Failed',
                text: 'An error occurred while logging out. Please try again.',
            });
            console.error('Logout failed:', error);
        }
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
    
    var ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    
    // Format time in HH:MM:SS AM/PM
    var formattedTime = hour + ':' + (min < 10 ? '0' + min : min) + ' ' + ampm;
    
    return formattedTime;
}

function formatTimeTo12Hour(time) {
    if (!time) return null;
    const [hour, minute] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12; // Convert 0 to 12 for midnight
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}


// Function to calculate duration
function calculateDuration(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute);

    const end = new Date();
    end.setHours(endHour, endMinute);

    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHrs} hr(s) & ${diffMins} min(s)`;
    }


export { formatMobileNumber , formatDate, formatTime, formatTimeTo12Hour, calculateDuration };