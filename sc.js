const qrText = document.getElementById('qr-text');
const qrWidth = document.getElementById('qr-width');
const qrHeight = document.getElementById('qr-height');
const errorCorrectionLevel = document.getElementById('error-correction');
const fgColor = document.getElementById('fg-color');
const bgColor = document.getElementById('bg-color');
const fgColorBtn = document.getElementById('fg-color-btn');
const bgColorBtn = document.getElementById('bg-color-btn');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const qrContainer = document.getElementById('qr-code');
const batchInput = document.getElementById('batch-input');
const batchQrWidth = document.getElementById('batch-qr-width');
const batchQrHeight = document.getElementById('batch-qr-height');
const batchGenerateBtn = document.getElementById('batchGenerateBtn');
const batchDownloadBtn = document.getElementById('batchDownloadBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const batchFgColor = document.getElementById('batch-fg-color');
const batchBgColor = document.getElementById('batch-bg-color');
const batchFgColorBtn = document.getElementById('batch-fg-color-btn');
const batchBgColorBtn = document.getElementById('batch-bg-color-btn');
const charCount = document.getElementById('char-count');

let qrCode;

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const updateColorBtn = (colorBtn, colorInput) => {
    colorBtn.style.backgroundColor = colorInput.value;
};

const generateQRCode = debounce(() => {
    const text = qrText.value.trim();
    const width = parseInt(qrWidth.value);
    const height = parseInt(qrHeight.value);
    const errorLevel = errorCorrectionLevel.value;

    if (text.length === 0) {
        qrContainer.innerHTML = '<p style="color: white;">Enter text to generate QR code</p>';
        return;
    }

    qrContainer.innerHTML = '';
    qrCode = new QRCode(qrContainer, {
        text: text,
        width: width,
        height: height,
        colorDark: fgColor.value,
        colorLight: bgColor.value,
        correctLevel: QRCode.CorrectLevel[errorLevel]
    });

    setTimeout(() => {
        const img = qrContainer.querySelector('img');
        if (img) {
            img.style.width = `${width}px`;
            img.style.height = `${height}px`;
        }
    }, 50);
});

const generateBatchQRCodes = () => {
    const texts = batchInput.value.trim().split('\n').filter(text => text.trim() !== '');
    const width = parseInt(batchQrWidth.value);
    const height = parseInt(batchQrHeight.value);

    if (texts.length === 0) {
        qrContainer.innerHTML = '<p style="color: white;">Enter at least one text or URL for batch processing</p>';
        return;
    }

    qrContainer.innerHTML = '';
    texts.forEach((text, index) => {
        const qrWrapper = document.createElement('div');
        qrWrapper.className = 'qr-wrapper';
        qrWrapper.innerHTML = `<p style="color: white; text-align: center; margin-bottom: 5px;">${index + 1}. ${text}</p>`;
        qrContainer.appendChild(qrWrapper);

        new QRCode(qrWrapper, {
            text: text,
            width: width,
            height: height,
            colorDark: batchFgColor.value,
            colorLight: batchBgColor.value,
            correctLevel: QRCode.CorrectLevel.H
        });
    });
};

const downloadBatchQRCodes = async () => {
    const zip = new JSZip();
    const qrImages = qrContainer.querySelectorAll('img');

    if (qrImages.length === 0) {
        alert('No QR codes to download. Generate batch QR codes first.');
        return;
    }

    qrImages.forEach((img, index) => {
        const imgData = img.src.split(',')[1];
        zip.file(`qr_code_${index + 1}.png`, imgData, {base64: true});
    });

    const content = await zip.generateAsync({type: 'blob'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'qr_codes.zip';
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
};

const updateCharCount = () => {
    const count = qrText.value.length;
    charCount.textContent = count;
    charCount.style.color = count > 2950 ? 'red' : 'inherit';
};

qrText.addEventListener('input', generateQRCode);
qrWidth.addEventListener('input', generateQRCode);
qrHeight.addEventListener('input', generateQRCode);
errorCorrectionLevel.addEventListener('change', generateQRCode);

fgColor.addEventListener('input', () => {
    updateColorBtn(fgColorBtn, fgColor);
    generateQRCode();
});

bgColor.addEventListener('input', () => {
    updateColorBtn(bgColorBtn, bgColor);
    generateQRCode();
});

fgColorBtn.addEventListener('click', () => fgColor.click());
bgColorBtn.addEventListener('click', () => bgColor.click());

generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    generateQRCode();
});

downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const img = qrContainer.querySelector('img');
    if (img) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'qr-code.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

batchGenerateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    generateBatchQRCodes();
});

batchDownloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    downloadBatchQRCodes();
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + '-qr').classList.add('active');
    });
});

updateColorBtn(fgColorBtn, fgColor);
updateColorBtn(bgColorBtn, bgColor);

batchFgColor.addEventListener('input', () => {
    updateColorBtn(batchFgColorBtn, batchFgColor);
});

batchBgColor.addEventListener('input', () => {
    updateColorBtn(batchBgColorBtn, batchBgColor);
});

batchFgColorBtn.addEventListener('click', () => batchFgColor.click());
batchBgColorBtn.addEventListener('click', () => batchBgColor.click());

qrText.addEventListener('input', updateCharCount);

updateColorBtn(batchFgColorBtn, batchFgColor);
updateColorBtn(batchBgColorBtn, batchBgColor);

if (qrText.value.trim().length > 0) {
    generateQRCode();
}

updateCharCount();