const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;

// ======== SETTING BLUR ========
const blur = 15; // <== GANTI ANGKA INI (5, 15, 25, 35, 55)
// ==============================

let faceDetector = null;
let lastTime = 0;

// Inisialisasi MediaPipe Face Detector
async function initFaceDetector() {
    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
    );
    
    faceDetector = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        },
        numFaces: 1,
        runningMode: 'VIDEO'
    });
    
    startCamera();
}

// Mulai kamera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            detectFrame();
        };
    } catch (err) {
        console.error('Kamera error:', err);
        alert('Izin kamera ditolak!');
    }
}

// Deteksi wajah & blur background
function detectFrame() {
    if (!faceDetector) {
        requestAnimationFrame(detectFrame);
        return;
    }

    const now = performance.now();
    const results = faceDetector.detectForVideo(video, now);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Gambar frame dari video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Ambil gambar dari canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Buat mask (area wajah)
    const mask = new Uint8Array(canvas.width * canvas.height);
    
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        let xMin = canvas.width, xMax = 0;
        let yMin = canvas.height, yMax = 0;
        
        for (const lm of landmarks) {
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
        }
        
        xMin = Math.max(0, xMin - 20);
        yMin = Math.max(0, yMin - 20);
        xMax = Math.min(canvas.width, xMax + 20);
        yMax = Math.min(canvas.height, yMax + 20);
        
        for (let y = yMin; y < yMax; y++) {
            for (let x = xMin; x < xMax; x++) {
                const idx = y * canvas.width + x;
                mask[idx] = 255;
            }
        }
    }
    
    // Terapkan blur
    const blurSize = blur % 2 === 0 ? blur + 1 : blur;
    const tempData = new Uint8ClampedArray(data);
    
    // Simplified blur (kernel kecil)
    const half = Math.floor(blurSize / 2);
    
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const maskIdx = y * canvas.width + x;
            
            if (mask[maskIdx] === 255) {
                // Area wajah - tetap jelas
                continue;
            }
            
            // Area background - blur
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                        const nIdx = (ny * canvas.width + nx) * 4;
                        r += tempData[nIdx];
                        g += tempData[nIdx + 1];
                        b += tempData[nIdx + 2];
                        a += tempData[nIdx + 3];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
                data[idx + 3] = a / count;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    requestAnimationFrame(detectFrame);
}

// Jalankan
initFaceDetector();

// Keyboard shortcut: Q untuk keluar (refresh page)
document.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') {
        location.reload();
    }
});
