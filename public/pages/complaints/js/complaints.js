// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate, formatTime } from '../../../resources/js/main.js'; 

let currentPage = 1;
let totalPages = 1;
const complaintsPerPage = 5;
const loadedComplaintIds = new Set(); // Track loaded complaint IDs to prevent duplicates

loadComplaintCards();
setupCategoryFilters();
setupPaginationControls();
setupSearchBar();

// -------------------------------------------------- Fetch Complaints

async function loadComplaintCards(categoryFilter = '', page = 1, searchTerm = '') {
    const complaintsContainer = document.getElementById("complaintsContainer");
    const emptyState = document.getElementById("emptyState");
    const complaintsCountElement = document.querySelector(".complaints-count");

    // Clear the complaints container and reset the Set of loaded IDs
    complaintsContainer.innerHTML = '';
    loadedComplaintIds.clear();

    try {
        let q;
        if (categoryFilter) {
            q = query(collection(firestore, "consumer_complaints"), where("category", "==", categoryFilter));
        } else {
            q = collection(firestore, "consumer_complaints");
        }

        const querySnapshot = await getDocs(q);
        const totalComplaints = querySnapshot.size;
        totalPages = Math.ceil(totalComplaints / complaintsPerPage); // Update totalPages

        const startIndex = (page - 1) * complaintsPerPage;
        const endIndex = startIndex + complaintsPerPage;

        const complaintsArray = [];

        querySnapshot.forEach((docSnapshot) => {
            const complaintData = { id: docSnapshot.id, ...docSnapshot.data() };
            if (!searchTerm || complaintData.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                // Only add if the complaint ID is not already processed
                if (!loadedComplaintIds.has(complaintData.id)) {
                    complaintsArray.push(complaintData);
                    loadedComplaintIds.add(complaintData.id); // Track the ID to prevent duplication
                }
            }
        });

        const paginatedComplaints = complaintsArray.slice(startIndex, endIndex);

        // Update the complaints count display
        const displayStart = startIndex + 1;
        const displayEnd = Math.min(endIndex, complaintsArray.length);
        complaintsCountElement.textContent = `${displayStart}-${displayEnd} of ${complaintsArray.length}`;

        if (paginatedComplaints.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            paginatedComplaints.forEach((complaint) => {
                renderComplaintCard(complaint, complaintsContainer);
            });
        }

        updatePaginationControls(complaintsArray.length, page);

    } catch (error) {
        console.error("Error fetching complaints: ", error);
        Swal.fire('Error!', 'There was an error fetching the complaints.', 'error');
    }
}

function renderComplaintCard(complaint, container) {
    const docId = complaint.id;
    const date = formatDate(complaint.timestamp);
    const trimmedContent = complaint.concernDescription.length > 150 ? complaint.concernDescription.substring(0, 150) + '...' : complaint.content;

    const complaintCard = document.createElement("div");
    complaintCard.classList.add("complaint-card", "border-bottom", "mb-1", "p-2");
    complaintCard.style.cursor = "pointer"; 

    complaintCard.innerHTML = `
        <div class="card-body position-relative">
            <a href="view-complaints.html?id=${docId}" class="text-decoration-none text-dark d-block">
                <span class="badge bg-primary position-absolute top-0 start-0 m-3">${complaint.concernDescription}</span>
                <h5 class="card-title mt-4 pt-2">${complaint.concern}</h5>
                <p class="card-text">${trimmedContent}</p>
            </a>
            <div class="dropdown position-absolute top-0 end-0 m-3">
                <button class="btn btn-link text-secondary p-2" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
                    <li><a class="dropdown-item delete-item" href="#">Delete</a></li>
                </ul>
            </div>
        </div>
        <div class="card-footer bg-transparent border-0 text-end">
            <small class="text-muted">Reported on <span class="fw-medium">${date}</span></small>
        </div>
    `;

    // Add click event listener to the card, but exclude the dropdown from triggering the navigation
    complaintCard.addEventListener("click", function (event) {
        const target = event.target;
        // Check if the clicked element is inside the dropdown
        if (!target.closest('.dropdown')) {
            window.location.href = `view-complaints.html?id=${docId}`;
        }
    });

    container.appendChild(complaintCard);
    deleteComplaint(complaintCard, docId);

    // Hide the loading spinner and show the complaints container
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
            const selectedCategory = document.querySelector("#complaintsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadComplaintCards(selectedCategory, currentPage, searchTerm);
        }
    });

    nextPage.addEventListener("click", (event) => {
        event.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            const selectedCategory = document.querySelector("#complaintsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadComplaintCards(selectedCategory, currentPage, searchTerm);
        }
    });
}

function updatePaginationControls(totalComplaints, page) {
    totalPages = Math.ceil(totalComplaints / complaintsPerPage); // Ensure totalPages is updated

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
            const selectedCategory = document.querySelector("#complaintsMenu .nav-link.active")?.textContent.trim() || '';
            const searchTerm = document.getElementById("searchInput").value;
            loadComplaintCards(selectedCategory, currentPage, searchTerm);
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
    const categoryLinks = document.querySelectorAll("#complaintsMenu .nav-link");
    
    categoryLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const selectedCategory = link.textContent.trim();
            
            // Reset to the first page when changing categories
            currentPage = 1;

            const searchTerm = document.getElementById("searchInput").value;
            loadComplaintCards(selectedCategory, currentPage, searchTerm);
            setActiveCategory(link);
        });
    });
}

function setActiveCategory(selectedLink) {
    const categoryLinks = document.querySelectorAll("#complaintsMenu .nav-link");
    categoryLinks.forEach(link => link.classList.remove("active"));
    selectedLink.classList.add("active");
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

// -------------------------------------------------- Delete Complaint

function deleteComplaint(cardElement, docId) {
    const deleteButton = cardElement.querySelector('.delete-item');
    
    deleteButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel!',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(firestore, "consumer_complaints", docId));
                cardElement.remove(); // Remove the card from the UI
                Swal.fire('Deleted!', 'The complaint has been deleted.', 'success');
            } catch (error) {
                console.error("Error deleting complaint: ", error);
                Swal.fire('Error!', 'There was an error deleting the complaint.', 'error');
            }
        }
    });
}
