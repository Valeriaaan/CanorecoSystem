// -------------------------------------------------- Firebase Imports

import { firestore, auth } from '../../../resources/js/config.js';
import { collection, getDocs, query, where, doc, deleteDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Fetch and display data

async function fetchData() {
    const usersCollection = collection(firestore, 'users');
    const membersQuery = query(usersCollection, where('userType', '==', 'member'));

    try {
        const querySnapshot = await getDocs(membersQuery);
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        populateTable(data);

        document.getElementById('consumersTable').classList.remove('d-none');
        document.getElementById('loadingSpinner').classList.add('d-none');
    } catch (error) {
        console.error("Error fetching documents: ", error);
    }
}

// -------------------------------------------------- Function to populate the DataTable

function populateTable(data) {
    if ($.fn.DataTable.isDataTable('#consumersTable')) {
        $('#consumersTable').DataTable().destroy();
    }

    $('#consumersTable').DataTable({
        responsive: true,
        columnDefs: [
            { responsivePriority: 1, targets: 0 },
            { responsivePriority: 2, targets: -1 }
        ],
        data: data,
        columns: [
            {
                data: null,
                title: 'Name',
                className: 'text-start',
                render: function (data, type, row) {
                    const firstName = row.firstName || '';
                    const lastName = row.lastName || '';
                    return `${firstName} ${lastName}`;
                }
            },
            { data: 'email', title: 'Email', className: 'text-start' },
            {
                data: null,
                title: 'Address',
                className: 'text-start',
                render: function (data, type, row) {
                    const municipality = row.municipality || '';
                    const barangay = row.barangay || '';
                    const street = row.street || '';  

                    return street 
                        ? `${municipality}, ${barangay}, ${street}`
                        : `${municipality}, ${barangay}`;
                }
            },
            { data: 'phone', title: 'Contact Number', className: 'text-start'  },
            {
                data: 'access',
                title: 'Access',
                className: 'text-start',
                render: function (data) {
                    const status = data ? 'Active' : 'Inactive';
                    const badgeClass = data ? 'bg-success' : 'bg-danger';
                    return `<span class="badge ${badgeClass}" style="cursor: pointer;">${status}</span>`;
                }
            },
            {
                data: null,
                title: 'Actions',
                className: 'text-start',
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-warning btn-sm edit-btn" data-id="${row.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `;
                }
            }
        ],
    });

    // Event listeners for buttons (Edit, Delete)
    $('#consumersTable tbody').on('click', '.edit-btn', function () {
        const id = $(this).data('id');
        handleEdit(id);
    });

    $('#consumersTable tbody').on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        handleDelete(id);
    });

    // Event listener for Access cell click
    $('#consumersTable tbody').on('click', 'td:nth-child(4)', function () {
        const table = $('#consumersTable').DataTable();
        const rowData = table.row(this).data();
        handleAccessChange(rowData.id, rowData.access);
    });
}

// -------------------------------------------------- Handle Access Change

async function handleAccessChange(id, currentAccess) {
    const actionText = currentAccess ? 'deactivate' : 'activate';
    const confirmText = currentAccess ? 'Deactivate' : 'Activate';

    const result = await Swal.fire({
        title: `Do you want to ${actionText} this user's account?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: currentAccess ? '#d33' : '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: confirmText,
        reverseButtons: true
    });

    if (result.isConfirmed) {
        
        Swal.fire({
            title: 'Updating...',
            text: 'Please wait while employee access is being updated.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const userRef = doc(firestore, 'users', id);
            await updateDoc(userRef, { access: !currentAccess });

            Swal.fire({
                title: `Account ${confirmText}d!`,
                icon: 'success',
                text: `The user's account has been ${confirmText}d successfully.`
            });
            fetchData();

        } catch (error) {
            console.error("Error updating access:", error);
            Swal.fire('Error!', 'There was an error updating the access.', 'error');
        }
    }
}


// -------------------------------------------------- Edit function

window.handleEdit = function (id) {
    console.log('Edit user:', id);
    window.location.href = `edit-employee.html?id=${id}`;
}

// -------------------------------------------------- Delete function

async function handleDelete(id) {
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
            text: 'Please wait while employee data is being deleted.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Delete the user from Firestore
            await deleteDoc(doc(firestore, 'users', id));

            // Delete the user from Firebase Authentication using the same UID (id)
            const userAuth = auth.currentUser; // Make sure you are authenticated as an admin to perform this operation
            if (userAuth) {
                const userToDelete = await auth.getUser(id); 
                await deleteUser(userToDelete);
            }

            Swal.fire('Deleted!', 'The user has been deleted.', 'success');
            $('#consumersTable').DataTable().ajax.reload();

        } catch (error) {
            console.error("Error deleting user: ", error);
            Swal.fire('Error!', 'There was an error deleting the user.', 'error');
        }
    }
}

// -------------------------------------------------- Fetch data when the document is ready

$(document).ready(function () {
    console.log('Document ready, fetching data...');
    fetchData();
});

