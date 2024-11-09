// -------------------------------------------------- Firebase Imports

import { firestore, storage } from '../../../resources/js/config.js';  
import { collection, addDoc, setDoc, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// -------------------------------------------------- Add News

document.getElementById('addNewsForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    const newsTitle = document.getElementById('newsTitle').value;
    const newsCategory = document.getElementById('newsCategory').value;
    const newsContent = document.getElementById('newsContent').value;
    const newsImages = document.getElementById('newsImages').files;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to save this news?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true

    }).then(async (result) => {
        if (result.isConfirmed) {

            Swal.fire({
                title: 'Saving...',
                text: 'Please wait while the news is being saved.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                if (!firestore) {
                    throw new Error('Firestore instance is not initialized correctly.');
                }

                const newsCollectionRef = collection(firestore, 'news');
                const timestamp = Math.floor(new Date().getTime() / 1000.0).toString();

                const imageUrls = [];
                for (const file of newsImages) {
                    const storageRef = ref(storage, `newsImages/${timestamp}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    imageUrls.push(downloadURL);
                }

                await setDoc(doc(newsCollectionRef, timestamp), {
                    title: newsTitle,
                    date: "",
                    startTime: "",
                    endTime: "",
                    gawain: "",
                    content: newsContent,
                    category: newsCategory,
                    selectedLocations: "",
                    timestamp: timestamp,
                    image: imageUrls, 
                    status: ""
                });

                await updateDoc(doc(firestore, 'sms', 'to_all'), {
                    content: `${newsTitle}\n\n${newsContent}\n\nPara sa iba pang impormasyon, maaaring bumisita sa CANORECO Mobile App`,
                    send: true
                });

                // Get all users from the 'users' collection
                const usersCollectionRef = collection(firestore, 'users');
                const querySnapshot = await getDocs(usersCollectionRef);
                
                // Add notifications for all users
                querySnapshot.forEach(async (userDoc) => {
                    const userId = userDoc.id;
                    const userNotificationsRef = collection(firestore, `users/${userId}/notifications`);

                    await setDoc(doc(userNotificationsRef, timestamp), {
                        title: `${newsCategory}`,
                        text: `${newsTitle}`,
                        status: false,
                        isRead: false,
                        timestamp: timestamp
                    });
                });

                Swal.fire('Saved!', 'The news has been saved successfully.', 'success').then(() => {
                    form.reset();
                    form.classList.remove('was-validated');
                    window.location.href = 'news.html';
                });

            } catch (error) {
                console.error('Error saving document:', error.message || error);
                Swal.fire('Error', `An error occurred while saving the news: ${error.message}`, 'error');
            }
        }
    });
});
