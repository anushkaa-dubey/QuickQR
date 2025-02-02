// Toast function
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Clear any existing timeout
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
        toast.classList.remove('hide');
        toast.style.display = 'none';
    }
    
    // Show new toast
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    // Set timeout to hide toast
    toast.hideTimeout = setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.style.display = 'none';
            toast.classList.remove('hide');
        }, 300);
    }, 3000);
}

// Utility function to load external scripts
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Single instance of QRGenerator
let qrGenerator = null;
class QRCodeScanner {
    constructor(qrGenerator) {
        this.qrGenerator = qrGenerator;
        this.stream = null;
        this.scanning = false;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.scannerVideo = document.getElementById('scanner-video');
        this.scannerCanvas = document.getElementById('scanner-canvas');
        this.startScannerBtn = document.getElementById('start-scanner-btn');
        this.cameraSelect = document.getElementById('camera-select');
        this.scannerResult = document.getElementById('scanner-result');
    }

    setupEventListeners() {
        if (this.startScannerBtn) {
            this.startScannerBtn.addEventListener('click', () => this.toggleScanner());
        }

        if (this.cameraSelect) {
            this.cameraSelect.addEventListener('change', (e) => this.switchCamera(e.target.value));
        }
    }

    async toggleScanner() {
        if (!this.scanning) {
            await this.startScanner();
        } else {
            this.stopScanner();
        }
    }

    async startScanner() {
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // Set video source and start playing
            if (this.scannerVideo) {
                this.scannerVideo.srcObject = this.stream;
                this.scannerVideo.setAttribute('playsinline', true);
                this.scannerVideo.play();

                // Update button and UI
                if (this.startScannerBtn) {
                    this.startScannerBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Scanner';
                }

                // Start scanning process
                this.scanning = true;
                this.scanQRCode();
            }
        } catch (error) {
            console.error('Camera access error:', error);
            this.showToast('Failed to access camera. Please check permissions.', 'error');
        }
    }

    stopScanner() {
        // Stop video stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Reset video and UI
        if (this.scannerVideo) {
            this.scannerVideo.srcObject = null;
        }

        if (this.startScannerBtn) {
            this.startScannerBtn.innerHTML = '<i class="fas fa-qrcode"></i> Start Scanner';
        }

        // Stop scanning
        this.scanning = false;
    }

    scanQRCode() {
        if (!this.scanning || !this.scannerVideo || !this.scannerCanvas) return;

        const canvas = this.scannerCanvas;
        const ctx = canvas.getContext('2d');

        const tick = () => {
            if (this.scannerVideo.videoWidth === 0) {
                requestAnimationFrame(tick);
                return;
            }

            // Set canvas dimensions to match video
            canvas.width = this.scannerVideo.videoWidth;
            canvas.height = this.scannerVideo.videoHeight;

            // Draw current video frame
            ctx.drawImage(this.scannerVideo, 0, 0, canvas.width, canvas.height);

            // Use jsQR to decode QR code
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });

            if (code) {
                this.handleScanResult(code.data);
                this.stopScanner();
                return;
            }

            // Continue scanning if not stopped
            if (this.scanning) {
                requestAnimationFrame(tick);
            }
        };

        // Start scanning loop
        requestAnimationFrame(tick);
    }

    handleScanResult(result) {
        let processedResult;
        try {
            // Try to parse the result
            if (result.startsWith('BEGIN:VCARD')) {
                processedResult = this.parseVCard(result);
            } else if (result.startsWith('http')) {
                processedResult = { 
                    type: 'URL', 
                    content: result 
                };
            } else {
                processedResult = { 
                    type: 'Text', 
                    content: result 
                };
            }

            // Display result
            if (this.scannerResult) {
                this.scannerResult.innerHTML = `
                    <div class="scanned-result">
                        <h3>Scanned QR Code</h3>
                        <p><strong>Type:</strong> ${processedResult.type}</p>
                        <p><strong>Content:</strong> ${processedResult.content}</p>
                        <div class="scan-actions">
                            <button id="copy-scan-result" class="secondary-button">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button id="generate-from-scan" class="primary-button">
                                <i class="fas fa-qrcode"></i> Regenerate QR
                            </button>
                        </div>
                    </div>
                `;

                // Add event listeners for actions
                const copyBtn = document.getElementById('copy-scan-result');
                const generateBtn = document.getElementById('generate-from-scan');

                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(processedResult.content)
                            .then(() => this.showToast('Copied to clipboard', 'success'))
                            .catch(() => this.showToast('Copy failed', 'error'));
                    });
                }

                if (generateBtn) {
                    generateBtn.addEventListener('click', () => {
                        this.regenerateFromScan(processedResult);
                    });
                }
            }

        } catch (error) {
            console.error('Result processing error:', error);
            if (this.scannerResult) {
                this.scannerResult.innerHTML = `
                    <div class="error-result">
                        <p>Unable to process QR code</p>
                    </div>
                `;
            }
        }
    }

    regenerateFromScan(result) {
        // Ensure qrGenerator has the necessary methods
        if (!this.qrGenerator) {
            this.showToast('QR Generator not available', 'error');
            return;
        }

        // Switch to appropriate tab based on result type
        switch (result.type) {
            case 'URL':
                this.qrGenerator.switchTab('url');
                this.qrGenerator.qrText.value = result.content;
                break;
            case 'Text':
                this.qrGenerator.switchTab('text');
                this.qrGenerator.textContent.value = result.content;
                break;
            case 'Contact':
                this.qrGenerator.switchTab('contact');
                this.populateContactFields(result.content);
                break;
        }

        // Trigger input validation and generate QR
        this.qrGenerator.validateInput();
        this.qrGenerator.generateQRCode();
    }

    populateContactFields(contactInfo) {
        // Parse contact info and populate fields
        const [name, phone, email] = contactInfo.split('|').map(item => item.trim());
        
        if (this.qrGenerator.contactName) 
            this.qrGenerator.contactName.value = name || '';
        if (this.qrGenerator.contactPhone) 
            this.qrGenerator.contactPhone.value = phone || '';
        if (this.qrGenerator.contactEmail) 
            this.qrGenerator.contactEmail.value = email || '';
    }

    parseVCard(vcard) {
        const lines = vcard.split('\n');
        const contact = {};
        
        lines.forEach(line => {
            if (line.startsWith('FN:')) contact.name = line.split(':')[1];
            if (line.startsWith('TEL:')) contact.phone = line.split(':')[1];
            if (line.startsWith('EMAIL:')) contact.email = line.split(':')[1];
        });

        return { 
            type: 'Contact', 
            content: `${contact.name || ''} | ${contact.phone || ''} | ${contact.email || ''}` 
        };
    }

    showToast(message, type = 'info') {
        if (this.qrGenerator && this.qrGenerator.showToast) {
            this.qrGenerator.showToast(message, type);
        } else {
            console.log(message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure QR Code scanning is only initialized if the necessary elements exist
    const scannerVideo = document.getElementById('scanner-video');
    const startScannerBtn = document.getElementById('start-scanner-btn');
    
    if (scannerVideo && startScannerBtn) {
        if (!qrGenerator) {
            qrGenerator = new QRCodeGenerator();
        }
        const qrScanner = new QRCodeScanner(qrGenerator);
    }
});
// QR Generator Class - define only once
class QRCodeGenerator {
    constructor() {
        // Wait for DOM to be fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
        this.lastGeneratedData = null;
        this.lastGeneratedTimestamp = null;
        this.duplicatePreventionDelay = 2000; // 2 seconds
        this.themeBtn = document.getElementById('theme-toggle');
        this.setupThemeToggle();
    }

    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.currentTab = 'url';
        this.logoFile = null;
    }

    initializeElements() {
        this.qrText = document.getElementById('qr-text');
        this.textContent = document.getElementById('text-content');
        this.contactName = document.getElementById('contact-name');
        this.contactPhone = document.getElementById('contact-phone');
        this.contactEmail = document.getElementById('contact-email');
        this.sizes = document.getElementById('sizes');
        this.qrColor = document.getElementById('qr-color');
        this.bgColor = document.getElementById('bg-color');
        this.errorCorrection = document.getElementById('error-correction');
        this.logoInput = document.getElementById('logo-input');
        this.removeLogoBtn = document.getElementById('remove-logo');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.qrContainer = document.querySelector('.qr-body');
        this.loadingSpinner = document.querySelector('.loading-spinner');
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        // For theme toggle
        this.themeToggle = document.getElementById('mode-toggle');
        
        // Add new element references
        this.downloadPNGBtn = document.getElementById('downloadPNG');
        this.downloadSVGBtn = document.getElementById('downloadSVG');
        this.downloadPDFBtn = document.getElementById('downloadPDF');
        this.downloadJPGBtn = document.getElementById('downloadJPG');
    }

    setupEventListeners() {
        // Add null checks for all event listeners
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.generateQRCode());
        }
        if (this.logoInput) {
            this.logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }
        if (this.removeLogoBtn) {
            this.removeLogoBtn.addEventListener('click', () => this.removeLogo());
        }
        
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        const validateAndShowError = () => {
            const validation = this.validateInput();
            if (!validation.isValid) {
                showToast(validation.errorMessage, 'error');
            }
        };

        if (this.qrText) {
            this.qrText.addEventListener('blur', validateAndShowError);
        }
        if (this.textContent) {
            this.textContent.addEventListener('blur', validateAndShowError);
        }
        if (this.contactName) {
            this.contactName.addEventListener('blur', validateAndShowError);
        }
        if (this.contactEmail) {
            this.contactEmail.addEventListener('blur', validateAndShowError);
        }
        if (this.contactPhone) {
            this.contactPhone.addEventListener('blur', validateAndShowError);
        }
        
        if (this.qrColor) {
            this.qrColor.addEventListener('change', () => this.generateQRCode());
        }
        if (this.bgColor) {
            this.bgColor.addEventListener('change', () => this.generateQRCode());
        }
        if (this.errorCorrection) {
            this.errorCorrection.addEventListener('change', () => this.generateQRCode());
        }
        if (this.sizes) {
            this.sizes.addEventListener('change', () => this.generateQRCode());
        }
        // Listen for theme toggle changes
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', () => this.toggleTheme());
        }
        
        // Add event listeners for download buttons
        if (this.downloadPNGBtn) {
            this.downloadPNGBtn.addEventListener('click', () => this.downloadQRCode('png'));
        }
        if (this.downloadSVGBtn) {
            this.downloadSVGBtn.addEventListener('click', () => this.downloadQRCode('svg'));
        }
        if (this.downloadPDFBtn) {
            this.downloadPDFBtn.addEventListener('click', () => this.downloadQRCode('pdf'));
        }
        if (this.downloadJPGBtn) {
            this.downloadJPGBtn.addEventListener('click', () => this.downloadQRCode('jpg'));
        }

        // Add click handler for download dropdown
        this.downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            const dropdown = this.downloadBtn.closest('.dropdown');
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                const dropdowns = document.querySelectorAll('.dropdown');
                dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
            }
        });
    }
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const modeDiv = document.querySelector('.mode'); 
    
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.checked = true;
            modeDiv.textContent = 'Light Mode'; // Show "Light Mode" when in dark mode
        } else {
            document.body.classList.remove('dark-mode');
            modeDiv.textContent = 'Dark Mode'; // Show "Dark Mode" when in light mode

            if (this.themeToggle) {
                this.themeToggle.checked = true;
            }
        }
    }
    
    toggleTheme() {
        const modeDiv = document.querySelector('.mode');
    
        if (this.themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            modeDiv.textContent = 'Light Mode'; // Update to "Light Mode"
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            modeDiv.textContent = 'Dark Mode'; // Update to "Dark Mode"
        }
    }
    

    switchTab(tabName) {
        this.currentTab = tabName;
        
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });
        
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        this.validateInput();
    }

    validateInput() {
        let isValid = false;
        let errorMessage = '';
        
        switch (this.currentTab) {
            case 'url':
                isValid = this.isValidUrl(this.qrText.value);
                errorMessage = 'Please enter a valid URL';
                break;
            case 'text':
                isValid = this.textContent.value.trim().length > 0;
                errorMessage = 'Please enter some text';
                break;
            case 'contact':
                const nameValid = this.contactName.value.trim().length > 0;
                const emailValid = this.isValidEmail(this.contactEmail.value);
                const phoneValid = this.isValidPhone(this.contactPhone.value);
                
                isValid = nameValid && emailValid && phoneValid;
                
                if (!nameValid) errorMessage = 'Please enter a name';
                else if (!emailValid) errorMessage = 'Please enter a valid email';
                else if (!phoneValid) errorMessage = 'Please enter a valid phone number';
                break;
        }
        
        if (this.generateBtn) {
            this.generateBtn.disabled = !isValid;
        }

        return { isValid, errorMessage };
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^[\d\s\-+()]{10,}$/.test(phone);
    }

    async generateQRCode() {
        try {
            // Reset states at the start
            this.resetQRContainer();
            
            const validation = this.validateInput();
            if (!validation.isValid) {
                showToast(validation.errorMessage, 'error');
                return;
            }
    
            this.showLoading(true);
            
            const qrData = this.getQRData();
            const options = {
                width: parseInt(this.sizes.value),
                height: parseInt(this.sizes.value),
                color: {
                    dark: this.qrColor.value,
                    light: this.bgColor.value
                },
                errorCorrectionLevel: this.errorCorrection.value
            };
    
            // Add debouncing to prevent rapid-fire generation
            if (this.generateTimeout) {
                clearTimeout(this.generateTimeout);
            }

            await new Promise(resolve => {
                this.generateTimeout = setTimeout(resolve, 500);
            });

            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, qrData, options);
    
            if (this.logoFile) {
                await this.addLogoToQR(canvas.getContext('2d'), canvas);
            }
    
            const qrId = await this.saveQRCode(qrData, options);
            const shareUrl = `https://quick-qr-nine.vercel.app/share.html?id=${qrId}`;
    
            this.qrContainer.innerHTML = '';
            this.qrContainer.appendChild(canvas);
            this.downloadBtn.disabled = false;
            
            const shareButtons = document.querySelector('.share-buttons');
            if (shareButtons) {
                shareButtons.style.display = 'flex';
            }
            
            this.setupShareButtons(shareUrl);
            showToast('QR Code generated successfully', 'success');
        } catch (error) {
            console.error('QR Code generation error:', error);
            showToast('Failed to generate QR Code', 'error');
            this.resetQRContainer();
        } finally {
            this.showLoading(false);
            // Don't disable the generate button automatically
            if (this.generateBtn) {
                // Re-run validation to set correct button state
                this.validateInput();
            }
        }
    }
    
    // Add new helper method to reset QR container
    resetQRContainer() {
        if (this.qrContainer) {
            this.qrContainer.innerHTML = '';
        }
        if (this.downloadBtn) {
            this.downloadBtn.disabled = true;
        }
        const shareButtons = document.querySelector('.share-buttons');
        if (shareButtons) {
            shareButtons.style.display = 'none';
        }
    }

    setupShareButtons(shareUrl) {
        const shareMessage = "Here is your Quick QR Code!";
        
        // Setup share button click handlers
        document.getElementById('whatsappShare').onclick = () => {
            const whatsappMessage = `${shareMessage}\n\n${shareUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
        };
        
        document.getElementById('twitterShare').onclick = () => {
            const tweetMessage = `${shareMessage}\n\n${shareUrl}\n\n#QuickQR #QRCode #WebTool`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetMessage)}`, '_blank');
        };

        document.getElementById('copyLink').onclick = async () => {
            try {
                await navigator.clipboard.writeText(`\n${shareUrl}`);
                showToast('Link copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }
        };

        // Add login prompt for anonymous users - with duplicate check
        const user = firebase.auth().currentUser;
        if (!user) {
            // Remove any existing login prompts first
            const existingPrompt = document.querySelector('.login-prompt');
            if (existingPrompt) {
                existingPrompt.remove();
            }

            const loginPromptDiv = document.createElement('div');
            loginPromptDiv.className = 'login-prompt';
            loginPromptDiv.innerHTML = `
                <p class="save-prompt">
                    <i class="fas fa-info-circle"></i>
                    Want to access this QR code later? 
                    <a href="#" onclick="toggleLoginModal(true); return false;">Sign in</a>
                    to save it to your collection!
                </p>
            `;
            const shareButtons = document.querySelector('.share-buttons');
            if (shareButtons && shareButtons.nextElementSibling?.className !== 'login-prompt') {
                shareButtons.after(loginPromptDiv);
            }
        }
    }

    async saveQRCode(qrData, options) {
        try {
            const user = firebase.auth().currentUser;
            const currentTime = new Date();
            
            // Check for duplicate generation
            if (this.lastGeneratedData === qrData && 
                this.lastGeneratedTimestamp && 
                (currentTime - this.lastGeneratedTimestamp) < this.duplicatePreventionDelay) {
                console.log('Prevented duplicate QR code generation');
                return this.lastGeneratedId;
            }

            // Check if same content already exists in database
            const existingDocs = await db.collection('qrcodes')
                .where('content', '==', qrData)
                .where('creator', '==', user ? user.displayName : 'anonymous')
                .limit(1)
                .get();

            if (!existingDocs.empty) {
                const existingDoc = existingDocs.docs[0];
                console.log('Found existing QR code');
                return existingDoc.id;
            }

            // If no duplicate found, create new document
            const docData = {
                content: qrData,
                options: options,
                createdAt: currentTime,
                creator: user ? user.displayName : 'anonymous',
                userUid: user ? user.uid : null,
                userEmail: user ? user.email : null,
                // Add hash of content for faster duplicate checking
                contentHash: await this.hashContent(qrData)
            };

            const doc = await db.collection('qrcodes').add(docData);
            
            // Update last generated info
            this.lastGeneratedData = qrData;
            this.lastGeneratedTimestamp = currentTime;
            this.lastGeneratedId = doc.id;

            return doc.id;
        } catch (error) {
            console.error('Error saving QR code:', error);
            throw error;
        }
    }

    // Helper method to create a hash of the content
    async hashContent(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getQRData() {
        switch (this.currentTab) {
            case 'url':
                return this.qrText.value;
            case 'text':
                return this.textContent.value;
            case 'contact':
                return this.generateVCard();
            default:
                return '';
        }
    }

    generateVCard() {
        return `BEGIN:VCARD
VERSION:3.0
FN:${this.contactName.value}
TEL:${this.contactPhone.value}
EMAIL:${this.contactEmail.value}
END:VCARD`;
    }

    async addLogoToQR(ctx, canvas) {
        return new Promise((resolve, reject) => {
            const logo = new Image();
            logo.onload = () => {
                const logoSize = canvas.width * 0.2;
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;
                
                ctx.fillStyle = 'white';
                ctx.fillRect(x, y, logoSize, logoSize);
                
                ctx.drawImage(logo, x, y, logoSize, logoSize);
                resolve();
            };
            logo.onerror = reject;
            logo.src = URL.createObjectURL(this.logoFile);
        });
    }

    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please upload an image file', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            this.showToast('Logo file size should be less than 2MB', 'error');
            return;
        }

        this.logoFile = file;
        this.removeLogoBtn.style.display = 'inline-block';
        await this.generateQRCode();
    }

    removeLogo() {
        this.logoFile = null;
        this.logoInput.value = '';
        this.removeLogoBtn.style.display = 'none';
        this.generateQRCode();
    }

    async downloadQRCode(format = 'png') {
        const canvas = this.qrContainer.querySelector('canvas');
        if (!canvas) return;

        try {
            switch (format) {
                case 'png':
                    this.downloadPNG(canvas);
                    break;
                case 'jpg':
                    this.downloadJPG(canvas);
                    break;
                case 'svg':
                    await this.downloadSVG();
                    break;
                case 'pdf':
                    await this.downloadPDF(canvas);
                    break;
            }
            showToast(`QR Code downloaded as ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            showToast('Failed to download QR Code', 'error');
        }
    }

    downloadPNG(canvas) {
        const link = document.createElement('a');
        link.download = 'QR_Code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    downloadJPG(canvas) {
        // Create a new canvas with white background
        const jpgCanvas = document.createElement('canvas');
        jpgCanvas.width = canvas.width;
        jpgCanvas.height = canvas.height;
        const ctx = jpgCanvas.getContext('2d');

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);

        // Draw original QR code on top
        ctx.drawImage(canvas, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = 'QR_Code.jpg';
        link.href = jpgCanvas.toDataURL('image/jpeg', 0.8); // 0.8 is the quality (0-1)
        link.click();
    }

    async downloadSVG() {
        const qrData = this.getQRData();
        const options = {
            errorCorrectionLevel: this.errorCorrection.value,
            margin: 1,
            color: {
                dark: this.qrColor.value,
                light: this.bgColor.value
            }
        };

        // Generate SVG string
        const svgString = await QRCode.toString(qrData, {
            ...options,
            type: 'svg'
        });

        // Create blob and download
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'QR_Code.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    async downloadPDF(canvas) {
        // Load jsPDF dynamically
        if (!window.jspdf) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Add QR code to PDF
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const qrSize = Math.min(pdfWidth, pdfHeight) * 0.8;
        const x = (pdfWidth - qrSize) / 2;
        const y = (pdfHeight - qrSize) / 2;

        pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);
        pdf.save('QR_Code.pdf');
    }

    showLoading(show) {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = show ? 'block' : 'none';
        }
        if (this.generateBtn) {
            this.generateBtn.disabled = show;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle');
        const mobileThemeBtn = document.getElementById('mobile-theme-toggle');
        const buttons = [themeBtn, mobileThemeBtn];

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            buttons.forEach(btn => {
                if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>';
            });
        }

        buttons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    document.body.classList.toggle('dark-mode');
                    const isDark = document.body.classList.contains('dark-mode');
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                    const icon = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-lightbulb"></i>';
                    buttons.forEach(b => {
                        if (b) b.innerHTML = icon;
                    });
                });
            }
        });
    }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize QR Generator only once
    if (!qrGenerator) {
        qrGenerator = new QRCodeGenerator();
    }
    
    // Initialize scroll button
    const scrollBtn = document.getElementById('scrollToTopBtn');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Initialize auth elements and event listeners
    initializeAuthElements();
});

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDiB5PASY-WkkoufspwfJOttq4YDnSqsdI",
    authDomain: "qr-usermanagement.firebaseapp.com",
    projectId: "qr-usermanagement",
    storageBucket: "qr-usermanagement.firebasestorage.app",
    messagingSenderId: "927684182758",
    appId: "1:927684182758:web:28bd9c27307003cfa97127"
};

// Initialize Firebase and expose db globally
let db;
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// Separate auth initialization
function initializeAuthElements() {
    // Authentication Elements
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeBtns = document.querySelectorAll('.close');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const manageQRModal = document.getElementById('manageQRModal');
    const manageQRBtn = document.getElementById('manageQRBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    function toggleLoginModal(show) {
        loginModal.style.display = show ? "block" : "none";
    }

    function toggleDropdownMenu(show) {
        dropdownMenu.style.display = show ? "block" : "none";
    }

    function toggleManageQRModal(show) {
        manageQRModal.style.display = show ? "block" : "none";
    }

    // Show/Hide Modals
    loginBtn.onclick = () => toggleLoginModal(true);
    closeBtns.forEach(btn => btn.onclick = () => {
        toggleLoginModal(false);
        toggleManageQRModal(false);
    });
    window.onclick = (event) => {
        if (event.target === loginModal) {
            toggleLoginModal(false);
        }
        if (event.target === manageQRModal) {
            toggleManageQRModal(false);
        }
    }

    // Google Authentication
    googleLoginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                showToast('Successfully logged in!', 'success');
                toggleLoginModal(false);
                updateUIForLoggedInUser(result.user);
            })
            .catch((error) => {
                showToast('Login failed: ' + error.message, 'error');
            });
    });

    // Auth State Observer
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            updateUIForLoggedInUser(user);
            showToast(`Welcome back, ${user.displayName}!`, 'success'); // Add welcome message
            
            // Replace login prompt with success message if it exists
            const loginPrompt = document.querySelector('.login-prompt');
            if (loginPrompt) {
                loginPrompt.innerHTML = `
                    <p class="save-prompt">
                        <i class="fas fa-check-circle"></i>
                        QR code has been saved to your collection successfully!
                    </p>
                `;
                loginPrompt.classList.add('success-prompt');
                setTimeout(() => {
                    loginPrompt.remove();
                }, 5000);
            }
            
            // Update ownership of anonymous QR codes
            updateAnonymousQRCodes(user);
        } else {
            updateUIForLoggedOutUser();
        }
    });

    // Add this new function to update anonymous QR codes
    async function updateAnonymousQRCodes(user) {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const anonymousQRs = await db.collection('qrcodes')
                .where('creator', '==', 'anonymous')
                .where('createdAt', '>', fiveMinutesAgo)
                .get();

            const batch = db.batch();
            anonymousQRs.forEach((doc) => {
                batch.update(doc.ref, {
                    creator: user.displayName,
                    userUid: user.uid,
                    userEmail: user.email,
                    updatedAt: new Date()
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error updating anonymous QR codes:', error);
        }
    }

    function updateUIForLoggedInUser(user) {
        loginBtn.innerHTML = `
            <img src="${user.photoURL}" alt="Profile" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px;">
            ${user.displayName}
        `;
        loginBtn.onclick = (event) => {
            event.stopPropagation(); // Prevent the document click event
            const user = firebase.auth().currentUser;
            if (user) {
                // Toggle dropdown
                dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
            } else {
                toggleLoginModal(true);
            }
        };
        logoutBtn.onclick = () => {
            firebase.auth().signOut()
                .then(() => {
                    showToast('Logged out successfully!', 'error');
                    updateUIForLoggedOutUser();
                })
                .catch(error => showToast('Logout failed: ' + error.message, 'error'));
        };
        manageQRBtn.onclick = () => {
            toggleManageQRModal(true);
            loadUserQRCodes();
        };
    }

    function updateUIForLoggedOutUser() {
        loginBtn.innerHTML = '<i class="fas fa-user"></i> Login';
        loginBtn.onclick = () => toggleLoginModal(true);
        toggleDropdownMenu(false);
    }

    function getQRTypeAndContent(qrData) {
        if (qrData.startsWith('BEGIN:VCARD')) {
            const name = qrData.match(/FN:(.*)/)?.[1] || 'Unknown';
            return { type: 'Contact', content: `Contact: ${name}` };
        } else if (qrData.startsWith('http')) {
            return { type: 'URL', content: qrData };
        } else {
            return { type: 'Text', content: qrData.substring(0, 50) + (qrData.length > 50 ? '...' : '') };
        }
    }

    async function loadUserQRCodes() {
        const qrList = document.getElementById('qrList');
        const user = firebase.auth().currentUser;
        
        if (!user) return;

        try {
            const snapshot = await db.collection('qrcodes')
                .where('userUid', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get();

            qrList.innerHTML = '';

            if (snapshot.empty) {
                qrList.innerHTML = '<div class="no-qr-message">No QR codes found.</div>';
                return;
            }

            // Create table structure
            const table = document.createElement('table');
            table.className = 'qr-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="sno">S.No</th>
                        <th class="type">Type</th>
                        <th>Details</th>
                        <th class="actions">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            let counter = 1;
            snapshot.forEach(doc => {
                const data = doc.data();
                const { type, content } = getQRTypeAndContent(data.content);
                const shareUrl = `https://quick-qr-nine.vercel.app/share.html?id=${doc.id}`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="sno">${counter}</td>
                    <td class="type">
                        <a href="${shareUrl}" target="_blank">
                            ${type} QR
                        </a>
                    </td>
                    <td class="details">${content}</td>
                    <td class="actions">
                        <div class="action-buttons">
                            <button class="action-btn copy-btn" onclick="copyShareLink('${shareUrl}')" title="Copy Link">
                                <i class="fas fa-link"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteQRCode('${doc.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                table.querySelector('tbody').appendChild(row);
                counter++;
            });

            qrList.appendChild(table);
        } catch (error) {
            console.error('Error loading QR codes:', error);
            qrList.innerHTML = '<div class="no-qr-message">Error loading QR codes.</div>';
        }
    }

    async function deleteQRCode(docId) {
        if (!confirm('Are you sure you want to delete this QR code?')) return;

        try {
            await db.collection('qrcodes').doc(docId).delete();
            showToast('QR code deleted successfully', 'success');
            loadUserQRCodes(); // Reload the list
        } catch (error) {
            console.error('Error deleting QR code:', error);
            showToast('Error deleting QR code', 'error');
        }
    }

    function copyShareLink(url) {
        navigator.clipboard.writeText(url)
            .then(() => showToast('Share link copied to clipboard!', 'success'))
            .catch(() => showToast('Failed to copy link', 'error'));
    }

    // Export functions that need to be globally available
    window.toggleLoginModal = toggleLoginModal;
    window.toggleDropdownMenu = toggleDropdownMenu;
    window.toggleManageQRModal = toggleManageQRModal;
    window.deleteQRCode = deleteQRCode;
    window.copyShareLink = copyShareLink;

    // Update the event listeners for the dropdown
    document.addEventListener('click', (event) => {
        const dropdownMenu = document.getElementById('dropdownMenu');
        const loginBtn = document.getElementById('loginBtn');
        
        // Close dropdown if clicking outside of it and the login button
        if (!dropdownMenu.contains(event.target) && !loginBtn.contains(event.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
}

// Add this to your existing script.js file

// Sidebar functionality
const hamburgerMenu = document.querySelector('.hamburger-menu');
const sidebar = document.querySelector('.sidebar');
const sidebarClose = document.querySelector('.sidebar-close');
const sidebarOverlay = document.querySelector('.sidebar-overlay');
const mainContent = document.querySelector('.main-content');

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    mainContent.classList.toggle('sidebar-active');
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    mainContent.classList.remove('sidebar-active');
}

hamburgerMenu.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar when clicking a link (optional)
const sidebarLinks = document.querySelectorAll('.sidebar-link');
sidebarLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
});

// Close sidebar on window resize if it's open (optional)
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
        closeSidebar();
    }
});

// Add this after the existing sidebar code
function initializeSidebarLinks() {
    // Get all sidebar elements
    const sidebarLogin = document.getElementById('sidebar-login');
    const sidebarSignup = document.getElementById('sidebar-signup');
    const sidebarManage = document.getElementById('sidebar-manage');
    const sidebarLogout = document.getElementById('sidebar-logout');
    const authItems = document.querySelectorAll('.sidebar-auth-item');

    // Login click handler
    sidebarLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
        toggleLoginModal(true);
    });

    // Signup click handler
    sidebarSignup.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
        signUpModal.style.display = "block";
    });

    // Manage QR codes handler
    sidebarManage.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
        toggleManageQRModal(true);
        loadUserQRCodes();
    });

    // Logout handler
    sidebarLogout.addEventListener('click', (e) => {
        e.preventDefault();
        firebase.auth().signOut()
            .then(() => {
                showToast('Logged out successfully!', 'success');
                updateSidebarForLoggedOutUser();
                closeSidebar();
            })
            .catch(error => showToast('Logout failed: ' + error.message, 'error'));
    });

    // Update sidebar based on auth state
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            updateSidebarForLoggedInUser(user);
        } else {
            updateSidebarForLoggedOutUser();
        }
    });
}

function updateSidebarForLoggedInUser(user) {
    // Hide login/signup, show manage/logout
    document.getElementById('sidebar-login').style.display = 'none';
    document.getElementById('sidebar-signup').style.display = 'none';
    
    // Show authenticated items
    document.querySelectorAll('.sidebar-auth-item').forEach(item => {
        item.style.display = 'flex';
    });

    // Add user info to sidebar if you want
    const sidebarHeader = document.querySelector('.sidebar-header');
    const existingUserInfo = document.querySelector('.sidebar-user-info');
    
    if (!existingUserInfo) {
        const userInfo = document.createElement('div');
        userInfo.className = 'sidebar-user-info';
        userInfo.innerHTML = `
            <img src="${user.photoURL}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%;">
            <span>${user.displayName}</span>
        `;
        sidebarHeader.appendChild(userInfo);
    }
}

function updateSidebarForLoggedOutUser() {
    // Show login/signup, hide manage/logout
    document.getElementById('sidebar-login').style.display = 'flex';
    document.getElementById('sidebar-signup').style.display = 'flex';
    
    // Hide authenticated items
    document.querySelectorAll('.sidebar-auth-item').forEach(item => {
        item.style.display = 'none';
    });

    // Remove user info if exists
    const userInfo = document.querySelector('.sidebar-user-info');
    if (userInfo) {
        userInfo.remove();
    }
}

// Add this to your document ready function or main initialization
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    initializeSidebarLinks();
});
