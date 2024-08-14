// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

loadNewsCards();
setupCategoryFilters();

// -------------------------------------------------- Fetch News

async function loadNewsCards(categoryFilter = '') {
    const newsContainer = document.getElementById("newsContainer");
    const emptyState = document.getElementById("emptyState");

    // Clear existing news cards
    newsContainer.innerHTML = '';

    try {
        let q;
        if (categoryFilter) {
            q = query(collection(firestore, "news"), where("category", "==", categoryFilter));
        } else {
            q = collection(firestore, "news");
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';

            querySnapshot.forEach((docSnapshot) => {
                const news = docSnapshot.data();
                const docId = docSnapshot.id;

                const newsCard = document.createElement("div");
                newsCard.classList.add("news-card", "border-bottom", "mb-1", "p-2");

                newsCard.innerHTML = `
                    <div class="card-body position-relative">
                        <!-- Category Chip -->
                        <span class="badge bg-primary position-absolute top-0 start-0 m-3" id="newsCategory">${news.category}</span>
                        
                        <!-- Meatball Menu -->
                        <div class="dropdown position-absolute top-0 end-0 m-3">
                            <button class="btn btn-link text-secondary p-0" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
                                <li><a class="dropdown-item edit-item" href="#">Edit</a></li>
                                <li><a class="dropdown-item delete-item" href="#">Delete</a></li>
                            </ul>
                        </div>
                    
                        <!-- Card Title -->
                        <h5 class="card-title mt-4 pt-2" id="newsTitle">${news.title}</h5>
                        
                        <!-- Card Description -->
                        <p class="card-text" id="newsDescription">${news.description}</p>
                    </div>
                    
                    <!-- Card Footer with Date -->
                    <div class="card-footer bg-transparent border-0 text-end">
                        <small class="text-muted" id="newsDate">${news.date}</small>
                    </div>
                `;

                newsContainer.appendChild(newsCard);
                deleteNews(newsCard, docId);
            });
        }

    } catch (error) {
        console.error("Error fetching news: ", error);
        Swal.fire('Error!', 'There was an error fetching the news.', 'error');
    }
}

// -------------------------------------------------- Delete News

function deleteNews(newsCard, docId) {
    const deleteButton = newsCard.querySelector(".delete-item");
    const newsContainer = document.getElementById("newsContainer");
    const emptyState = document.getElementById("emptyState");

    deleteButton.addEventListener("click", async () => {
        const { isConfirmed } = await Swal.fire({
            title: 'Are you sure?',
            text: 'You won\'t be able to revert this!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',  
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            reverseButtons: true
        });

        if (isConfirmed) {
            try {
                await deleteDoc(doc(firestore, "news", docId));
                newsCard.remove();

                if (newsContainer.children.length === 0) {
                    emptyState.style.display = 'block';
                }

                Swal.fire('Deleted!', 'The news has been deleted.', 'success');
                
            } catch (error) {
                console.error("Error deleting document: ", error);
                Swal.fire('Error!', 'There was an error deleting the news.', 'error');
            }
        }
    });
}

// -------------------------------------------------- Setup Category Filters

function setupCategoryFilters() {
    const categoryLinks = document.querySelectorAll("#newsMenu .nav-link");
    
    categoryLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const selectedCategory = link.textContent.trim();
            loadNewsCards(selectedCategory);
            categoryLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Select all category links
    const categoryLinks = document.querySelectorAll('#newsMenu a');

    // Get the header element
    const newsHeader = document.getElementById('newsHeader');

    // Add click event listeners to each link
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior

            // Get the category from the data attribute
            const category = this.getAttribute('data-category');

            // Update the header text based on the selected category
            if (category) {
                newsHeader.textContent = category;
            }
        });
    });
});
