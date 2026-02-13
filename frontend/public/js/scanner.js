// Barcode and QR Code Scanner

let html5QrCode = null;
let scannerActive = false;
let lastScannedProduct = null;

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
                fps: 12,
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    let qrboxSize = Math.floor(minEdgeSize * 0.9);
                    return {
                        width: qrboxSize,
                        height: Math.floor(qrboxSize * 0.45)  // Wider box for barcodes
                    };
                },
                aspectRatio: 1.777778,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
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
                resultDiv.innerHTML = '<p style="text-align: center; color: var(--primary); font-weight: bold;">📷 Point camera at barcode...<br><small>No need to keep it inside the box — just keep it visible.</small></p>';
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
        
        // Prefer per-serving nutrition if available, fall back to per-100g
        const perServing = data.nutritional_info_per_serving;
        const per100g = data.nutritional_info;
        const usePerServing = perServing && Object.values(perServing).some(v => v !== null && v !== undefined);
        const src = usePerServing ? perServing : per100g;

        const normalizedNutritionInfo = {
            energy_kcal: src?.energy_kcal ?? 0,
            proteins: src?.proteins ?? 0,
            carbohydrates: src?.carbohydrates ?? 0,
            fat: src?.fat ?? 0,
            saturated_fat: src?.saturated_fat ?? 0,
            trans_fat: src?.trans_fat ?? 0,
            cholesterol: src?.cholesterol ?? 0,
            sodium: src?.sodium ?? 0,
            fiber: src?.fiber ?? 0,
            sugars: src?.sugars ?? 0,
            added_sugars: src?.added_sugars ?? 0,
            vitamin_d: src?.vitamin_d ?? 0,
            calcium: src?.calcium ?? 0,
            iron: src?.iron ?? 0,
            potassium: src?.potassium ?? 0,
            salt: src?.salt ?? 0,
            serving_size: data.serving_size || data.nutritional_info?.serving_size || null,
            servings_per_item: data.servings_per_container ?? 1,
            _source: usePerServing ? 'per_serving' : 'per_100g'
        };

        lastScannedProduct = {
            barcode,
            name: data.name,
            nutritionalInfo: normalizedNutritionInfo,
            serving_size: data.serving_size || null,
            servings_per_container: data.servings_per_container || null,
            container_type: data.container_type || null,
            categories_tags: data.categories_tags || []
        };

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
                    <button class="btn btn-primary" data-action="add-pantry">
                        Add to Pantry
                    </button>
                    <button class="btn btn-secondary" data-action="scan-again">
                        Scan Another
                    </button>
                    <button class="btn btn-secondary" data-action="close-scanner">
                        Close
                    </button>
                </div>
            </div>
        `;

        const addButton = resultDiv.querySelector('[data-action="add-pantry"]');
        const scanAgainButton = resultDiv.querySelector('[data-action="scan-again"]');
        const closeButton = resultDiv.querySelector('[data-action="close-scanner"]');

        if (addButton) {
            addButton.addEventListener('click', () => {
                if (lastScannedProduct) {
                    addScannedProduct(lastScannedProduct.barcode, lastScannedProduct.name, lastScannedProduct.nutritionalInfo);
                }
            });
        }
        scanAgainButton?.addEventListener('click', () => initScanner());
        closeButton?.addEventListener('click', () => closeScanner());
        
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
                nutritional_info: nutritionalInfo,
                serving_size: lastScannedProduct?.serving_size || null,
                servings_per_container: lastScannedProduct?.servings_per_container || null,
                container_type: lastScannedProduct?.container_type || null
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

// ==================== NUTRITION LABEL SCANNER ====================

let nutritionScannerStream = null;
let nutritionAutoScanInterval = null;
let nutritionScannerTarget = 'pantry'; // 'pantry' or 'recipe'
let nutritionScannerResolve = null;
let nutritionScannerReject = null;

/**
 * Read a File object as a base64-encoded data URL string.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Open the nutrition label scanner modal with live camera.
 * @param {'pantry'|'recipe'} target - which form to populate
 */
function openNutritionScanner(target) {
    return new Promise((resolve, reject) => {
        nutritionScannerTarget = target || 'pantry';
        nutritionScannerResolve = resolve;
        nutritionScannerReject = reject;

        const modal = document.getElementById('nutritionScannerModal');
        const statusDiv = document.getElementById('nutritionScannerStatus');
        statusDiv.innerHTML = '<p>Starting camera...</p>';
        modal.classList.add('active');

        startNutritionCamera();
    });
}

async function startNutritionCamera() {
    const video = document.getElementById('nutritionScannerVideo');
    const statusDiv = document.getElementById('nutritionScannerStatus');

    try {
        // Request back camera
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 960 }
            }
        };

        nutritionScannerStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = nutritionScannerStream;
        await video.play();

        statusDiv.innerHTML = '<p>📷 Point camera at a nutrition label — auto-detecting...</p>';

        // Start auto-scan every 4 seconds
        startNutritionAutoScan();
    } catch (err) {
        console.error('Camera access failed:', err);
        // Fall back to front camera
        try {
            nutritionScannerStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
            });
            video.srcObject = nutritionScannerStream;
            await video.play();
            statusDiv.innerHTML = '<p>📷 Using front camera — point at nutrition label...</p>';
            startNutritionAutoScan();
        } catch (err2) {
            console.error('All camera access failed:', err2);
            statusDiv.innerHTML = '<p class="error-message">Camera not available. Use "Upload from Library" instead.</p>';
        }
    }
}

function startNutritionAutoScan() {
    // Clear any existing interval
    if (nutritionAutoScanInterval) clearInterval(nutritionAutoScanInterval);

    let scanning = false;

    nutritionAutoScanInterval = setInterval(async () => {
        if (scanning) return; // Skip if previous scan still running
        scanning = true;
        try {
            const imageData = captureNutritionFrame();
            if (!imageData) { scanning = false; return; }

            const result = await api.scanNutritionLabel(imageData);
            if (result.nutrition) {
                const n = result.nutrition;
                // Check if we got meaningful data (at least calories)
                if (n.energy_kcal !== null && n.energy_kcal !== undefined) {
                    // Auto-detected! Stop scanning and populate
                    stopNutritionAutoScan();
                    const statusDiv = document.getElementById('nutritionScannerStatus');
                    statusDiv.innerHTML = '<p style="color: var(--success); font-weight: bold;">✅ Nutrition label detected!</p>';

                    handleNutritionScanResult(n);
                    return;
                }
            }
        } catch (err) {
            // Silent — auto-scan failures are expected
            console.log('Auto-scan attempt:', err.message || err);
        }
        scanning = false;
    }, 4000);
}

function stopNutritionAutoScan() {
    if (nutritionAutoScanInterval) {
        clearInterval(nutritionAutoScanInterval);
        nutritionAutoScanInterval = null;
    }
}

function captureNutritionFrame() {
    const video = document.getElementById('nutritionScannerVideo');
    const canvas = document.getElementById('nutritionScannerCanvas');
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
}

async function manualCaptureNutrition() {
    const statusDiv = document.getElementById('nutritionScannerStatus');
    const captureBtn = document.getElementById('captureNutritionBtn');

    const imageData = captureNutritionFrame();
    if (!imageData) {
        statusDiv.innerHTML = '<p class="error-message">Camera not ready. Try again.</p>';
        return;
    }

    // Stop auto-scan while processing
    stopNutritionAutoScan();
    captureBtn.disabled = true;
    captureBtn.textContent = 'Processing...';
    statusDiv.innerHTML = '<p>🔍 Reading nutrition label...</p>';

    try {
        const result = await api.scanNutritionLabel(imageData);

        if (result.error && !result.nutrition) {
            throw new Error(result.error);
        }

        const nutrition = result.nutrition || {};
        if (nutrition.energy_kcal !== null && nutrition.energy_kcal !== undefined) {
            statusDiv.innerHTML = '<p style="color: var(--success); font-weight: bold;">✅ Nutrition label detected!</p>';
            handleNutritionScanResult(nutrition);
        } else {
            statusDiv.innerHTML = '<p class="error-message">Could not read nutrition data. Try moving closer or improving lighting.</p>';
            // Restart auto-scan
            startNutritionAutoScan();
        }
    } catch (err) {
        console.error('Manual capture failed:', err);
        statusDiv.innerHTML = `<p class="error-message">Scan failed: ${err.message || err}. Try again.</p>`;
        startNutritionAutoScan();
    } finally {
        captureBtn.disabled = false;
        captureBtn.textContent = '📸 Capture Label';
    }
}

async function uploadNutritionFromLibrary() {
    const input = document.getElementById('nutritionLibraryInput');
    input.click();
}

async function handleNutritionLibraryUpload(file) {
    if (!file) return;

    const statusDiv = document.getElementById('nutritionScannerStatus');
    const captureBtn = document.getElementById('captureNutritionBtn');
    stopNutritionAutoScan();
    captureBtn.disabled = true;
    statusDiv.innerHTML = '<p>🔍 Reading nutrition label from image...</p>';

    try {
        const imageData = await fileToBase64(file);
        const result = await api.scanNutritionLabel(imageData);

        if (result.error && !result.nutrition) {
            throw new Error(result.error);
        }

        const nutrition = result.nutrition || {};
        if (nutrition.energy_kcal !== null && nutrition.energy_kcal !== undefined) {
            statusDiv.innerHTML = '<p style="color: var(--success); font-weight: bold;">✅ Nutrition label detected!</p>';
            handleNutritionScanResult(nutrition);
        } else {
            statusDiv.innerHTML = '<p class="error-message">Could not read nutrition data from image. Try a clearer photo.</p>';
            startNutritionAutoScan();
        }
    } catch (err) {
        console.error('Library upload scan failed:', err);
        statusDiv.innerHTML = `<p class="error-message">Scan failed: ${err.message || err}</p>`;
        startNutritionAutoScan();
    } finally {
        captureBtn.disabled = false;
    }
}

function handleNutritionScanResult(nutrition) {
    if (nutritionScannerTarget === 'recipe') {
        populateRecipeNutritionFields(nutrition);
    } else {
        populatePantryNutritionFields(nutrition);
    }

    // Close scanner after short delay so user sees the success message
    setTimeout(() => {
        closeNutritionScanner();
        if (nutritionScannerResolve) {
            nutritionScannerResolve(nutrition);
            nutritionScannerResolve = null;
            nutritionScannerReject = null;
        }
    }, 800);
}

function closeNutritionScanner() {
    stopNutritionAutoScan();

    // Stop camera stream
    if (nutritionScannerStream) {
        nutritionScannerStream.getTracks().forEach(track => track.stop());
        nutritionScannerStream = null;
    }
    const video = document.getElementById('nutritionScannerVideo');
    if (video) video.srcObject = null;

    const modal = document.getElementById('nutritionScannerModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Open nutrition scanner for PANTRY form.
 */
function initNutritionLabelScanner() {
    return openNutritionScanner('pantry');
}

/**
 * Open nutrition scanner for RECIPE form.
 */
function initNutritionLabelScannerForRecipe() {
    return openNutritionScanner('recipe');
}

// Set up nutrition scanner modal listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close button
    const modal = document.getElementById('nutritionScannerModal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeNutritionScanner();
                if (nutritionScannerReject) {
                    nutritionScannerReject(new Error('Cancelled'));
                    nutritionScannerResolve = null;
                    nutritionScannerReject = null;
                }
            });
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeNutritionScanner();
                if (nutritionScannerReject) {
                    nutritionScannerReject(new Error('Cancelled'));
                    nutritionScannerResolve = null;
                    nutritionScannerReject = null;
                }
            }
        });
    }

    // Capture button
    document.getElementById('captureNutritionBtn')?.addEventListener('click', () => {
        manualCaptureNutrition();
    });

    // Upload from library button
    document.getElementById('uploadNutritionLibraryBtn')?.addEventListener('click', () => {
        uploadNutritionFromLibrary();
    });

    // Library file input change
    document.getElementById('nutritionLibraryInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleNutritionLibraryUpload(file);
        e.target.value = ''; // Reset so same file can be selected again
    });
});

/**
 * Given a parsed nutrition object from the backend, fill in the
 * corresponding form fields inside the pantry item modal.
 */
function populatePantryNutritionFields(nutrition) {
    if (!nutrition) return;

    const fieldMap = {
        energy_kcal:           'pantryCalories',
        proteins:              'pantryProtein',
        carbohydrates:         'pantryCarbs',
        fat:                   'pantryFat',
        saturated_fat:         'pantrySatFat',
        cholesterol:           'pantryCholesterol',
        sodium:                'pantrySodium',
        fiber:                 'pantryFiber',
        sugars:                'pantrySugars',
        serving_size:          'pantryServingSize',
        servings_per_container: 'pantryServingsPerContainer',
    };

    for (const [key, elementId] of Object.entries(fieldMap)) {
        const value = nutrition[key];
        if (value !== null && value !== undefined) {
            const el = document.getElementById(elementId);
            if (el) {
                el.value = value;
            }
        }
    }
}

function populateRecipeNutritionFields(nutrition) {
    if (!nutrition) return;
    const fieldMap = {
        energy_kcal:    'recipeCalories',
        proteins:       'recipeProtein',
        carbohydrates:  'recipeCarbs',
        fat:            'recipeFat',
        saturated_fat:  'recipeSatFat',
        trans_fat:      'recipeTransFat',
        cholesterol:    'recipeCholesterol',
        sodium:         'recipeSodium',
        fiber:          'recipeFiber',
        sugars:         'recipeSugars',
        added_sugars:   'recipeAddedSugars',
        vitamin_d:      'recipeVitaminD',
        calcium:        'recipeCalcium',
        iron:           'recipeIron',
        potassium:      'recipePotassium',
        serving_size:   'recipeNutritionServingSize',
    };
    for (const [key, elementId] of Object.entries(fieldMap)) {
        const value = nutrition[key];
        if (value !== null && value !== undefined) {
            const el = document.getElementById(elementId);
            if (el) el.value = value;
        }
    }
}

// Export functions for use in other scripts
window.initScanner = initScanner;
window.stopScanner = stopScanner;
window.closeScanner = closeScanner;
window.initNutritionLabelScanner = initNutritionLabelScanner;
window.initNutritionLabelScannerForRecipe = initNutritionLabelScannerForRecipe;
