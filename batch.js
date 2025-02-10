class BatchQRGenerator {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.currentQRIndex = 0;
        this.totalQRs = 0;
        this.setupThemeToggle(); // Add this line
    }

    initializeElements() {
        this.batchInput = document.getElementById('batchInput');
        this.batchSize = document.getElementById('batchSize');
        this.generateBatchBtn = document.getElementById('generateBatchBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.qrGrid = document.getElementById('qrGrid');
    }

    setupEventListeners() {
        this.generateBatchBtn.addEventListener('click', () => this.generateBatchQR());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllQRCodes());
    }

    async generateBatchQR() {
        // Remove existing navigation elements first
        const existingNav = this.qrGrid.parentElement.querySelectorAll('.scroll-nav, .qr-counter');
        existingNav.forEach(el => el.remove());
        
        // Clear previous QR codes
        this.qrGrid.innerHTML = '';
        this.currentQRIndex = 0;
        
        // Add navigation buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'scroll-nav scroll-prev hidden';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'scroll-nav scroll-next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        
        // Add counter
        const counter = document.createElement('div');
        counter.className = 'qr-counter';
        
        this.qrGrid.parentElement.appendChild(prevBtn);
        this.qrGrid.parentElement.appendChild(nextBtn);
        this.qrGrid.parentElement.appendChild(counter);

        // Remove any existing event listeners
        this.cleanupEventListeners();
        
        // Get input lines
        const lines = this.batchInput.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            this.showToast('Please enter at least one line of text', 'error');
            return;
        }

        this.totalQRs = lines.length;
        this.updateCounter();
        this.downloadAllBtn.disabled = false;

        // Generate QR codes
        for (const [index, line] of lines.entries()) {
            await this.generateSingleQR(line, index === 0);
        }

        // Setup scroll navigation
        this.setupScrollNavigation();
        
        this.showToast('All QR codes generated successfully', 'success');
    }

    async generateSingleQR(text, isActive = false) {
        const qrItem = document.createElement('div');
        qrItem.className = `qr-item ${isActive ? 'active' : ''}`;

        // Create canvas for QR code
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, text, {
            width: parseInt(this.batchSize.value),
            height: parseInt(this.batchSize.value)
        });

        // Add text preview
        const textPreview = document.createElement('div');
        textPreview.className = 'qr-item-text';
        textPreview.textContent = text.length > 50 ? text.substring(0, 47) + '...' : text;

        // Add action buttons
        const actions = document.createElement('div');
        actions.className = 'qr-item-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Download QR';
        downloadBtn.onclick = () => this.downloadSingleQR(canvas, text);

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy Text';
        copyBtn.onclick = () => this.copyText(text);

        actions.appendChild(downloadBtn);
        actions.appendChild(copyBtn);

        // Assemble QR item
        qrItem.appendChild(canvas);
        qrItem.appendChild(textPreview);
        qrItem.appendChild(actions);

        this.qrGrid.appendChild(qrItem);
    }

    navigateQR(index) {
        const items = this.qrGrid.querySelectorAll('.qr-item');
        items.forEach((item, i) => {
            // Calculate the position for each item
            let position = i - index;
            item.style.transform = `translateX(${position * 100}%)`;
            item.style.opacity = Math.abs(position) <= 1 ? '1' : '0'; // Fade out non-visible items
            item.classList.toggle('active', i === index);
        });
        this.currentQRIndex = index;
        this.setupScrollNavigation();
    }

    setupScrollNavigation() {
        const container = this.qrGrid;
        const prevBtn = container.parentElement.querySelector('.scroll-prev');
        const nextBtn = container.parentElement.querySelector('.scroll-next');

        // Store keyboard listener reference so we can remove it later
        this.keyboardListener = (e) => {
            if (e.key === 'ArrowLeft' && !prevBtn.classList.contains('hidden')) {
                prevBtn.click();
            } else if (e.key === 'ArrowRight' && !nextBtn.classList.contains('hidden')) {
                nextBtn.click();
            }
        };

        // Remove any existing listener before adding new one
        document.removeEventListener('keydown', this.keyboardListener);
        document.addEventListener('keydown', this.keyboardListener);

        const updateNavigation = () => {
            // Show/hide navigation buttons based on current position
            prevBtn.classList.toggle('hidden', this.currentQRIndex === 0);
            nextBtn.classList.toggle('hidden', this.currentQRIndex === this.totalQRs - 1);
            
            // Update counter with current position
            this.updateCounter();
            
            // Update the transform of all items to ensure proper positioning
            const items = this.qrGrid.querySelectorAll('.qr-item');
            items.forEach((item, i) => {
                let position = i - this.currentQRIndex;
                item.style.transform = `translateX(${position * 100}%)`;
                item.style.opacity = Math.abs(position) <= 1 ? '1' : '0';
            });
        };

        // Update the click handlers for navigation buttons
        prevBtn.onclick = () => {
            if (this.currentQRIndex > 0) {
                this.navigateQR(this.currentQRIndex - 1);
            }
        };

        nextBtn.onclick = () => {
            if (this.currentQRIndex < this.totalQRs - 1) {
                this.navigateQR(this.currentQRIndex + 1);
            }
        };

        updateNavigation();
    }

    updateCounter() {
        const counter = this.qrGrid.parentElement.querySelector('.qr-counter');
        if (counter) {
            counter.textContent = `${this.currentQRIndex + 1} / ${this.totalQRs}`;
        }
    }

    downloadSingleQR(canvas, text) {
        const link = document.createElement('a');
        link.download = `QR_${text.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async downloadAllQRCodes() {
        try {
            // Load JSZip if not already loaded
            if (typeof JSZip === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const zip = new JSZip();
            const canvases = this.qrGrid.getElementsByTagName('canvas');
            const texts = this.qrGrid.getElementsByClassName('qr-item-text');

            // Show loading state
            this.downloadAllBtn.disabled = true;
            this.downloadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

            // Process each QR code
            for (let i = 0; i < canvases.length; i++) {
                const canvas = canvases[i];
                const text = texts[i].textContent;
                const filename = `QR_${(i + 1).toString().padStart(3, '0')}_${text.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.png`;
                
                // Convert canvas to blob with better error handling
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/png', 1.0);
                });
                
                if (blob) {
                    zip.file(filename, blob);
                }
            }

            // Generate and download zip file
            const content = await zip.generateAsync({ 
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });

            // Create and trigger download
            const link = document.createElement('a');
            link.download = `batch_qr_codes_${new Date().getTime()}.zip`;
            link.href = URL.createObjectURL(content);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Reset button state
            this.downloadAllBtn.disabled = false;
            this.downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download All';
            
            this.showToast('All QR codes downloaded successfully', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Failed to download QR codes', 'error');
            this.downloadAllBtn.disabled = false;
            this.downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download All';
        }
    }

    copyText(text) {
        navigator.clipboard.writeText(text)
            .then(() => this.showToast('Text copied to clipboard', 'success'))
            .catch(() => this.showToast('Failed to copy text', 'error'));
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Add new method to clean up event listeners
    cleanupEventListeners() {
        // Remove existing keyboard event listeners
        if (this.keyboardListener) {
            document.removeEventListener('keydown', this.keyboardListener);
        }
    }

    // Add cleanup method to be called when instance is destroyed
    destroy() {
        this.cleanupEventListeners();
    }

    // Add new method for theme toggle
    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle');
        const icon = themeBtn.querySelector('i');
        
        // Check saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            icon.classList.remove('fa-lightbulb');
            icon.classList.add('fa-moon');
        }

        // Theme toggle click handler
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            icon.classList.toggle('fa-lightbulb');
            icon.classList.toggle('fa-moon');
            
            // Save theme preference
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

// Initialize when DOM is loaded
let batchGeneratorInstance = null;
document.addEventListener('DOMContentLoaded', () => {
    // Cleanup existing instance if it exists
    if (batchGeneratorInstance) {
        batchGeneratorInstance.destroy();
    }
    batchGeneratorInstance = new BatchQRGenerator();
});
