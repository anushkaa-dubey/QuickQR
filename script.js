function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

class QRCodeGenerator {
    constructor() {
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
        // Set default logo
        this.defaultLogo = new Image();
        this.defaultLogo.src = 'images/logo.png';
    }

    setupEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateQRCode());
        this.downloadBtn.addEventListener('click', () => this.downloadQRCode());
        this.logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        this.removeLogoBtn.addEventListener('click', () => this.removeLogo());
        
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        this.qrText.addEventListener('input', () => this.validateInput());
        this.textContent.addEventListener('input', () => this.validateInput());
        this.contactName.addEventListener('input', () => this.validateInput());
        this.contactPhone.addEventListener('input', () => this.validateInput());
        this.contactEmail.addEventListener('input', () => this.validateInput());
        
        this.qrColor.addEventListener('change', () => this.generateQRCode());
        this.bgColor.addEventListener('change', () => this.generateQRCode());
        this.errorCorrection.addEventListener('change', () => this.generateQRCode());
        this.sizes.addEventListener('change', () => this.generateQRCode());
        // Listen for theme toggle changes
        this.themeToggle.addEventListener('change', () => this.toggleTheme());
    }
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.checked = true;
        }
    }

    toggleTheme() {
        if (this.themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
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
        
        switch (this.currentTab) {
            case 'url':
                isValid = this.isValidUrl(this.qrText.value);
                break;
            case 'text':
                isValid = this.textContent.value.trim().length > 0;
                break;
            case 'contact':
                isValid = this.contactName.value.trim().length > 0 &&
                         this.isValidEmail(this.contactEmail.value) &&
                         this.isValidPhone(this.contactPhone.value);
                break;
        }
        
        this.generateBtn.disabled = !isValid;
        return isValid;
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
        if (!this.validateInput()) {
            this.showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const qrData = this.getQRData();
            const canvas = document.createElement('canvas');
            const size = parseInt(this.sizes.value);
            
            canvas.width = size;
            canvas.height = size;
            
            await QRCode.toCanvas(canvas, qrData, {
                width: size,
                height: size,
                color: {
                    dark: this.qrColor.value,
                    light: this.bgColor.value
                },
                errorCorrectionLevel: this.errorCorrection.value
            });

            const ctx = canvas.getContext('2d');
            
            if (this.logoFile) {
                await this.addLogoToQR(ctx, canvas);
            } else {
                await this.addDefaultLogoToQR(ctx, canvas);
            }

            this.qrContainer.innerHTML = '';
            this.qrContainer.appendChild(canvas);
            
            this.downloadBtn.disabled = false;
            this.showToast('QR Code generated successfully', 'success');
        } catch (error) {
            console.error('QR Code generation error:', error);
            this.showToast('Failed to generate QR Code', 'error');
        } finally {
            this.showLoading(false);
        }
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

    async addDefaultLogoToQR(ctx, canvas) {
        return new Promise((resolve, reject) => {
            this.defaultLogo.onload = () => {
                const logoSize = canvas.width * 0.2;
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;
                
                ctx.fillStyle = 'white';
                ctx.fillRect(x, y, logoSize, logoSize);
                
                ctx.drawImage(this.defaultLogo, x, y, logoSize, logoSize);
                resolve();
            };
            this.defaultLogo.onerror = reject;
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

    downloadQRCode() {
        const canvas = this.qrContainer.querySelector('canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = 'QR_Code.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
        this.generateBtn.disabled = show;
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
}

document.addEventListener('DOMContentLoaded', () => {
    new QRCodeGenerator();
});

const scrollBtn = document.getElementById('scrollToTopBtn');

// Show button on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
        scrollBtn.classList.add('show');
    } else {
        scrollBtn.classList.remove('show');
    }
});

// Scroll to top functionality
scrollBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

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
    } else {
        updateUIForLoggedOutUser();
    }
});

function updateUIForLoggedInUser(user) {
    loginBtn.innerHTML = `
        <img src="${user.photoURL}" alt="Profile" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px;">
        ${user.displayName}
    `;
    loginBtn.onclick = () => toggleDropdownMenu(true);
    logoutBtn.onclick = () => {
        firebase.auth().signOut()
            .then(() => {
                showToast('Logged out successfully!', 'error');
                updateUIForLoggedOutUser();
            })
            .catch(error => showToast('Logout failed: ' + error.message, 'error'));
    };
    manageQRBtn.onclick = () => toggleManageQRModal(true);
}

function updateUIForLoggedOutUser() {
    loginBtn.innerHTML = '<i class="fas fa-user"></i> Login';
    loginBtn.onclick = () => toggleLoginModal(true);
    toggleDropdownMenu(false);
}
