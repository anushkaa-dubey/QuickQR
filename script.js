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
    if (qrText.value.trim().length > 0) {
        generateQRCode();
    } else {
        alert("Enter the text or URL to generate your QR code");
    }
});

sizes.addEventListener('change', (e) => {
    size = e.target.value;
    if (qrText.value.trim().length > 0) {
        generateQRCode();
    }
});

downloadBtn.addEventListener('click', () => {
    const qrCanvas = document.querySelector('.qr-body canvas'); // Get the canvas
    if (qrCanvas) {
        const imageData = qrCanvas.toDataURL("image/png"); // Convert canvas to PNG data URL

        // Create a temporary link and trigger download
        const tempLink = document.createElement('a');
        tempLink.href = imageData;
        tempLink.download = "QR_Code.png";
        document.body.appendChild(tempLink); // Append to the DOM
        tempLink.click(); // Trigger download
        document.body.removeChild(tempLink); // Remove from the DOM
    } else {
        alert("Please generate a QR code first.");
    }
});

function generateQRCode() {
    qrContainer.innerHTML = ""; // Clear previous QR code
    const qrCanvas = document.createElement('canvas'); // Create a new canvas
    qrCanvas.width = size;
    qrCanvas.height = size;
    const ctx = qrCanvas.getContext('2d');

    // Generate QR code data
    QRCode.toCanvas(
        qrCanvas,
        qrText.value,
        {
            width: size,
            height: size,
            color: {
                dark: "#000", // QR code color
                light: "#fff", // Background color
            },
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
                        const logoSize = size / 5; // Logo size is 1/5th of the QR code size
                        const x = (qrCanvas.width - logoSize) / 2;
                        const y = (qrCanvas.height - logoSize) / 2;
                        ctx.drawImage(logoImg, x, y, logoSize, logoSize); // Draw logo on the QR code
                    };
                };
                reader.readAsDataURL(logoFile);
            }
        }
    );

    qrContainer.appendChild(qrCanvas); // Append the canvas to the container
}
