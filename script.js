const qrText = document.getElementById('qr-text');
const sizes = document.getElementById('sizes');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const qrContainer = document.querySelector('.qr-body');
const logoInput = document.getElementById('logo-input');

let size = sizes.value;

generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    qrContainer.classList.add('fade-animation');
    qrText.value.length > 0 ? generateQRCode() : alert("Enter the text or URL to generate your QR code");
});

sizes.addEventListener('change', (e) => {
    size = e.target.value;
    qrText.value.length > 0 && generateQRCode();
});

// downloadBtn.addEventListener('click', () => {
//     const img = document.querySelector('.qr-body img');

//     if (img) {
//         const imgAttr = img.getAttribute('src');
//         downloadBtn.setAttribute('href', imgAttr);
//     } else {
//         downloadBtn.setAttribute('href', `${document.querySelector('canvas').toDataURL()}`);
//     }
// });
downloadBtn.addEventListener('click', () => {
    const img = document.querySelector('.qr-body canvas');
    if (img) {
        downloadBtn.setAttribute('href', img.toDataURL());
    }
});

function generateQRCode() {
    qrContainer.innerHTML = ""; // Clear previous QR code
    const qrCanvas = document.createElement('canvas'); // Create a new canvas
    qrCanvas.width = size;
    qrCanvas.height = size;
    qrContainer.appendChild(qrCanvas); // Append canvas to the container
    const ctx = qrCanvas.getContext('2d');

    // Generate QR code data URL
    QRCode.toCanvas(
        qrCanvas,
        qrText.value,
        {
            width: size,
            height: size,
            color: {
                dark: "#000", // QR code color
                light: "#fff" // Background color
            }
        },
        (error) => {
            if (error) {
                alert("Failed to generate QR code: " + error.message);
                return;
            }

            const logoFile = logoInput.files[0];
            if (logoFile) {
                const logoImg = new Image();
                const reader = new FileReader();

                reader.onload = (e) => {
                    logoImg.src = e.target.result;
                    logoImg.onload = () => {
                        const logoSize = size / 5; // Logo size as 1/5th of QR code
                        const x = (qrCanvas.width - logoSize) / 2;
                        const y = (qrCanvas.height - logoSize) / 2;
                        ctx.drawImage(logoImg, x, y, logoSize, logoSize); // Draw the logo
                    };
                };
                reader.readAsDataURL(logoFile);
            }
        }
    );
}
