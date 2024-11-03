import { auth, firestore } from '../../../resources/js/config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Auth State Change

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../../../index.html';
    } else {
        displayNotifications(user.uid);
    }
});

// -------------------------------------------------- Display Notifications on the Page

function displayNotifications(uid) {
    const userNotificationsRef = collection(firestore, `users/${uid}/notifications`);
    const newsContainer = document.getElementById('newsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');

    loadingSpinner.style.display = 'block';
    document.getElementById('newsContainer').classList.add('d-none');
 
    onSnapshot(userNotificationsRef, (snapshot) => {
        newsContainer.innerHTML = '';

        if (snapshot.empty) {
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('emptyState').classList.remove('d-none');
        } else {
            document.getElementById('emptyState').classList.add('d-none');

            snapshot.forEach((doc) => {
                const notificationData = doc.data();
                const notificationId = doc.id;
                const title = notificationData.title || 'No Title';
                const message = notificationData.text || '';
                const timestamp = notificationData.timestamp || '';
                const status = notificationData.status;
                const isRead = notificationData.isRead;
                
                const backgroundClass = status === false ? 'notification-body' : '';

                const notificationHTML = `
                    <div class="card center-card shadow-sm mb-3 ${backgroundClass}" id="notification-${notificationId}">
                        <div class="card-body" role="button">

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
                        </div>
                    </div>
                `;

                newsContainer.insertAdjacentHTML('beforeend', notificationHTML);
            });

            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('newsContainer').classList.remove('d-none');

            const deleteButtons = document.querySelectorAll('.delete-notification');
            deleteButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const notificationId = event.target.getAttribute('data-id');
                    deleteNotification(uid, notificationId);
                });
            });
        }
    });
}

// -------------------------------------------------- Delete Notification from Firestore

async function deleteNotification(uid, notificationId) {
    try {
        const notificationRef = doc(firestore, `users/${uid}/notifications/${notificationId}`);
        await deleteDoc(notificationRef);
        document.getElementById(`notification-${notificationId}`).remove();
        console.log('Notification deleted successfully');
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// -------------------------------------------------- Utility Function: Get time elapsed since notification

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