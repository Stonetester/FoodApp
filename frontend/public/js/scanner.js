// Barcode and QR Code Scanner

let html5QrCode = null;
let scannerActive = false;

document.addEventListener('DOMContentLoaded', () => {
    setupScannerListeners();
});

function setupScannerListeners() {
    // Close scanner modal
    const scannerModal = document.getElementById('scannerModal');
    if (scannerModal) {
        const closeBtn = scannerModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                stopScanner();
                scannerModal.classList.remove('active');
            });
        }

        scannerModal.addEventListener('click', (e) => {
            if (e.target === scannerModal) {
                stopScanner();
                scannerModal.classList.remove('active');
            }
        });
    }
}

function initScanner() {
    const container = document.getElementById('scannerContainer');
    const resultDiv = document.getElementById('scannerResult');
    
    if (!container) {
        console.error('Scanner container not found');
        return;
    }

    // Clear previous scanner state
    container.innerHTML = '';
    resultDiv.innerHTML = '<p style="text-align: center; color: var(--primary);">Initializing camera...</p>';

    // Stop any existing scanner
    if (html5QrCode && scannerActive) {
        stopScanner().then(() => {
            startScanner();
        }).catch(() => {
            startScanner();
        });
    } else {
        startScanner();
    }
}

function startScanner() {
    const container = document.getElementById('scannerContainer');
    const resultDiv = document.getElementById('scannerResult');
    
    // Wait a bit for modal to be fully visible
    setTimeout(() => {
        try {
            html5QrCode = new Html5Qrcode("scannerContainer");
            
            // Enhanced config for better barcode detection
            const config = {
                fps: 10,
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    let qrboxSize = Math.floor(minEdgeSize * 0.7);
                    return {
                        width: qrboxSize,
                        height: Math.floor(qrboxSize * 0.6)  // Wider box for barcodes
                    };
                },
                aspectRatio: 1.777778,
                // Specify barcode formats to improve detection
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            };

            // Try to start with back camera first
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            ).then(() => {
                scannerActive = true;
                resultDiv.innerHTML = '<p style="text-align: center; color: var(--primary); font-weight: bold;">📷 Point camera at barcode...<br><small>Hold steady for best results</small></p>';
                console.log('Scanner started successfully with back camera');
            }).catch(err => {
                console.error('Error starting scanner with back camera:', err);
                // Fallback to any available camera
                html5QrCode.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    onScanError
                ).then(() => {
                    scannerActive = true;
                    resultDiv.innerHTML = '<p style="text-align: center; color: var(--primary); font-weight: bold;">📷 Point camera at barcode...<br><small>Using front camera</small></p>';
                    console.log('Scanner started successfully with front camera');
                }).catch(err2 => {
                    console.error('Error starting scanner:', err2);
                    resultDiv.innerHTML = `<p class="error-message">Failed to start camera: ${err2}<br><br>Please make sure:<br>1. Camera permissions are allowed<br>2. Using HTTPS or localhost<br>3. No other app is using the camera<br>4. Try refreshing the page</p>`;
                });
            });
        } catch (error) {
            console.error('Error initializing scanner:', error);
            resultDiv.innerHTML = `<p class="error-message">Error initializing scanner: ${error}<br><br>Please refresh the page and try again.</p>`;
        }
    }, 300);
}

function onScanSuccess(decodedText, decodedResult) {
    console.log(`Barcode scanned: ${decodedText}`, decodedResult);
    
    // Show success message
    const resultDiv = document.getElementById('scannerResult');
    resultDiv.innerHTML = `
        <div style="text-align: center; color: var(--success);">
            <p style="font-size: 1.2em; font-weight: bold;">✅ Barcode Scanned!</p>
            <p style="font-family: monospace; background: var(--surface); padding: 0.5rem; border-radius: 4px;">${decodedText}</p>
            <p style="color: var(--text); margin-top: 1rem;">Looking up product information...</p>
        </div>
    `;
    
    // Stop scanner after successful scan
    stopScanner();
    
    // Lookup barcode and add to pantry
    lookupAndAddProduct(decodedText);
}

function onScanError(errorMessage) {
    // Silent - we expect many errors while scanning
    // Only log if it's not the common "No MultiFormat Readers" error
    if (!errorMessage.includes('No MultiFormat')) {
        console.log('Scan error:', errorMessage);
    }
}

async function stopScanner() {
    if (html5QrCode && scannerActive) {
        try {
            await html5QrCode.stop();
            scannerActive = false;
            console.log('Scanner stopped');
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
    }
}

async function lookupAndAddProduct(barcode) {
    const resultDiv = document.getElementById('scannerResult');
    
    try {
        const response = await fetch('/api/pantry/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ barcode })
        });
        
        if (!response.ok) {
            throw new Error('Failed to lookup product');
        }
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `
                <div class="error-message">
                    <p><strong>❌ Product Not Found</strong></p>
                    <p>Barcode: <code>${barcode}</code></p>
                    <p>${data.error}</p>
                    <button class="btn btn-primary" onclick="closeScanner()">Close</button>
                    <button class="btn btn-secondary" onclick="initScanner()">Scan Another</button>
                </div>
            `;
            return;
        }
        
        // Show product info
        resultDiv.innerHTML = `
            <div style="text-align: center;">
                <p style="font-size: 1.2em; font-weight: bold; color: var(--success);">✅ Product Found!</p>
                ${data.image_url ? `<img src="${data.image_url}" alt="${data.name}" style="max-width: 200px; max-height: 200px; margin: 1rem auto; display: block; border-radius: 8px;">` : ''}
                <h3 style="color: var(--primary); margin: 1rem 0;">${data.name}</h3>
                ${data.brand ? `<p style="color: var(--text-secondary);">${data.brand}</p>` : ''}
                ${data.quantity ? `<p style="color: var(--text-secondary);">${data.quantity}</p>` : ''}
                
                <div style="margin-top: 1.5rem; text-align: left; background: var(--surface); padding: 1rem; border-radius: 8px;">
                    <h4>Add to Pantry:</h4>
                    <div class="form-group">
                        <label for="scanQuantity">Quantity</label>
                        <input type="number" id="scanQuantity" value="1" min="0.1" step="0.1">
                    </div>
                    <div class="form-group">
                        <label for="scanUnit">Unit</label>
                        <input type="text" id="scanUnit" value="item" placeholder="e.g., item, oz, g">
                    </div>
                    <div class="form-group">
                        <label for="scanExpiry">Expiry Date (optional)</label>
                        <input type="date" id="scanExpiry">
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="addScannedProduct('${barcode}', '${escapeHtml(data.name)}', ${JSON.stringify(data.nutritional_info)})">
                        Add to Pantry
                    </button>
                    <button class="btn btn-secondary" onclick="initScanner()">
                        Scan Another
                    </button>
                    <button class="btn btn-secondary" onclick="closeScanner()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error looking up barcode:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <p><strong>❌ Error</strong></p>
                <p>Failed to lookup product information.</p>
                <p>Barcode: <code>${barcode}</code></p>
                <button class="btn btn-primary" onclick="closeScanner()">Close</button>
                <button class="btn btn-secondary" onclick="initScanner()">Try Again</button>
            </div>
        `;
    }
}

async function addScannedProduct(barcode, name, nutritionalInfo) {
    const quantity = parseFloat(document.getElementById('scanQuantity').value) || 1;
    const unit = document.getElementById('scanUnit').value || 'item';
    const expiry = document.getElementById('scanExpiry').value || null;
    
    const resultDiv = document.getElementById('scannerResult');
    resultDiv.innerHTML = '<p style="text-align: center; color: var(--primary);">Adding to pantry...</p>';
    
    try {
        const response = await fetch('/api/pantry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_name: name,
                barcode: barcode,
                quantity: quantity,
                unit: unit,
                expiry_date: expiry,
                nutritional_info: nutritionalInfo
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add item');
        }
        
        resultDiv.innerHTML = `
            <div style="text-align: center; color: var(--success);">
                <p style="font-size: 1.5em;">✅</p>
                <p style="font-size: 1.2em; font-weight: bold;">Added to Pantry!</p>
                <p style="margin-top: 1rem;">${name}</p>
                <p style="color: var(--text-secondary);">${quantity} ${unit}</p>
                
                <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="closeScanner(); if(typeof loadPantry === 'function') loadPantry();">
                        View Pantry
                    </button>
                    <button class="btn btn-secondary" onclick="initScanner()">
                        Scan Another
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error adding item to pantry:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <p><strong>❌ Error</strong></p>
                <p>Failed to add item to pantry.</p>
                <button class="btn btn-primary" onclick="closeScanner()">Close</button>
                <button class="btn btn-secondary" onclick="initScanner()">Try Again</button>
            </div>
        `;
    }
}

function closeScanner() {
    stopScanner();
    const modal = document.getElementById('scannerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for use in other scripts
window.initScanner = initScanner;
window.stopScanner = stopScanner;
window.closeScanner = closeScanner;