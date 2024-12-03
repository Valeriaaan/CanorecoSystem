// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate, calculateDuration } from '../../../resources/js/main.js';


const selectedLocations = new Map();

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

// -------------------------------------------------- Fetch News

async function fetchNewsData(id) {
    try {
        const newsRef = doc(firestore, 'news', id);
        const docSnap = await getDoc(newsRef);
        
        const barangaysData = await fetchBarangaysData();

        if (docSnap.exists()) {
            // Extract data from the document
            const newsData = docSnap.data();

            // Check if selectedLocations exists and is an array
            if (Array.isArray(newsData.selectedLocations) && newsData.selectedLocations.length > 0) {
                newsData.selectedLocations.forEach(location => {
                    const locationName = getLocationName(location, barangaysData);
                    if (locationName) {
                        selectedLocations.set(location, locationName);
                    }
                });
            }

            const affectedLocations = newsData.selectedLocations && newsData.selectedLocations.length > 0
                ? selectedLocations
                : new Map();

            const { title, content, timestamp, category, image, date, startTime, endTime, gawain } = newsData;

            // Populate the newsContainer with news data
            populateNewsContent(title, content, timestamp, category, image, date, startTime, endTime, gawain, affectedLocations);
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


// -------------------------------------------------- Fetch Barangays JSON data

async function fetchBarangaysData() {
    const response = await fetch('../../../resources/json/filtered_Barangays.json');
    const data = await response.json();
    return data.features.map(feature => ({
        municipalityId: feature.properties.ID_2,
        municipalityName: feature.properties.NAME_2,
        barangayId: feature.properties.ID_3,
        barangayName: feature.properties.NAME_3,
        fullName: `${feature.properties.NAME_3}`, 
        coordinates: feature.geometry.coordinates 
    }));
}

// -------------------------------------------------- Get Location Name

function getLocationName(locationId, barangaysData) {
    const location = barangaysData.find(loc => `${loc.barangayId}` === locationId);
    return location ? location.fullName : null;
}

// -------------------------------------------------- Populate Content & handle Delete and Edit functions

function populateNewsContent(title, content, timestamp, category, image, date, startTime, endTime, gawain, selectedLocationsMap) {
    const newsContainer = document.getElementById('newsContainer');

    // Extract values from the Map to an array
    const selectedLocationsArray = Array.from(selectedLocationsMap.values());

    // Function to format time to AM/PM
    function formatTime(time) {
        const [hour, minute] = time.split(':');
        let period = 'AM';
        let formattedHour = parseInt(hour);

        if (formattedHour >= 12) {
            period = 'PM';
            if (formattedHour > 12) formattedHour -= 12;
        }
        if (formattedHour === 0) formattedHour = 12;

        return `${formattedHour}:${minute} ${period}`;
    }

    // Format startTime and endTime with AM/PM
    const formattedStartTime = startTime ? formatTime(startTime) : '';
    const formattedEndTime = endTime ? formatTime(endTime) : '';
    const duration = startTime && endTime ? calculateDuration(startTime, endTime) : '';

    // Generate image HTML if imageUrls exist
    let imagesHTML = '';
    if (image.length > 0) {
        imagesHTML = image.map(url => `
            <div class="col-12">
                <img src="${url}" class="img-fluid rounded mb-3" alt="News Image" style="width: 100%;">
            </div>
        `).join('');
    }

    // Generate dynamic HTML for optional fields (gawain, date, time, selected locations)
    let optionalFieldsHTML = '';

    if (gawain) {
        optionalFieldsHTML += `<p class="card-text"> Magkakaroon ng power service interruption:</p>`;

        optionalFieldsHTML += `<p class=""><span class="fw-bold">GAWAIN :</span> ${gawain}</p>`;
    }

    if (date) {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        optionalFieldsHTML += `<p class=""><span class="fw-bold">PETSA :</span> ${formattedDate}</p>`;
    }

    if (formattedStartTime && formattedEndTime) {
        optionalFieldsHTML += `<p class=""><span class="fw-bold">ORAS :</span> ${formattedStartTime} - ${formattedEndTime} (${duration})</p>`;
    }

    if (selectedLocationsArray.length > 0) {
        optionalFieldsHTML += `<p class=""><span class="fw-bold">APEKTADONG LUGAR :</span> ${selectedLocationsArray.join(', ')}</p>`;
    }

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

        <span class="far fa-calendar text-muted mb-3"></span><small id="news-date" class="text-muted ms-2 mb-3">${formatDate(timestamp)}</small>

        ${optionalFieldsHTML}

        <p id="news-content" class="card-text">${content}</p>

        ${imagesHTML}
    `;

    newsContainer.innerHTML = newsHTML;

    // Add event listeners for the edit and delete buttons
    document.querySelector('.edit-item').addEventListener('click', () => {
        if (category === "Patalastas ng Power Interruption") {
            // Redirect to edit-outage.html if the category is for power interruption
            window.location.href = `../outage/edit-outage.html?id=${newsId}`;
        } else {
            // Otherwise, redirect to edit-news.html
            window.location.href = `edit-news.html?id=${newsId}`;
        }
    });

    document.querySelector('.delete-item').addEventListener('click', async () => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Delete',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            
            Swal.fire({
                title: 'Deleting...',
                text: 'Please wait while the news is being deleted.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await deleteDoc(doc(firestore, 'news', newsId));

                Swal.fire({
                    title: 'Deleted!',
                    text: 'The news item has been deleted.',
                    icon: 'success',
                    confirmButtonText: 'Done',
                    confirmButtonColor: '#4e73df',
                }).then(() => {
                    window.location.href = 'news.html';
                });

            } catch (error) {
                console.error("Error deleting news:", error);
                Swal.fire('Error!', 'There was an error deleting the news item.', 'error');
            }
        }
    });
}


