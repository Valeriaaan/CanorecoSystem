 // -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';  
import { collection, addDoc} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

document.getElementById('addNewsForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    // Get form field values
    const newsTitle = document.getElementById('newsTitle').value;
    const newsCategory = document.getElementById('newsCategory').value;
    const newsContent = document.getElementById('newsContent').value;

    // Validate the form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    try {
        // Verify Firestore instance and create a collection reference
        if (!firestore) {
            throw new Error('Firestore instance is not initialized correctly.');
        }

        const newsCollectionRef = collection(firestore, 'news');

        if (!newsCollectionRef) {
            throw new Error('Failed to create a collection reference.');
        }

        // Add the news document to the Firestore collection
        await addDoc(newsCollectionRef, {
            title: newsTitle,
            content: newsContent,
            category: newsCategory,
            timestamp: new Date()  // Automatically add the current date and time
        });

        // Show success message
        Swal.fire('Saved!', 'The news has been saved successfully.', 'success').then(() => {
            // Reset the form after successful submission
            form.reset();
            form.classList.remove('was-validated');

            window.location.href = 'news.html';
        });

    } catch (error) {
        console.error('Error saving document:', error.message || error);
        Swal.fire('Error', `An error occurred while saving the news: ${error.message}`, 'error');
    }
});
