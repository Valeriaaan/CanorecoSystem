// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate } from '../../../resources/js/main.js';

let map;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map(); // Change Set to Map to store location IDs and names

// Get the current date and time
const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes(); // Format: HHMM

// -------------------------------------------------- Fetch Complaints Count

async function fetchComplaintsCount() {
    try {
        const complaintsCollectionRef = collection(firestore, 'Reports');
        const complaintsSnapshot = await getDocs(complaintsCollectionRef);
        const complaintsCount = complaintsSnapshot.size; 

        document.getElementById('complaintsCount').innerText = complaintsCount;
    } catch (error) {
        console.error("Error fetching complaints count:", error);
    }
}

// -------------------------------------------------- Fetch Outage Count 

async function fetchOutageCount() {
    try {
        const outageCollectionRef = collection(firestore, 'outages');
        const outageQuery = query(outageCollectionRef, where("category", "==", "Patalastas ng Power Interruption"));
        const outageSnapshot = await getDocs(outageQuery);
        const outageCount = outageSnapshot.size;

        document.getElementById('outagesCount').innerText = outageCount;
    } catch (error) {
        console.error("Error fetching outage count:", error);
    }
}

// -------------------------------------------------- Fetch and Display News

async function fetchNews() {
    try {
        const newsCollectionRef = collection(firestore, 'news');
        const newsQuery = query(newsCollectionRef); // You can add orderBy or limit as needed
        const newsSnapshot = await getDocs(newsQuery);

        const newsContainer = document.getElementById('newsContainer');
        newsContainer.style.cursor = "pointer"; 
        newsContainer.innerHTML = '';

        let newsCount = 0;

        newsSnapshot.forEach((doc) => {
            if (newsCount >= 5) return; 

            const newsData = doc.data();
            const newsId = doc.id;
            const date = formatDate(newsData.timestamp);
            const trimmedTitle = newsData.title.length > 30 ? newsData.title.substring(0, 30) + '...' : newsData.title;

            const newsItem = `
                <div class="news-card rounded mb-2 p-3">
                    <a href="../news/view-news.html?id=${newsId}" class="text-decoration-none text-dark">
                        <div class="">
                            <h5 class="card-title">${trimmedTitle}</h5>
                            <span class="far fa-calendar text-muted mx-1"></span><small class="text-muted">${date}</small>
                        </div>
                    </a>
                </div>
            `;

            newsContainer.innerHTML += newsItem;
            newsCount++;
        });

        if (newsCount === 0) {
            newsContainer.innerHTML = '<p>No news available at the moment.</p>';
        }

    } catch (error) {
        console.error("Error fetching news:", error);
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
        fullName: `${feature.properties.NAME_3}`, // Full name for display
        coordinates: feature.geometry.coordinates // Save coordinates for highlighting
    }));
}

// -------------------------------------------------- Initialize Map

async function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 14.222795, lng: 122.689153 },
        zoom: 10,
        mapId: "976f61fbc51048c2",
    });

    // Load the GeoJSON data for the barangays
    map.data.loadGeoJson('../../../resources/json/filtered_Barangays.json', null, (features) => {
        if (features.length === 0) {
            console.error("No features were loaded. Please check the GeoJSON file and its path.");
        }
    });

    // Style the polygons on the map
    map.data.setStyle((feature) => {
        let color = '#810FCB';

        const featureId = `${feature.getProperty('ID_3')}`;
        if (selectedLocations.has(featureId)) {
            color = '#FF0000';
            fillOpacity = 0.5;
        }

        return {
            fillColor: color,
            strokeColor: color,
            strokeWeight: 0,
            fillOpacity: 0
        };
    });

    // Initial highlight of selected locations
    highlightSelectedLocations();
}

function highlightSelectedLocations() {
    map.data.setStyle((feature) => {
        const featureId = `${feature.getProperty('ID_3')}`;

        if (selectedLocations.has(featureId)) {
            return {
                fillColor: '#ff7b07',
                strokeColor: '#ff7b07',
                strokeWeight: 1.5,
                fillOpacity: 0.7
            };
        } else {
            return {
                fillColor: '#810FCB',
                strokeColor: '#FFFFFF',
                strokeWeight: 0,
                fillOpacity: 0
            };
        }
    });
}

function getLocationName(locationId, barangaysData) {
    const location = barangaysData.find(loc => `${loc.barangayId}` === locationId);
    return location ? location.fullName : null;
}

// -------------------------------------------------- Filter Outages by Date and Time

async function fetchFilteredOutages(isCurrentOutages) {
    console.log(`Fetching ${isCurrentOutages ? 'current' : 'future'} outages...`);
    const outagesSnapshot = await getDocs(outagesCollection);
    const barangaysData = await fetchBarangaysData();

    selectedLocations.clear();

    outagesSnapshot.forEach((doc) => {
        const outage = doc.data();
        const outageDate = outage.date; // Outage date in YYYY-MM-DD
        const outageStartTime = parseInt(outage.startTime.replace(':', '')); // Convert HH:MM to HHMM
        const outageEndTime = parseInt(outage.endTime.replace(':', '')); // Convert HH:MM to HHMM

        console.log(`Processing outage on ${outageDate} from ${outageStartTime} to ${outageEndTime}`);
        console.log(`Current Date: ${formattedDate}`);
        console.log(`Current Time: ${currentTime}`);
        

        if (isCurrentOutages) {
            // Check if outage is today and within the current time range
            if (outageDate === formattedDate && currentTime >= outageStartTime && currentTime <= outageEndTime) {
                console.log(`Current outage detected: ${outageDate}`);
                outage.selectedLocations.forEach(location => {
                    const locationName = getLocationName(location, barangaysData);
                    if (locationName) {
                        selectedLocations.set(location, locationName);
                        console.log(`Adding location ID: ${location} (${locationName})`);
                    }
                });
            }
        } else {
            // Check if outage is in the future
            if (outageDate > formattedDate) {
                console.log(`Future outage detected: ${outageDate}`);
                outage.selectedLocations.forEach(location => {
                    const locationName = getLocationName(location, barangaysData);
                    if (locationName) {
                        selectedLocations.set(location, locationName);
                        console.log(`Adding location ID: ${location} (${locationName})`);
                    }
                });
            }
        }
    });

    highlightSelectedLocations();
}

// -------------------------------------------------- Tab Click Event Handlers

document.querySelector('.nav-link[href="#currentOutages"]').addEventListener('click', async () => {
    await fetchFilteredOutages(true); // Show current outages
});

document.querySelector('.nav-link[href="#futureOutages"]').addEventListener('click', async () => {
    await fetchFilteredOutages(false); // Show future outages
});

// -------------------------------------------------- Initialize and Fetch Data


async function initializeDashboard() {
    try {
        const outagesSnapshot = await getDocs(outagesCollection);
        const outages = outagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const barangaysData = await fetchBarangaysData();

        outages.forEach(outage => {
            outage.selectedLocations.forEach(location => {
                const locationName = getLocationName(location, barangaysData);
                if (locationName) {
                    selectedLocations.set(location, locationName);
                }
            });
        });

        await initMap();
        await fetchComplaintsCount();
        await fetchOutageCount();
        await fetchNews();  
        await fetchFilteredOutages(true); // Load current outages by default
    
        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('mainContainer').classList.remove('d-none');

    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

initializeDashboard();
