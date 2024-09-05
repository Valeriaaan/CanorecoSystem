let geocoder;

// -------------------------------------------------- Locate Marker Function

function geocodeLatLng(latlng) {
    if (!geocoder) {
        geocoder = new google.maps.Geocoder();
    }

    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                const addressComponents = results[0].address_components;
                
                let municipality = "";
                let street = "";

                for (const component of addressComponents) {
                    const types = component.types;
                    if (types.includes("locality")) {
                        municipality = component.long_name;
                    } else if (types.includes("route")) {
                        street = component.long_name;
                    }
                }

                document.getElementById('municipality').value = municipality;
                document.getElementById('street').value = street;

                fetchBarangayData(municipality, latlng);
            }
        } else {
            console.error("Geocode was not successful for the following reason: " + status);
        }
    });
}

// -------------------------------------------------- Fetch Barangay Function

function fetchBarangayData(municipality, latlng) {
    const barangayDataUrl = `../../../resources/json/filtered_Barangays.json`;

    fetch(barangayDataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const barangay = findBarangay(data, latlng);

            if (barangay) {
                document.getElementById('barangay').value = barangay;
            } else {
                console.error("No barangay data found for the location.");
            }
        })
        .catch(error => {
            console.error('Error fetching barangay data:', error);
        });
}

function findBarangay(data, latlng) {
    for (const feature of data.features) {
        const coordinates = feature.geometry.coordinates[0];
        // Transform coordinates to [lng, lat] format
        const polygon = coordinates.map(coord => [coord[0], coord[1]]);
        if (isPointInPolygon(latlng, polygon)) {
            return feature.properties.NAME_3; 
        }
    }
    return null;
}

function isPointInPolygon(point, polygon) {
    const x = point.lng();
    const y = point.lat();

    let inside = false;
    const numVertices = polygon.length;

    let j = numVertices - 1;
    for (let i = 0; i < numVertices; i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            inside = !inside;
        }

        j = i;
    }

    return inside;
}

export { geocodeLatLng, fetchBarangayData, findBarangay, isPointInPolygon };