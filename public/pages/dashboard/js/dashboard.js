// -------------------------------------------------- Firebase Imports

import { firestore } from '../../../resources/js/config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatDate } from '../../../resources/js/main.js';

let map;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map(); // Change Set to Map to store location IDs and names

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

            // Append the news item to the container
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

    // Add mouseover event to show tooltip
    map.data.addListener('mouseover', (event) => {
        const featureName = event.feature.getProperty('NAME_3') || event.feature.getProperty('NAME_2');
        const tooltipContent = featureName || 'No name available';
        const tooltip = document.createElement('div');
        tooltip.className = 'map-tooltip';
        tooltip.innerText = tooltipContent;
        document.body.appendChild(tooltip);

        const position = event.latLng;
        tooltip.style.position = 'absolute';
        tooltip.style.left = `${position.lng()}px`;
        tooltip.style.top = `${position.lat()}px`;
    });

    // Add mouseout event to hide tooltip
    map.data.addListener('mouseout', () => {
        const tooltips = document.getElementsByClassName('map-tooltip');
        while (tooltips.length > 0) {
            tooltips[0].parentNode.removeChild(tooltips[0]);
        }
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
    
        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('mainContainer').classList.remove('d-none');

    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

initializeDashboard();
