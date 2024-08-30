// -------------------------------------------------- Firebase Imports

import { auth } from './config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// -------------------------------------------------- Auth State Change 

onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.endsWith('index.html')) {
        window.location.href = '../pages/dashboard/dashboard.html';
    }
});

// -------------------------------------------------- Login

async function loginUser(event) {
    event.preventDefault();
    
    const emailElement = document.getElementById('email');
    const passwordElement = document.getElementById('password');

    if (emailElement && passwordElement) {
        const email = emailElement.value;
        const password = passwordElement.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            Swal.fire({
                icon: 'success',
                title: 'Login Successful',
                text: 'Welcome back!',
            }).then(() => {
                window.location.href = '../pages/dashboard/dashboard.html';
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: "Invalid Credentials",
            });
        }
    }
}

// -------------------------------------------------- Forgot Password function

async function forgotPassword() {
    const { value: email } = await Swal.fire({
        title: 'Reset your password',
        input: 'email',
        inputLabel: 'Enter your email address',
        inputPlaceholder: 'Enter your email address',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'You need to write something!';
            }
        }
    });

    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            Swal.fire({
                icon: 'success',
                title: 'Email Sent',
                text: 'Password reset email sent!',
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
            });
        }
    }
}

document.getElementById('forgotPassword').addEventListener('click', forgotPassword);

// -------------------------------------------------- Form Validation

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach((form) => {
        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                form.classList.add('was-validated');
            } else if (form.id === 'loginForm') {
                loginUser(event);
            }
        }, false);
    });
});

// -------------------------------------------------- Include Header & Footer

async function includeHTML() {
    try {
        const headerResponse = await fetch('template/index-header.html');
        if (headerResponse.ok) {
            const headerHTML = await headerResponse.text();
            document.getElementById('header').innerHTML = headerHTML;
        } else {
            console.error('Failed to fetch header.html:', headerResponse.statusText);
        }

        const footerResponse = await fetch('template/index-footer.html');
        if (footerResponse.ok) {
            const footerHTML = await footerResponse.text();
            document.getElementById('footer').innerHTML = footerHTML;
        } else {
            console.error('Failed to fetch footer.html:', footerResponse.statusText);
        }
    } catch (error) {
        console.error('Error fetching HTML files:', error);
    }
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', includeHTML);
