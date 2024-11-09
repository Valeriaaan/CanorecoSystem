// -------------------------------------------------- Firebase Imports

import { firestore, storage } from '../../../resources/js/config.js';  
import { collection, doc, getDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let map;
let selectedLocations = new Set(); 
let outageId; // Store the ID of the outage being edited

// -------------------------------------------------- Main function to initialize 

async function init() {
    try {
        // Get the outageId from the query parameter or another source
        const params = new URLSearchParams(window.location.search);
        outageId = params.get('id');

        if (!outageId) {
            throw new Error('No outage ID provided.');
        }

        // Fetch and process the barangays data
        const barangaysData = await fetchBarangaysData();
        // Initialize checkboxes feature
        generateLocationCheckboxes(barangaysData);
        
        // Fetch the existing outage data and populate the form
        await populateOutageData(outageId);
        
        await initMap();        

        console.log("selectedlocations:",selectedLocations);

        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('map').classList.remove('d-none');
        document.getElementById('editOutageForm').classList.remove('d-none');
    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

// -------------------------------------------------- Populate Outage Data

async function populateOutageData(outageId) {
    try {
        const outageDocRef = doc(firestore, 'outages', outageId);
        const outageDoc = await getDoc(outageDocRef);

        if (!outageDoc.exists()) {
            throw new Error('Outage not found.');
        }

        const outageData = outageDoc.data();
        document.getElementById('title').value = outageData.title;
        document.getElementById('date').value = outageData.date;
        document.getElementById('start-time').value = outageData.startTime;
        document.getElementById('end-time').value = outageData.endTime;
        document.getElementById('gawain').value = outageData.gawain;
        document.getElementById('description').value = outageData.content;

        const barangaysData = await fetchBarangaysData();

        // Loop over selectedLocations and set corresponding checkboxes to checked
        outageData.selectedLocations.forEach(barangayId => {
            // Ensure barangayId is a string (or number as needed)
            barangayId = String(barangayId); // Convert to string if necessary
            console.log('Checking for Barangay ID:', barangayId);  // Log barangayId for debugging

            // Find the corresponding barangay data based on barangayId
            const locationData = barangaysData.find(item => String(item.barangayId) === barangayId);
            console.log('Found Location Data:', locationData); // Log locationData for debugging

            if (locationData) {
                // Create the checkbox ID by combining municipalityId and barangayId
                const checkboxId = `${locationData.municipalityId}-${locationData.barangayId}`;
                console.log('Generated Checkbox ID:', checkboxId);  // Log generated checkbox ID

                // Find the checkbox element by the generated ID
                const checkbox = document.getElementById(checkboxId);
                console.log('Found Checkbox:', checkbox);  // Log checkbox for debugging

                if (checkbox) {
                    checkbox.checked = true;  // Check the checkbox
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);  // Dispatch change event to trigger any other behavior
                    console.log('Checkbox checked for:', checkboxId);  // Log that checkbox was checked
                } else {
                    console.log('Checkbox not found for ID:', checkboxId);  // If checkbox is not found
                }
            } else {
                console.log('No matching barangay found for ID:', barangayId);  // If locationData is not found
            }
        });
    } catch (error) {
        console.error('Error fetching outage data:', error);
        Swal.fire('Error', `An error occurred while fetching the outage: ${error.message}`, 'error');
    }
}

// -------------------------------------------------- Edit Outage

document.getElementById('editOutageForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    const title = document.getElementById('title').value;
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const gawain = document.getElementById('gawain').value;
    const description = document.getElementById('description').value;
    const images = document.getElementById('images').files;

    const selectedLocationsArray = Array.from(selectedLocations).map(location => location.substring(4));

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // Validation: Date cannot be before the current date
    const currentDate = new Date().toISOString().split("T")[0];
    if (date < currentDate) {
        Swal.fire('Error', 'The selected date cannot be before the current date.', 'error');
        return;
    }

    // Validation: End time cannot be before start time
    if (endTime <= startTime) {
        Swal.fire('Error', 'End time cannot be before or equal to the start time.', 'error');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this outage?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true

    }).then(async (result) => {
        if (result.isConfirmed) {
            
            Swal.fire({
                title: 'Updating...',
                text: 'Please wait while the outage is being updated.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                if (!firestore) {
                    throw new Error('Firestore instance is not initialized correctly.');
                }

                const outageDocRef = doc(firestore, 'outages', outageId);
                const newsDocRef = doc(firestore, 'news', outageId);

                const imageUrls = [];
                for (const file of images) {
                    const timestamp = Math.floor(new Date().getTime() / 1000.0).toString();
                    const storageRef = ref(storage, `newsImages/${timestamp}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    imageUrls.push(downloadURL);
                }

                // Update outage document
                await updateDoc(outageDocRef, {
                    title: title,
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    gawain: gawain,
                    content: description,
                    selectedLocations: selectedLocationsArray,
                    ...(imageUrls.length > 0 && { image: imageUrls }) 
                });

                // Update news document
                await updateDoc(newsDocRef, {
                    title: title,
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    gawain: gawain,
                    content: description,
                    selectedLocations: selectedLocationsArray,
                    ...(imageUrls.length > 0 && { image: imageUrls }) 
                });

                Swal.fire('Updated!', 'The outage has been updated successfully.', 'success').then(() => {
                    form.reset();
                    form.classList.remove('was-validated');
                    window.location.href = 'outage.html';
                });

            } catch (error) {
                console.error('Error updating document:', error.message || error);
                Swal.fire('Error', `An error occurred while updating the outage: ${error.message}`, 'error');
            }
        }
    });
});

// -------------------------------------------------- Fetch Barangays JSON data

async function fetchBarangaysData() {
    const response = await fetch('../../../resources/json/filtered_Barangays.json');
    const data = await response.json();
    return data.features.map(feature => ({
        municipalityId: feature.properties.ID_2,
        municipalityName: feature.properties.NAME_2,

        barangayId: feature.properties.ID_3,
        barangayName: feature.properties.NAME_3,
        
        fullName: `${feature.properties.NAME_2}, ${feature.properties.NAME_3}`, // Concatenating for search
        coordinates: feature.geometry.coordinates // Save coordinates for highlighting
    }));
}

// -------------------------------------------------- Generate Location Checkboxes

function generateLocationCheckboxes(data) {
    const locationContainer = document.getElementById('locationCheckboxContainer');
    const groupedData = {};

    // Group data by municipalityId
    data.forEach(item => {
        const municipalityId = item.municipalityId;
        if (!groupedData[municipalityId]) {
            groupedData[municipalityId] = [];
        }
        groupedData[municipalityId].push(item);
    });

    // Create an accordion container
    const accordion = document.createElement('div');
    accordion.className = 'accordion';
    accordion.id = 'locationAccordion';

    // Loop through grouped data and create an accordion item for each municipality
    for (const municipalityId in groupedData) {
        const municipalityData = groupedData[municipalityId];

        // Create the accordion header
        const accordionHeader = document.createElement('h2');
        accordionHeader.className = 'accordion-header';
        accordionHeader.id = `heading${municipalityId}`;

        const accordionButton = document.createElement('button');
        accordionButton.className = 'accordion-button';
        accordionButton.type = 'button';
        accordionButton.dataset.bsToggle = 'collapse';
        accordionButton.dataset.bsTarget = `#collapse${municipalityId}`;
        accordionButton.setAttribute('aria-expanded', 'true');
        accordionButton.setAttribute('aria-controls', `collapse${municipalityId}`);
        accordionButton.textContent = municipalityData[0].municipalityName;

        accordionHeader.appendChild(accordionButton);

        // Create the accordion collapse body
        const accordionBody = document.createElement('div');
        accordionBody.id = `collapse${municipalityId}`;
        accordionBody.className = 'accordion-collapse collapse';
        accordionBody.setAttribute('aria-labelledby', `heading${municipalityId}`);
        accordionBody.setAttribute('data-bs-parent', '#locationAccordion');

        const accordionList = document.createElement('div');
        accordionList.className = 'accordion-body';

        // Create the "select all" checkbox for the municipality
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'form-check-input';
        selectAllCheckbox.id = `selectAll-${municipalityId}`;

        // Label for the "select all" checkbox
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = `selectAll-${municipalityId}`;
        selectAllLabel.className = 'form-check-label';
        selectAllLabel.textContent = 'Select All Barangays';

        // Container for the "select all" checkbox
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'form-check';
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);

        // Append the "select all" checkbox to the accordion body
        accordionList.appendChild(selectAllDiv);

        // Loop through barangays and create checkboxes
        municipalityData.forEach(item => {
            const locationId = `${item.municipalityId}-${item.barangayId}`;

            // Create a checkbox element
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = locationId;
            checkbox.id = locationId;
            checkbox.className = 'form-check-input';

            // Add event listener to handle the highlighting when the checkbox is checked
            checkbox.addEventListener('change', function () {
                const selectedItem = {
                    dataset: {
                        id: item.barangayId,
                        municipalityId: item.municipalityId
                    },
                    value: `${item.municipalityName}, ${item.barangayName}`,
                    idd: item.barangayId
                };
                toggleSelectedLocation(selectedItem, this.checked);  // Pass the checked status
                highlightSelectedLocations(); // Update map highlights
                console.log(selectedLocations);
            });

            // Create a label for the checkbox
            const label = document.createElement('label');
            label.htmlFor = locationId;
            label.className = 'form-check-label';
            label.textContent = `${item.municipalityName}, ${item.barangayName}`;

            // Create a container div for checkbox and label
            const div = document.createElement('div');
            div.className = 'form-check';
            div.appendChild(checkbox);
            div.appendChild(label);

            // Append the checkbox div to the accordion list
            accordionList.appendChild(div);
        });

        // Append the list to the accordion body
        accordionBody.appendChild(accordionList);

        // Create an accordion item for the municipality
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        accordionItem.appendChild(accordionHeader);
        accordionItem.appendChild(accordionBody);

        // Append the accordion item to the accordion container
        accordion.appendChild(accordionItem);

        // Add event listener to "select all" checkbox
        selectAllCheckbox.addEventListener('change', function () {
            const allCheckboxes = document.querySelectorAll(`#collapse${municipalityId} .form-check-input[type="checkbox"]:not(#selectAll-${municipalityId})`);
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
                const selectedItem = {
                    dataset: {
                        id: checkbox.id.split('-')[1], // Extract barangayId
                        municipalityId: municipalityId
                    },
                    value: checkbox.nextElementSibling.textContent,
                    idd: checkbox.id.split('-')[1]
                };
                toggleSelectedLocation(selectedItem, checkbox.checked);  // Update selected locations
            });
            highlightSelectedLocations(); // Update map highlights
        });
    }

    // Append the accordion to the location container
    locationContainer.appendChild(accordion);
}



// -------------------------------------------------- Toggle location selection

function toggleSelectedLocation(selectedItem, isChecked) {
    const locationId = `${selectedItem.dataset.municipalityId}-${selectedItem.dataset.id}`;
    if (isChecked) {
        // Add to selected locations if checked
        selectedLocations.add(locationId);
    } else {
        // Remove from selected locations if unchecked
        selectedLocations.delete(locationId);
    }
}

// --------------------------------------------------  Add selected location to the list


function removeSelectedLocation(listItem) {
    const id = listItem.getAttribute('data-id');
    const municipalityId = listItem.getAttribute('data-municipality-id');
    const locationKey = `${municipalityId}-${id}`;
    
    // Remove from the selectedLocations Set
    selectedLocations.delete(locationKey);
    
    // Remove the list item from the DOM
    listItem.remove();
    
    // Optionally, update the map to reflect the changes
    highlightSelectedLocations();
}

// -------------------------------------------------- Initialize Map

async function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 14.126453952452705, lng: 122.93794081616616 }, 
        zoom: 12,
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

        const featureId = `${feature.getProperty('ID_2')}-${feature.getProperty('ID_3')}`;
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

        const featureId = `${feature.getProperty('ID_2')}-${feature.getProperty('ID_3')}`;
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

// Call the main function to kick off the initialization process
init();