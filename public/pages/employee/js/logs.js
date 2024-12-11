// -------------------------------------------------- Firebase Imports

import { firestore, auth } from '../../../resources/js/config.js';
import { collection, getDocs, query, where, doc, deleteDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { formatTime, formatDate } from '../../../resources/js/main.js';

// -------------------------------------------------- Fetch and display data

async function fetchData() {
    const logsCollection = collection(firestore, 'maintenanceLogs');
    try {
        const querySnapshot = await getDocs(logsCollection);
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        populateTable(data);

        document.getElementById('logsTable').classList.remove('d-none');
        document.getElementById('loadingSpinner').classList.add('d-none');
    } catch (error) {
        console.error("Error fetching documents: ", error);
    }
}

// -------------------------------------------------- Function to populate the DataTable

function populateTable(data) {
    if ($.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable().destroy();
    }

    $('#logsTable').DataTable({
        responsive: true,
        columnDefs: [
            { responsivePriority: 1, targets: 0 },
            { responsivePriority: 2, targets: -1 },
            {
                "targets": '_all',
                "createdCell": function (td, cellData, rowData, row, col) {
                    $(td).css('padding', '10px') }
            }
        ], 
        data: data,
        columns: [
            { data: 'assigned', title: 'Assigned', className: 'text-start' },
            {
                data: null,
                title: 'Device ID',
                className: 'text-start',
                render: function (data, type, row) {
                    const firstName = row.deviceID || 'N/A';
                    const lastName = row.locationName || 'N/A';
                    return `${firstName}-${lastName}`;
                }
            },
            {
                data: 'status',
                title: 'Status',
                className: 'text-start',
                render: function (data) {
                    if (data === "working") {
                        return `<span class="badge bg-success">Working</span>`;
                    } else if (data === "under repair") {
                        return `<span class="badge bg-primary">Under Repair</span>`;
                    }
                    return `<span class="badge bg-secondary">Unknown</span>`;
                }
            },
            {
                data: 'timestamp',
                title: 'Date & Time',
                className: 'text-start',
                render: function (data) {
                    if (data) {
                        const date = formatDate(data);
                        const time = formatTime(data);
                        return `${date} ${time}`;
                    }
                    return 'N/A';
                }
            }
        ],
    });

}

// -------------------------------------------------- Fetch data when the document is ready

$(document).ready(function () {
    console.log('Document ready, fetching data...');
    fetchData();
});

