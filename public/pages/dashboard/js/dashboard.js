// -------------------------------------------------- Firebase Imports

import { firestore, database } from '../../../resources/js/config.js';
import { collection, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, get, child, onValue,  } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js"; 
import { formatDate } from '../../../resources/js/main.js';

let map;
let tooltip;
const outagesCollection = collection(firestore, 'outages');
const selectedLocations = new Map(); 

// Get the current date and time
const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes(); // Format: HHMM

// -------------------------------------------------- Fetch Complaints Count

function listenToComplaintsCount() {
    const complaintsCollectionRef = collection(firestore, 'consumer_complaints');
    
    onSnapshot(complaintsCollectionRef, (snapshot) => {
        const complaintsCount = snapshot.size;
        console.log("Complaints count: ", complaintsCount);
        document.getElementById('complaintsCount').innerText = complaintsCount;
    }, (error) => {
        console.error("Error listening to complaints count:", error);
    });
    
}

// -------------------------------------------------- Fetch Outage Count 

function listenToOutages() {
    const outageCollectionRef = collection(firestore, 'outages');
    const outageQuery = query(outageCollectionRef, where("category", "==", "Patalastas ng Power Interruption"));

    onSnapshot(outageQuery, (snapshot) => {
        let outageCount = 0;

        snapshot.forEach((doc) => {
            const outage = doc.data();
            const outageDate = outage.date;
            const outageEndTime = parseInt(outage.endTime.replace(':', ''));
            
            if (outageDate > formattedDate || (outageDate === formattedDate && currentTime <= outageEndTime)) {
                outageCount++;
            }
        });

        document.getElementById('outagesCount').innerText = outageCount;
    }, (error) => {
        console.error("Error listening to outages:", error);
    });
}

// -------------------------------------------------- Fetch Interruption Count 

// Real-time listener for damaged devices in Realtime Database
function listenToDamagedDevices() {
    const devicesRef = ref(database, 'devices');
    
    onValue(devicesRef, (snapshot) => {
        let damagedCount = 0;
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const deviceData = childSnapshot.val();
                
                if (deviceData.status === "damaged") {
                    damagedCount++;
                }
            });
        }
        
        document.getElementById('interruptionsCount').innerText = damagedCount;
    }, (error) => {
        console.error("Error listening to damaged devices:", error);
    });
}

// -------------------------------------------------- Fetch and Display News

function listenToNews() {
    const newsCollectionRef = collection(firestore, 'news');
    // Add ordering by 'timestamp' in descending order
    const newsQuery = query(newsCollectionRef, orderBy('timestamp', 'desc')); 
    
    onSnapshot(newsQuery, (snapshot) => {
        const newsContainer = document.getElementById('newsContainer');
        newsContainer.style.cursor = "pointer"; 
        newsContainer.innerHTML = '';

        let newsCount = 0;

        snapshot.forEach((doc) => {
            if (newsCount >= 5) return; 

            const newsData = doc.data();
            const newsId = doc.id;
            const date = formatDate(newsData.timestamp);
            const trimmedTitle = newsData.title.length > 40 ? newsData.title.substring(0, 40) + '...' : newsData.title;

            const newsItem = `
                <div class="news-card rounded mb-2 p-3">
                    <a href="../news/view-news.html?id=${newsId}" class="text-decoration-none text-dark">
                        <div class="">
                            <h6 class="card-title">${trimmedTitle}</h6>
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

    }, (error) => {
        console.error("Error listening to news:", error);
    });
}

// --------------------------------------------------  Function to fetch all devices from the real-time database

async function fetchDevicesFromRTDB() {
    const devicesRef = ref(database, 'devices'); 

    try {
        const snapshot = await get(devicesRef); // Fetch all devices at once
        if (snapshot.exists()) {
            const devicesData = snapshot.val();
            console.log("Fetched devices data:", devicesData);
            return devicesData; // Return all device data
        } else {
            console.log("No devices found.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching devices from the database:", error);
        return null;
    }
}

// Function to place markers on the map for each device
async function markDevicesOnMap() {
    const devicesData = await fetchDevicesFromRTDB();
    if (!devicesData) return;

    const barangaysData = await fetchBarangaysData(); // Fetch barangay data if needed

    // Iterate over each device and place a marker on the map
    Object.keys(devicesData).forEach(deviceId => {
        const device = devicesData[deviceId];
        const barangayId = device.id; // Assuming id represents barangayId
        const locationData = barangaysData.find(item => String(item.barangayId) === String(barangayId));

        if (locationData && device.latitude && device.longitude) {

            let iconUrl = '';
            if (device.status === 'damaged') {
                iconUrl = '../../resources/images/img_device_red.png'; 
            } else if (device.status === 'under repair') {
                iconUrl = '../../resources/images/img_device_blue.png'; 
            } else {
                iconUrl = '../../resources/images/img_device_green.png'; 
            }

            const marker = new google.maps.Marker({
                position: { lat: parseFloat(device.latitude), lng: parseFloat(device.longitude) },
                map: map, 
                title: locationData.barangayName || "Unknown Location",

                icon: {
                    url: iconUrl,
                    scaledSize: new google.maps.Size(48, 48) 
                }
            });

            // Add a click event listener to zoom to the location when the marker is clicked
            marker.addListener('click', () => {
                zoomToLocation(parseFloat(device.latitude), parseFloat(device.longitude));
            });

            console.log(`Marker added for device ID: ${deviceId} (${locationData.barangayName || "Unknown Location"})`);
        } else {
            console.log('No matching barangay found or missing coordinates for device ID:', deviceId);
        }
    });
}

// -------------------------------------------------- Fetch and Process Damaged Devices from RTDB

function fetchDamagedDevicesFromRTDB() {
    const damagedDevicesRef = ref(database, 'devices'); 

    onValue(damagedDevicesRef, async (snapshot) => {
        selectedLocations.clear(); // Clear the map to avoid duplicate entries
        await fetchFilteredOutages(true); 

        if (snapshot.exists()) {
            const barangaysData = await fetchBarangaysData(); // Fetch barangay data
            const devicesData = snapshot.val();

            // Iterate over devices to find damaged ones and add them to selectedLocations
            Object.keys(devicesData).forEach(deviceId => {
                const device = devicesData[deviceId];
                if (device.status === 'damaged') {
                    const barangayId = device.id; // Use idName as the barangay ID
                    const locationData = barangaysData.find(item => String(item.barangayId) === String(barangayId));

                    if (locationData) {
                        const combinedId = String(barangayId);
                        const timestamp = new Date().getTime(); 

                        selectedLocations.set(combinedId, {
                            name: locationData.barangayName,
                            type: 'current',
                            outageId: String(timestamp),
                            outageGawain: 'nulled'
                        });

                        console.log(`Added damaged device location ID: ${combinedId} (${locationData.barangayName}) with outageId: ${timestamp}`);
                    } else {
                        console.log('No matching barangay found for ID:', barangayId);
                    }
                }
            });

            console.log('Selected Locations with Damaged Devices:', Array.from(selectedLocations.entries()));
            highlightSelectedLocations(); 
        } else {
            console.log("No damaged devices found.");
        }
    }, (error) => {
        console.error("Error fetching damaged devices in real-time:", error);
    });
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

    // Create a tooltip div for showing the location name
    tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '5px';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.border = '1px solid #ccc';
    tooltip.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
    tooltip.style.fontSize = '12px';
    tooltip.style.display = 'none'; // Hidden by default
    document.body.appendChild(tooltip);

    // Add mouseover event for tooltips only for selected (highlighted) locations
    map.data.addListener('mouseover', (event) => {
        const featureId = `${event.feature.getProperty('ID_3')}`;
    
        // Show tooltip only for highlighted locations
        if (selectedLocations.has(featureId)) {
            const locationDetails = selectedLocations.get(featureId);
            const locationName = locationDetails.name;
            const outageId = locationDetails.outageId; 
            const outageGawain= locationDetails.outageGawain; 
    
            tooltip.innerText = `${locationName}(Outage Gawain: ${outageGawain})`;
            tooltip.style.left = event.domEvent.pageX + 'px';
            tooltip.style.top = event.domEvent.pageY + 'px';
            tooltip.style.display = 'block'; 
        }
    });

    // Add mouseout event to hide the tooltip
    map.data.addListener('mouseout', (event) => {
        const featureId = `${event.feature.getProperty('ID_3')}`;

        // Hide tooltip only if it was for a highlighted location
        if (selectedLocations.has(featureId)) {
            tooltip.style.display = 'none'; 
        }
    });

    highlightSelectedLocations();
}

function highlightSelectedLocations() {
    map.data.setStyle((feature) => {
        const featureId = `${feature.getProperty('ID_3')}`;

        if (selectedLocations.has(featureId)) {
            const outageType = selectedLocations.get(featureId).type; 
            const outageGawain = selectedLocations.get(featureId).outageGawain; 
            let fillColor = '#ff7b07'; 
            
            if (outageType === 'future') {
                fillColor = '#ff7b07';
            }
            if (outageGawain === 'nulled') {
                fillColor = '#dc3545';
            }

            return {
                fillColor: fillColor,
                strokeColor: fillColor,
                strokeWeight: 1.5,
                fillOpacity: 0.7
            };
            
        } else {
            return {
                fillColor: '#dc3545',
                strokeColor: '#FFFFFF',
                strokeWeight: 0,
                fillOpacity: 0
            };
        }
    });
}

function zoomToLocation(lat, lng) {
    if (map) {
        map.setCenter({ lat: lat, lng: lng });
        map.setZoom(18); 
    } else {
        console.error('Map is not initialized');
    }
}

function getLocationName(locationId, barangaysData) {
    const location = barangaysData.find(loc => `${loc.barangayId}` === locationId);
    return location ? location.fullName : null;
}

// -------------------------------------------------- Filter Outages by Date and Time

async function fetchFilteredOutages(isCurrentOutages) {
    console.log(`Fetching ${isCurrentOutages ? 'current' : 'future'} outages...`);
    const barangaysData = await fetchBarangaysData();

    // Listen for real-time updates to the outages collection
    onSnapshot(outagesCollection, (outagesSnapshot) => {
        selectedLocations.clear();

        outagesSnapshot.forEach((doc) => {
            const outageId = doc.id;
            const outage = doc.data();
            const outageDate = outage.date;
            const outageGawain = outage.gawain;
            const outageStartTime = parseInt(outage.startTime.replace(':', '')); // Convert HH:MM to HHMM
            const outageEndTime = parseInt(outage.endTime.replace(':', '')); // Convert HH:MM to HHMM

            // console.log(`Processing outage on ${outage.title} ${outageDate} from ${outageStartTime} to ${outageEndTime}`);
            // console.log(`Current Date: ${formattedDate}`);
            // console.log(`Current Time: ${currentTime}`);

            if (isCurrentOutages) {
                // Check if outage is today and within the current time range
                if (outageDate === formattedDate && currentTime >= outageStartTime && currentTime <= outageEndTime) {
                    console.log(`Current outage detected: ${outageDate}`);
                    outage.selectedLocations.forEach(location => {
                        const locationName = getLocationName(location, barangaysData);
                        if (locationName) {
                            selectedLocations.set(location, { name: locationName, type: 'current', outageId, outageGawain });
                            // console.log(`Adding location ID: ${location} (${locationName}) for outage ${outageId}`);
                        }
                    });
                }
            } else {
                // Check if the outage is in the future or later today
                if (outageDate > formattedDate || (outageDate === formattedDate && currentTime < outageStartTime)) {
                    console.log(`Future outage detected: ${outageDate}`);
                    outage.selectedLocations.forEach(location => {
                        const locationName = getLocationName(location, barangaysData);
                        if (locationName) {
                            selectedLocations.set(location, { name: locationName, type: 'future', outageId, outageGawain });
                            // console.log(`Adding location ID: ${location} (${locationName}) for future outage ${outageId}`);
                        }
                    });
                }
            }
        });

        
        // Update the map with the highlighted selected locations
        highlightSelectedLocations();
    });
}


// -------------------------------------------------- Tab Click Event Handlers

// Example of showing the spinner during data fetching
document.querySelector('.nav-link[href="#currentOutages"]').addEventListener('click', async () => {
    document.getElementById('mapLoadingOverlay').classList.remove('d-none');
    await fetchFilteredOutages(true); // Fetch current outages
    document.getElementById('mapLoadingOverlay').classList.add('d-none');
});

document.querySelector('.nav-link[href="#futureOutages"]').addEventListener('click', async () => {
    document.getElementById('mapLoadingOverlay').classList.remove('d-none');
    await fetchFilteredOutages(false); // Fetch future outages
    document.getElementById('mapLoadingOverlay').classList.add('d-none');
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

        listenToComplaintsCount();
        listenToDamagedDevices();
        listenToOutages();
        listenToNews();
        
        await initMap();
        await fetchFilteredOutages(true); 
        
        fetchDamagedDevicesFromRTDB();

        markDevicesOnMap();

        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('mainContainer').classList.remove('d-none');

    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

initializeDashboard();
