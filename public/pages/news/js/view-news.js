// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// -------------------------------------------------- Populate Content

function populateNewsContent(title, content, date, category) {
    // Get the news container element
    const newsContainer = document.getElementById('newsContainer');

    // Define the HTML structure for the news content
    const newsHTML = `
        <div class="mb-2">
            <span id="news-category" class="badge bg-primary">${category}</span>
        </div>

        <h4 id="news-title" class="card-title">${title}</h4>

        <span class="far fa-calendar text-muted mb-3"></span><small id="news-date" class="text-muted ms-2 mb-3">${formatDate(date)}</small>

        <p id="news-content" class="card-text">${content}</p>
    `;

    // Set the innerHTML of the newsContainer
    newsContainer.innerHTML = newsHTML;
}
