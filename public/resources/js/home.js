// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

let currentPage = 1;
let totalPages = 1;
const newsPerPage = 4;
const loadedNewsIds = new Set(); // Track loaded news IDs to prevent duplicates

loadNewsCards();
setupCategoryFilters();
setupPaginationControls();
setupSearchBar();
loadMaintenanceActivities();


// -------------------------------------------------- Function to load maintenance activities
async function loadMaintenanceActivities() {
    const maintenanceContainer = document.querySelector(".maintenance-activities"); // Select the maintenance cards container

    try {
        // Query the `outages` collection ordered by timestamp
        const q = query(collection(firestore, "outages"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            maintenanceContainer.innerHTML = `
                <p class="text-muted">No maintenance activities available at the moment.</p>
            `;
            return;
        }

        // Initialize a counter to limit the number of cards rendered to 4
        let cardCount = 0;

        // Loop through the documents and render the cards
        querySnapshot.forEach((docSnapshot) => {
            if (cardCount < 4) { // Check if the card count is less than 4
                const outageData = docSnapshot.data();
                renderMaintenanceCard(outageData, maintenanceContainer);
                cardCount++; // Increment the card count after each card is rendered
            }
        });

    } catch (error) {
        console.error("Error loading maintenance activities: ", error);
        Swal.fire('Error!', 'There was an error fetching the maintenance activities.', 'error');
    }
}


// -------------------------------------------------- Function to render a single maintenance card

function renderMaintenanceCard(outage, container) {
    const date = formatDate(outage.timestamp) || "Unknown Date";
    const trimmedContent = outage.content.length > 100 ? outage.content.substring(0, 50) + '...' : outage.content;
    const trimmedTitle = outage.gawain.length > 100 ? outage.gawain.substring(0, 80) + '...' : outage.gawain;

    const placeholderImage = "../../../resources/images/img_no_img_avail.png";

    const card = document.createElement("div");
    card.classList.add("col-lg-3", "col-md-6", "d-flex", "align-items-stretch"); // Ensure cards stretch to equal height
    card.innerHTML = `
        <div class="card border-0 mt-3">   
            <a href="view-news.html?id=${outage.timestamp}" class="text-decoration-none text-dark d-block">
                <div style="height: 300px;">
                    <img 
                        src="${outage.image || placeholderImage}" 
                        class="card-img-top" 
                        alt="${outage.gawain || 'Maintenance'}" 
                        style="width: 100%; height: 100%;" 
                        onerror="this.src='${placeholderImage}';" >
                </div>
                <div class="card-body">
                    <span class="badge bg-primary">${outage.category || 'General'}</span>
                    <h5 class="card-title pt-2 ">${trimmedTitle}</h5>
                    <p class="card-text text-muted flex-grow-1" style="max-height: 80px; overflow: hidden; text-overflow: ellipsis;">${trimmedContent}</p>
                    <small class="text-muted">Posted on <span class="fw-medium">${date}</span></small>
                </div>
            </a>
        </div>
    `;
    container.appendChild(card);
}


// -------------------------------------------------- Fetch News

async function loadNewsCards(categoryFilter = '', page = 1, searchTerm = '') {
    const newsContainer = document.getElementById("newsContainer");
    const emptyState = document.getElementById("emptyState");
    const newsCountElement = document.querySelector(".news-count");

    newsContainer.innerHTML = '';
    loadedNewsIds.clear();

    try {
        let q;
        if (categoryFilter) {
            q = query(
                collection(firestore, "news"),
                where("category", "==", categoryFilter),
                orderBy("timestamp", "desc") // Order by timestamp in descending order
            );
        } else {
            q = query(
                collection(firestore, "news"),
                orderBy("timestamp", "desc") // Order by timestamp in descending order
            );
        }

        const querySnapshot = await getDocs(q);
        const totalNews = querySnapshot.size;
        totalPages = Math.ceil(totalNews / newsPerPage);

        const startIndex = (page - 1) * newsPerPage;
        const endIndex = startIndex + newsPerPage;

        const newsArray = [];

        querySnapshot.forEach((docSnapshot) => {
            const newsData = { id: docSnapshot.id, ...docSnapshot.data() };
            if (!searchTerm || newsData.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                if (!loadedNewsIds.has(newsData.id)) {
                    newsArray.push(newsData);
                    loadedNewsIds.add(newsData.id); 
                }
            }
        });

        const paginatedNews = newsArray.slice(startIndex, endIndex);

        const displayStart = startIndex + 1;
        const displayEnd = Math.min(endIndex, newsArray.length);
        newsCountElement.textContent = `${displayStart}-${displayEnd} of ${newsArray.length}`;

        if (paginatedNews.length === 0) {
            document.getElementById('loadingSpinner').classList.add('d-none');
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            paginatedNews.forEach((news) => {
                renderNewsCard(news, newsContainer);
            });
        }

        updatePaginationControls(newsArray.length, page);

    } catch (error) {
        console.error("Error fetching news: ", error);
        Swal.fire('Error!', 'There was an error fetching the news.', 'error');
    }
}

function renderNewsCard(news, container) {
    const docId = news.id;
    const date = formatDate(news.timestamp);
    const trimmedContent = news.content.length > 150 ? news.content.substring(0, 150) + '...' : news.content;

    const newsCard = document.createElement("div");
    newsCard.classList.add("news-card", "border-bottom", "mb-1", "p-2");
    newsCard.style.cursor = "pointer"; 

    newsCard.innerHTML = `
        <div class="card-body position-relative">
            <a href="view-news.html?id=${docId}" class="text-decoration-none text-dark d-block">
                <span class="badge bg-primary position-absolute top-0 start-0 m-3">${news.category}</span>
                <h5 class="card-title mt-4 pt-2">${news.title}</h5>
                <p class="card-text">${trimmedContent}</p>
            </a>
        </div>
        <div class="card-footer bg-transparent border-0 text-end">
            <small class="text-muted">Posted on <span class="fw-medium">${date}</span></small>
        </div>
    `;

    // Add click event listener to the card, but exclude the dropdown from triggering the navigation
    newsCard.addEventListener("click", function (event) {
        const target = event.target;
        // Check if the clicked element is inside the dropdown
        if (!target.closest('.dropdown')) {
            window.location.href = `view-news.html?id=${docId}`;
        }
    });

    container.appendChild(newsCard);

    document.getElementById('loadingSpinner').classList.add('d-none');
}

// -------------------------------------------------- Pagination Controls

function setupPaginationControls() {
    const prevPage = document.getElementById("prevPage");
    const nextPage = document.getElementById("nextPage");

    prevPage.addEventListener("click", (event) => {
        event.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            const selectedCategory = document.querySelector("#newsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadNewsCards(selectedCategory, currentPage, searchTerm);
        }
    });

    nextPage.addEventListener("click", (event) => {
        event.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            const selectedCategory = document.querySelector("#newsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadNewsCards(selectedCategory, currentPage, searchTerm);
        }
    });
}

function updatePaginationControls(totalNews, page) {
    totalPages = Math.ceil(totalNews / newsPerPage); // Ensure totalPages is updated

    const paginationControls = document.getElementById("paginationControls");
    const currentPageElement = document.getElementById("currentPage");

    // Update current page number display
    currentPageElement.textContent = page;

    // Clear existing pagination buttons
    paginationControls.querySelectorAll('.page-number').forEach(item => item.remove());

    // Calculate start and end page numbers
    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, page + 1);

    // Adjust start and end page for edge cases
    if (page === 1) {
        endPage = Math.min(totalPages, page + 2);
    } else if (page === totalPages) {
        startPage = Math.max(1, page - 2);
    }

    // Create page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement("li");
        pageItem.classList.add("page-item");
        if (i === page) {
            pageItem.classList.add("active");
        }

        const pageLink = document.createElement("a");
        pageLink.classList.add("page-link", "page-number");
        pageLink.href = "#";
        pageLink.textContent = i;

        pageLink.addEventListener("click", (event) => {
            event.preventDefault();
            currentPage = i;
            const selectedCategory = document.querySelector("#newsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadNewsCards(selectedCategory, currentPage, searchTerm);
        });

        pageItem.appendChild(pageLink);
        paginationControls.insertBefore(pageItem, nextPage.parentNode);
    }

    // Enable or disable pagination buttons
    prevPage.classList.toggle("disabled", page <= 1);
    nextPage.classList.toggle("disabled", page >= totalPages);
}

// -------------------------------------------------- Setup Category Filters

function setupCategoryFilters() {
    const categoryLinks = document.querySelectorAll("#newsMenu .nav-link");
    
    categoryLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const selectedCategory = link.textContent.trim();
            
            // Reset to the first page when changing categories
            currentPage = 1;

            const searchTerm = document.getElementById("searchInput").value;
            loadNewsCards(selectedCategory, currentPage, searchTerm);
            categoryLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

// -------------------------------------------------- Setup Search Bar

function setupSearchBar() {
    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("input", () => {
        clearTimeout(searchInput.searchTimeout);
        searchInput.searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value;
            const selectedCategory = document.querySelector("#newsMenu .nav-link.active")?.textContent.trim() || '';
            loadNewsCards(selectedCategory, 1, searchTerm);
        }, 300);
    });
}

// -------------------------------------------------- Handle Header Update

document.addEventListener("DOMContentLoaded", () => {
    const categoryLinks = document.querySelectorAll("#newsMenu .nav-link");
    const newsHeader = document.getElementById('newsHeader');

    categoryLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const selectedCategory = link.textContent.trim();
            newsHeader.textContent = selectedCategory + " News";
        });
    });
});

function formatDate(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var formattedDate = month + ' ' + date + ', ' + year;
    return formattedDate;
}
