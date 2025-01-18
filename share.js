// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDiB5PASY-WkkoufspwfJOttq4YDnSqsdI",
    authDomain: "qr-usermanagement.firebaseapp.com",
    projectId: "qr-usermanagement",
    storageBucket: "qr-usermanagement.firebasestorage.app",
    messagingSenderId: "927684182758",
    appId: "1:927684182758:web:28bd9c27307003cfa97127"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function loadSharedQR() {
    const urlParams = new URLSearchParams(window.location.search);
    const qrId = urlParams.get('id');

    if (!qrId) {
        showError('No QR code ID provided');
        return;
    }

    try {
        const doc = await db.collection('qrcodes').doc(qrId).get();
        
        if (!doc.exists) {
            showError('This QR code has been deleted or does not exist');
            return;
        }

        const data = doc.data();
        await renderQRCode(data);
    } catch (error) {
        console.error('Error loading QR code:', error);
        showError('Unable to retrieve QR code. It may have been deleted or is no longer accessible.');
    }
}

async function renderQRCode(data) {
    const qrBody = document.querySelector('.qr-body');
    const spinner = document.querySelector('.loading-spinner');
    const downloadBtn = document.getElementById('downloadBtn');
    const creatorInfo = document.getElementById('creatorInfo');
    const shareButtons = document.querySelector('.share-buttons');

    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, data.content, data.options);
        
        spinner.style.display = 'none';
        qrBody.innerHTML = '';
        qrBody.appendChild(canvas);

        // Show creator info if available
        if (data.creator && data.creator !== 'anonymous') {
            creatorInfo.innerHTML = `Created by: <strong>${data.creator.name}</strong>`;
            creatorInfo.style.display = 'block';
        } else {
            creatorInfo.innerHTML = 'Created by: <strong>Anonymous</strong>';
            creatorInfo.style.display = 'block';
        }

        // Show share buttons
        shareButtons.style.display = 'flex';
        
        // Get current URL for sharing
        const shareUrl = window.location.href;

        // Setup share buttons
        document.getElementById('whatsappShare').onclick = () => {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank');
        };
        
        document.getElementById('twitterShare').onclick = () => {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank');
        };

        document.getElementById('copyLink').onclick = async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('Link copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }
        };

        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'SharedQR.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    } catch (error) {
        showError('Failed to render QR code');
    }
}

// Add toast functionality
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showError(message) {
    const qrBody = document.querySelector('.qr-body');
    qrBody.innerHTML = `<div class="error-message">${message}</div>`;
}

document.addEventListener('DOMContentLoaded', loadSharedQR);
