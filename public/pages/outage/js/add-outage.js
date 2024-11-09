// -------------------------------------------------- Firebase Imports

import { firestore, storage } from '../../../resources/js/config.js';  
import { collection, setDoc, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let map;
let selectedLocations = new Set(); // To keep track of selected locations

// -------------------------------------------------- Main function to initialize everything

async function init() {
    try {
        // Fetch and process the barangays data
        const barangaysData = await fetchBarangaysData();
        
        // Generate checkboxes for locations
        generateLocationCheckboxes(barangaysData);
        
        // Initialize the map
        await initMap();

        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('map').classList.remove('d-none');
        document.getElementById('addOutageForm').classList.remove('d-none');
    } catch (error) {
        console.error('Error initializing the application:', error);
    }
}

// -------------------------------------------------- Add Outage

document.getElementById('addOutageForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;

    const title = document.getElementById('title').value;
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const gawain = document.getElementById('gawain').value;
    const description = document.getElementById('description').value;
    const images = document.getElementById('images').files;

    const barangaysData = await fetchBarangaysData();

    const selectedBarangayNames = Array.from(selectedLocations).map(location => {
        const [municipalityId, barangayId] = location.split('-');
        const barangay = barangaysData.find(item => `${item.barangayId}` === barangayId);
        return barangay ? barangay.barangayName : '';
    }).filter(name => name); 

    const selectedLocationsArray = Array.from(selectedLocations).map(location => location.substring(4));

    // console.log(selectedLocationsArray);

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

    // Check if at least one checkbox is checked
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        Swal.fire('Error', 'Please select at least one location.', 'error');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to save this outage?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: "#4e73df",
        cancelButtonColor: "#6c757d",
        reverseButtons: true

    }).then(async (result) => {
        if (result.isConfirmed) {
            
            Swal.fire({
                title: 'Saving...',
                text: 'Please wait while the outage is being saved.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                if (!firestore) {
                    throw new Error('Firestore instance is not initialized correctly.');
                }

                const outageCollectionRef = collection(firestore, 'outages');
                const newsCollectionRef = collection(firestore, 'news');
                const timestamp = Math.floor(new Date().getTime() / 1000.0).toString();

                const imageUrls = [];
                for (const file of images) {
                    const storageRef = ref(storage, `newsImages/${timestamp}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    imageUrls.push(downloadURL);
                }

                await setDoc(doc(outageCollectionRef, timestamp), {
                    title: title,
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    gawain: gawain,
                    content: description,
                    category: "Patalastas ng Power Interruption",
                    selectedLocations: selectedLocationsArray,
                    timestamp: timestamp,
                    image: imageUrls, 
                    status: ""
                });

                await setDoc(doc(newsCollectionRef, timestamp), {
                    title: title,
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    gawain: gawain,
                    content: description,
                    category: "Patalastas ng Power Interruption",
                    selectedLocations: selectedLocationsArray,
                    timestamp: timestamp,
                    image: imageUrls, 
                    status: ""
                });

                await updateDoc(doc(firestore, 'sms', 'to_all'), {
                    content: `${title}\n\nGAWAIN: ${gawain}\n\nPETSA: ${date}\n\nORAS: ${startTime} - ${endTime}\n\n APEKTADONG LUGAR: ${selectedBarangayNames}\n\nPara sa buong detalye at iba pang impormasyon, maaaring bumisita sa CANORECO Mobile App`,
                    send: true
                });

                console.log(`${title}\n\nGAWAIN: ${gawain}\n\nPETSA: ${date}\n\nORAS: ${startTime} - ${endTime}\n\n APEKTADONG LUGAR: ${selectedBarangayNames}`);

                // Fetch user data from 'users' collection
                const usersCollectionRef = collection(firestore, 'users');
                const querySnapshot = await getDocs(usersCollectionRef);
                const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                const selectedLocationsName = Array.from(document.getElementById('selectedLocations').children).map(li => 
                    li.getAttribute('data-municipality-id')
                );

                // Add notifications only for users whose barangay and municipality match the selected locations
                for (const user of usersData) {
                    const userBarangay = user.barangay || 'Not specified';
                    const userMunicipality = user.municipality || 'Not specified';
                    const userKey = `${userMunicipality}, ${userBarangay}`;

                    if (selectedLocationsName.includes(userKey)) {
                        console.log(`User's Barangay: ${userBarangay}, Municipality: ${userMunicipality} matches with selected locations.`);

                        const userNotificationsRef = collection(firestore, `users/${user.id}/notifications`);
                        await setDoc(doc(userNotificationsRef, timestamp), {
                            title: "Patalastas ng Power Interruption",
                            text: `${title}`,
                            status: false,
                            isRead: false,
                            timestamp: timestamp
                        });
                        console.log(`Notification sent to user: ${user.id}`);

                    } else {
                        console.log(`User's Barangay: ${userBarangay}, Municipality: ${userMunicipality} does not match any selected location.`);
                    }
                }

                // Close the loading Swal and show success message
                Swal.fire('Saved!', 'The outage has been saved successfully.', 'success').then(() => {
                    form.reset();
                    form.classList.remove('was-validated');
                    window.location.href = 'outage.html';
                });

            } catch (error) {
                console.error('Error saving document:', error.message || error);
                Swal.fire('Error', `An error occurred while saving the outage: ${error.message}`, 'error');
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

async function generateLocationCheckboxes(data) {
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
            checkbox.addEventListener('change', async function () {
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
                console.log("selectedLocations",selectedLocations);
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

// -------------------------------------------------- Autocomplete function

function autocomplete(input, data) {
    let currentFocus;

    input.addEventListener('input', function () {
        const value = this.value;
        closeAllLists();

        if (!value) return false;
        currentFocus = -1;

        const listContainer = document.createElement('div');
        listContainer.setAttribute('id', this.id + 'autocomplete-list');
        listContainer.setAttribute('class', 'autocomplete-items');
        this.parentNode.appendChild(listContainer);

        data.forEach(item => {
            const locationId = `${item.municipalityId}-${item.barangayId}`;
            
            // Skip the item if it has already been selected
            if (selectedLocations.has(locationId)) {
                return;
            }

            const nameToSearch = `${item.municipalityName} ${item.barangayName}`.toLowerCase();
            if (nameToSearch.includes(value.toLowerCase())) {
                const itemElement = document.createElement('div');
                itemElement.innerHTML = `<strong>${item.municipalityName}</strong>, ${item.barangayName}`;
                itemElement.innerHTML += `<input type='hidden' data-id='${item.barangayId}' data-municipality-id='${item.municipalityId}' value='${item.fullName}'>`;
                itemElement.addEventListener('click', function () {
                    const selectedItem = this.getElementsByTagName('input')[0];
                    toggleSelectedLocation(selectedItem);
                    highlightSelectedLocations();
                    input.value = ''; 
                    closeAllLists();
                });
                listContainer.appendChild(itemElement);
            }
        });
    });

    input.addEventListener('keydown', function (e) {
        let list = document.getElementById(this.id + 'autocomplete-list');
        if (list) list = list.getElementsByTagName('div');
        if (e.keyCode === 40) {
            currentFocus++;
            addActive(list);
        } else if (e.keyCode === 38) {
            currentFocus--;
            addActive(list);
        } else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (list) list[currentFocus].click();
            }
        }
    });

    function addActive(list) {
        if (!list) return false;
        removeActive(list);
        if (currentFocus >= list.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = list.length - 1;
        list[currentFocus].classList.add('autocomplete-active');
    }

    function removeActive(list) {
        for (let i = 0; i < list.length; i++) {
            list[i].classList.remove('autocomplete-active');
        }
    }

    function closeAllLists(elmnt) {
        const items = document.getElementsByClassName('autocomplete-items');
        for (let i = 0; i < items.length; i++) {
            if (elmnt != items[i] && elmnt != input) {
                items[i].parentNode.removeChild(items[i]);
            }
        }
    }

    document.addEventListener('click', function (e) {
        closeAllLists(e.target);
    });
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

function addSelectedLocation(selectedItem) {
    const listItem = document.createElement('li');
    listItem.setAttribute('class', 'list-group-item d-flex justify-content-between align-items-center');
    listItem.textContent = selectedItem.value;
    listItem.setAttribute('data-id', selectedItem.dataset.id);
    listItem.setAttribute('data-municipality-id', selectedItem.dataset.municipalityId);
    
    // Create a remove button with Font Awesome icon
    const removeButton = document.createElement('button');
    removeButton.innerHTML = '<i class="fas fa-rectangle-xmark fa-xl"></i>'; 
    removeButton.setAttribute('class', 'btn p-0 m-0 text-danger');
    removeButton.addEventListener('click', () => {
        removeSelectedLocation(listItem);
    });
    
    // Append the remove button to the list item
    listItem.appendChild(removeButton);
    
    // Append the list item to the selectedLocations container
    document.getElementById('selectedLocations').appendChild(listItem);

    // Add to selectedLocations Set
    selectedLocations.add(`${selectedItem.dataset.municipalityId}-${selectedItem.dataset.id}`);
}

function removeLocationFromList(locationId) {
    const list = document.getElementById('selectedLocations');
    const listItem = list.querySelector(`li[data-id="${locationId}"]`);
    if (listItem) {
        list.removeChild(listItem);
    }
}

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
