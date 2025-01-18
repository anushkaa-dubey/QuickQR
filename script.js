// Enhanced toast function
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
        toast.style.display = 'none';
        setTimeout(() => showToastMessage(), 100);
    } else {
        showToastMessage();
    }
    
    function showToastMessage() {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        toast.style.opacity = '1';

        toast.hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3000);
    }
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
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
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
            shareButtons.style.display = 'flex';
            
            this.setupShareButtons(shareUrl);
            showToast('QR Code generated successfully', 'success');
        } catch (error) {
            console.error('QR Code generation error:', error);
            showToast('Failed to generate QR Code', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    setupShareButtons(shareUrl) {
        const shareMessage = "Here is your Quick QR Code!";
        
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

        // Add login prompt for anonymous users
        const user = firebase.auth().currentUser;
        if (!user) {
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
            document.querySelector('.share-buttons').after(loginPromptDiv);
        }
    }

    async saveQRCode(qrData, options) {
        try {
            const user = firebase.auth().currentUser;
            const docData = {
                content: qrData,
                options: options,
                createdAt: new Date(),
                creator: user ? user.displayName : 'anonymous',
                userUid: user ? user.uid : null,
                userEmail: user ? user.email : null
            };

            const doc = await db.collection('qrcodes').add(docData);
            return doc.id;
        } catch (error) {
            console.error('Error saving QR code:', error);
            throw error;
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
const db = firebase.firestore();

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
            // Reload the page to update ownership of anonymous QR codes
            location.reload();
        })
        .catch((error) => {
            showToast('Login failed: ' + error.message, 'error');
        });
});

// Auth State Observer
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        updateUIForLoggedInUser(user);
        // Replace login prompt with success message if it exists
        const loginPrompt = document.querySelector('.login-prompt');
        if (loginPrompt) {
            loginPrompt.innerHTML = `
                <p class="save-prompt">
                    <i class="fas fa-check-circle"></i>
                    QR code has been saved into your collection successfully!
                </p>
            `;
            loginPrompt.classList.add('success-prompt');
            // Increased duration to 10 seconds
            setTimeout(() => {
                loginPrompt.remove();
            }, 10000);
        }
        // Update ownership of any anonymous QR codes created in this session
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
    loginBtn.onclick = () => toggleDropdownMenu(true);
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