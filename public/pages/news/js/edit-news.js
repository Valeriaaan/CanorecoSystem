// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Helper Functions

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// -------------------------------------------------- Load News Data

const newsId = getQueryParam('id');
if (newsId) {
    loadNewsData(newsId);
}

async function loadNewsData(newsId) {
    try {
        const docRef = doc(firestore, 'news', newsId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const newsData = docSnap.data();
            document.getElementById('newsTitle').value = newsData.title;
            document.getElementById('newsContent').value = newsData.content;
            document.getElementById('newsCategory').value = newsData.category;

            // Hide the loading spinner and show the news container
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('editNewsForm').classList.remove('d-none');
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

document.getElementById('editNewsForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const category = document.getElementById('newsCategory').value;

    try {
        const docRef = doc(firestore, 'news', newsId);

        await updateDoc(docRef, {
            title: title,
            content: content,
            category: category
        });

        Swal.fire('Updated!', 'The news has been updated.', 'success').then(() => {
            document.getElementById('editNewsForm').reset();
            form.classList.remove('was-validated');
            window.location.href = 'news.html';
        });
    } catch (error) {
        console.error('Error updating document:', error);
        Swal.fire('Error', 'An error occurred while updating the news.', 'error');
    }
});
