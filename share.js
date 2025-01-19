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
        if (data.userEmail) {
            creatorInfo.innerHTML = `Created by: <strong>${data.creator}</strong>`;
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

        // Setup download buttons
        setupDownloadButtons(canvas, data);
    } catch (error) {
        showError('Failed to render QR code');
    }
}

function setupDownloadButtons(canvas, data) {
    const downloadPNG = document.getElementById('downloadPNG');
    const downloadJPG = document.getElementById('downloadJPG');
    const downloadSVG = document.getElementById('downloadSVG');
    const downloadPDF = document.getElementById('downloadPDF');
    const dropdown = document.querySelector('.dropdown');

    // Add click handler for download dropdown
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdown.classList.remove('active');
        }
    });

    // PNG download
    downloadPNG.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'SharedQR.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('QR Code downloaded as PNG', 'success');
    });

    // JPG download
    downloadJPG.addEventListener('click', () => {
        const jpgCanvas = document.createElement('canvas');
        jpgCanvas.width = canvas.width;
        jpgCanvas.height = canvas.height;
        const ctx = jpgCanvas.getContext('2d');

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
        ctx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = 'SharedQR.jpg';
        link.href = jpgCanvas.toDataURL('image/jpeg', 0.8);
        link.click();
        showToast('QR Code downloaded as JPG', 'success');
    });

    // SVG download
    downloadSVG.addEventListener('click', async () => {
        try {
            const svgString = await QRCode.toString(data.content, {
                ...data.options,
                type: 'svg'
            });
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'SharedQR.svg';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            showToast('QR Code downloaded as SVG', 'success');
        } catch (error) {
            showToast('Failed to download SVG', 'error');
        }
    });

    // PDF download
    downloadPDF.addEventListener('click', async () => {
        try {
            if (!window.jspdf) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const qrSize = Math.min(pdfWidth, pdfHeight) * 0.8;
            const x = (pdfWidth - qrSize) / 2;
            const y = (pdfHeight - qrSize) / 2;

            pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);
            pdf.save('SharedQR.pdf');
            showToast('QR Code downloaded as PDF', 'success');
        } catch (error) {
            showToast('Failed to download PDF', 'error');
        }
    });
}

// Add utility function to load external scripts
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
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
