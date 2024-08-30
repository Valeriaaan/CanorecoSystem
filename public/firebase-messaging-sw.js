// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyBypU20joLwRToRC1rS96jIYEHytdQzsR4",
    authDomain: "canorecosystem-de381.firebaseapp.com",
    projectId: "canorecosystem-de381",
    storageBucket: "canorecosystem-de381.appspot.com",
    messagingSenderId: "1085481136734",
    appId: "1:1085481136734:web:c3c9f5ca05763988a67acf",
    measurementId: "G-VBYKNEHL53"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/firebase-logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
