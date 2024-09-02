// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate } from '../../../resources/js/main.js';

// Get the 'id' parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
const newsId = urlParams.get('id');

if (newsId) {
    // Proceed to fetch and display the news data
    fetchNewsData(newsId);
} else {
    // Handle the case where no id is provided (optional)
    console.error("No news ID provided in the URL.");
}

// -------------------------------------------------- Fetch News

async function fetchNewsData(id) {
    try {
        const newsRef = doc(firestore, 'news', id);
        const docSnap = await getDoc(newsRef);

        if (docSnap.exists()) {
            // Extract data from the document
            const newsData = docSnap.data();
            const { title, content, timestamp, category } = newsData;

            // Populate the newsContainer with news data
            populateNewsContent(title, content, timestamp, category);
        } else {
            console.error("No such document!");
        }
    } catch (error) {
        console.error("Error fetching news:", error);
    } finally {
        // Hide the loading spinner and show the news container
        document.getElementById('loadingSpinner').classList.add('d-none');
    }
}

// -------------------------------------------------- Populate Content & handle Delete and Edit functions

function populateNewsContent(title, content, date, category) {
    // Get the news container element
    const newsContainer = document.getElementById('newsContainer');

    // Define the HTML structure for the news content
    const newsHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div class="mb-2">
                <span id="news-category" class="badge bg-primary">${category}</span>
            </div>
            <div>
                <button class="edit-item btn btn-sm btn-outline-primary me-1 px-2">
                    <i class="fas fa-edit d-inline d-sm-none"></i><span class="d-none d-sm-inline">Edit</span>
                </button>
                <button class="delete-item btn btn-sm btn-outline-danger px-2">
                    <i class="fas fa-trash-alt d-inline d-sm-none"></i><span class="d-none d-sm-inline">Delete</span>
                </button>
            </div>
        </div>

        <h4 id="news-title" class="card-title">${title}</h4>

        <span class="far fa-calendar text-muted mb-3"></span><small id="news-date" class="text-muted ms-2 mb-3">${formatDate(date)}</small>

        <p id="news-content" class="card-text">${content}</p>
    `;

    // Set the innerHTML of the newsContainer
    newsContainer.innerHTML = newsHTML;

    // Add event listeners for the edit and delete buttons
    document.querySelector('.edit-item').addEventListener('click', () => {
        // Redirect to edit-news.html with the news ID in the query string
        window.location.href = `edit-news.html?id=${newsId}`;
    });

    document.querySelector('.delete-item').addEventListener('click', async () => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(firestore, 'news', newsId));
                Swal.fire('Deleted!', 'The news item has been deleted.', 'success');

                window.location.href = 'news.html';

            } catch (error) {
                console.error("Error deleting news:", error);
                Swal.fire('Error!', 'There was an error deleting the news item.', 'error');
            }
        }
    });
}
