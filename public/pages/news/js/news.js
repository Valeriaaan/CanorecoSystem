// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate, formatTime } from '../../../resources/js/main.js'; 

let currentPage = 1;
let totalPages = 1;
const newsPerPage = 5;
const loadedNewsIds = new Set(); // Track loaded news IDs to prevent duplicates

loadNewsCards();
setupCategoryFilters();
setupPaginationControls();
setupSearchBar();

// -------------------------------------------------- Fetch News

async function loadNewsCards(categoryFilter = '', page = 1, searchTerm = '') {
    const newsContainer = document.getElementById("newsContainer");
    const emptyState = document.getElementById("emptyState");
    const newsCountElement = document.querySelector(".news-count");

    // Clear the news container and reset the Set of loaded IDs
    newsContainer.innerHTML = '';
    loadedNewsIds.clear();

    try {
        let q;
        if (categoryFilter) {
            q = query(collection(firestore, "news"), where("category", "==", categoryFilter));
        } else {
            q = collection(firestore, "news");
        }

        const querySnapshot = await getDocs(q);
        const totalNews = querySnapshot.size;
        totalPages = Math.ceil(totalNews / newsPerPage); // Update totalPages

        const startIndex = (page - 1) * newsPerPage;
        const endIndex = startIndex + newsPerPage;

        const newsArray = [];

        querySnapshot.forEach((docSnapshot) => {
            const newsData = { id: docSnapshot.id, ...docSnapshot.data() };
            if (!searchTerm || newsData.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                // Only add if the news ID is not already processed
                if (!loadedNewsIds.has(newsData.id)) {
                    newsArray.push(newsData);
                    loadedNewsIds.add(newsData.id); // Track the ID to prevent duplication
                }
            }
        });

        const paginatedNews = newsArray.slice(startIndex, endIndex);

        // Update the news count display
        const displayStart = startIndex + 1;
        const displayEnd = Math.min(endIndex, newsArray.length);
        newsCountElement.textContent = `${displayStart}-${displayEnd} of ${newsArray.length}`;

        if (paginatedNews.length === 0) {
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
            <div class="dropdown position-absolute top-0 end-0 m-3">
                <button class="btn btn-link text-secondary p-2" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
                    <li><a class="dropdown-item edit-item" href="#">Edit</a></li>
                    <li><a class="dropdown-item delete-item" href="#">Delete</a></li>
                </ul>
            </div>
        </div>
        <div class="card-footer bg-transparent border-0 text-end">
            <small class="text-muted">Posted on <span class="fw-medium">${date}</span></small>
        </div>
    `;

    newsCard.querySelector('.edit-item').addEventListener('click', function (event) {
        event.preventDefault();
        if (news.category === "Patalastas ng Power Interruption") {
            // Redirect to edit-outage.html if the category is for power interruption
            window.location.href = `edit-outage.html?id=${docId}`;
        } else {
            // Otherwise, redirect to edit-news.html
            window.location.href = `edit-news.html?id=${docId}`;
        }
    });
    

    // Add click event listener to the card, but exclude the dropdown from triggering the navigation
    newsCard.addEventListener("click", function (event) {
        const target = event.target;
        // Check if the clicked element is inside the dropdown
        if (!target.closest('.dropdown')) {
            window.location.href = `view-news.html?id=${docId}`;
        }
    });

    container.appendChild(newsCard);
    deleteNews(newsCard, docId);

    // Hide the loading spinner and show the news container
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

// -------------------------------------------------- Delete News

function deleteNews(newsCard, docId) {
    const deleteButton = newsCard.querySelector('.delete-item');
    deleteButton.addEventListener('click', async () => {
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
                await deleteDoc(doc(firestore, "news", docId));
                newsCard.remove();
                Swal.fire('Deleted!', 'The news item has been deleted.', 'success');

                // Check if the newsContainer is empty
                const newsContainer = document.getElementById("newsContainer");
                const emptyState = document.getElementById("emptyState");

                if (newsContainer.children.length === 0) {
                    emptyState.style.display = 'block';
                }
            } catch (error) {
                console.error("Error deleting document: ", error);
                Swal.fire('Error!', 'There was an error deleting the news item.', 'error');
            }
        }
    });
}
