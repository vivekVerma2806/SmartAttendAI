/*vivek kumar verma i make this project this is very beautiful but it identify the systematic version  ============================================
   SMART ATTENDANCE SYSTEM — CORE ML LOGIC
   Face Detection, Recognition & Attendance
   Uses face-api.js (TensorFlow.js based)
   Multi-Photo Registration (5 captures)
   File Upload + PDF Report Download
   ============================================ */

// ===== CONFIGURATION =====
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
const MATCH_THRESHOLD = 0.55;
const REQUIRED_CAPTURES = 5;
const STORAGE_KEYS = {
  students: 'smartattend_students',
  attendance: 'smartattend_attendance'
};

// ===== STATE =====
let modelsLoaded = false;
let registerStream = null;
let attendanceStream = null;

// Multi-capture state
let capturedDescriptors = [];
let capturedImages = [];
let captureCount = 0;

// ===== DOM ELEMENTS =====
const $ = id => document.getElementById(id);

// Loading
const loadingOverlay = $('loadingOverlay');
const progressFill = $('progressFill');
const progressText = $('progressText');
const modelStatus = $('modelStatus');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Register
const registerVideo = $('registerVideo');
const registerOverlay = $('registerOverlay');
const registerPlaceholder = $('registerPlaceholder');
const btnStartRegisterCam = $('btnStartRegisterCam');
const btnCaptureFace = $('btnCaptureFace');
const capturedPreview = $('capturedPreview');
const studentName = $('studentName');
const studentId = $('studentId');
const btnRegister = $('btnRegister');
const registeredCount = $('registeredCount');
const registeredList = $('registeredList');
const captureProgress = $('captureProgress');
const captureProgressFill = $('captureProgressFill');
const captureCountText = $('captureCountText');
const captureGallery = $('captureGallery');
const fileUploadInput = $('fileUploadInput');

// Attendance
const attendanceVideo = $('attendanceVideo');
const attendanceOverlay = $('attendanceOverlay');
const attendancePlaceholder = $('attendancePlaceholder');
const btnStartAttendanceCam = $('btnStartAttendanceCam');
const btnMarkAttendance = $('btnMarkAttendance');
const resultCard = $('resultCard');
const todayDate = $('todayDate');
const todayList = $('todayList');

// Records
const filterDate = $('filterDate');
const filterStudent = $('filterStudent');
const btnShowAll = $('btnShowAll');
const btnDownloadPDF = $('btnDownloadPDF');
const btnClearRecords = $('btnClearRecords');
const recordsBody = $('recordsBody');

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  setTodayDate();
  updateRegisteredList();
  updateTodayAttendance();
  resetCaptureState();
  populateStudentFilter();
  await loadModels();
});

// ===== LOAD FACE-API MODELS =====
async function loadModels() {
  try {
    updateProgress(10, 'Loading SSD MobileNet...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    updateProgress(40, 'Loading Face Landmarks...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    updateProgress(70, 'Loading Face Recognition...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    updateProgress(100, 'All models loaded!');
    modelsLoaded = true;

    const dot = modelStatus.querySelector('.status-dot');
    const label = modelStatus.querySelector('.status-label');
    dot.classList.remove('loading');
    label.textContent = 'AI Models Ready';

    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 600);

    showToast('AI models loaded successfully!', 'success');
  } catch (error) {
    console.error('Model loading error:', error);
    const dot = modelStatus.querySelector('.status-dot');
    const label = modelStatus.querySelector('.status-label');
    dot.classList.remove('loading');
    dot.classList.add('error');
    label.textContent = 'Model Load Failed';

    updateProgress(0, 'Error loading models');
    showToast('Failed to load AI models. Please refresh the page.', 'error');
  }
}

function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text || (percent + '%');
}

// ===== TAB NAVIGATION =====
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');

      const panelId = 'panel' + tabId.charAt(0).toUpperCase() + tabId.slice(1);
      const panel = $(panelId);
      if (panel) panel.classList.add('active');

      if (tabId !== 'register') stopCamera('register');
      if (tabId !== 'attendance') stopCamera('attendance');

      if (tabId === 'records') {
        populateStudentFilter();
        renderRecords();
      }
      if (tabId === 'attendance') updateTodayAttendance();
    });
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Register tab
  btnStartRegisterCam.addEventListener('click', () => startCamera('register'));
  btnCaptureFace.addEventListener('click', captureFace);
  btnRegister.addEventListener('click', registerStudent);

  // Reset captures
  const btnResetCaptures = $('btnResetCaptures');
  if (btnResetCaptures) {
    btnResetCaptures.addEventListener('click', () => {
      resetCaptureState();
      showToast('Captures reset. Start again.', 'info');
    });
  }

  // File upload
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', handleFileUpload);
  }

  // Attendance tab
  btnStartAttendanceCam.addEventListener('click', () => startCamera('attendance'));
  btnMarkAttendance.addEventListener('click', markAttendance);

  // Records tab
  filterDate.addEventListener('change', () => renderRecords(filterDate.value, filterStudent.value));
  filterStudent.addEventListener('change', () => renderRecords(filterDate.value, filterStudent.value));
  btnShowAll.addEventListener('click', () => {
    filterDate.value = '';
    filterStudent.value = '';
    renderRecords();
  });
  btnDownloadPDF.addEventListener('click', downloadPDFReport);
  btnClearRecords.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear ALL attendance records?')) {
      localStorage.removeItem(STORAGE_KEYS.attendance);
      renderRecords();
      updateTodayAttendance();
      showToast('All records cleared.', 'info');
    }
  });
}

// ===== MULTI-CAPTURE STATE MANAGEMENT =====
function resetCaptureState() {
  capturedDescriptors = [];
  capturedImages = [];
  captureCount = 0;
  updateCaptureUI();
  btnRegister.disabled = true;

  if (capturedPreview) {
    capturedPreview.innerHTML = `
      <div class="preview-placeholder">
        <span>👤</span>
        <p>Capture 5 face photos</p>
      </div>`;
  }

  if (captureGallery) {
    captureGallery.innerHTML = '';
  }

  // Reset file input
  if (fileUploadInput) {
    fileUploadInput.value = '';
  }
}

function updateCaptureUI() {
  const pct = (captureCount / REQUIRED_CAPTURES) * 100;

  if (captureProgressFill) {
    captureProgressFill.style.width = pct + '%';
  }

  if (captureCountText) {
    captureCountText.textContent = `${captureCount} / ${REQUIRED_CAPTURES} captured`;
  }

  if (btnCaptureFace && !btnCaptureFace.disabled) {
    if (captureCount >= REQUIRED_CAPTURES) {
      btnCaptureFace.innerHTML = '<span>✅</span> All 5 Captured!';
      btnCaptureFace.disabled = true;
    } else {
      btnCaptureFace.innerHTML = `<span>📸</span> Capture ${captureCount + 1} of ${REQUIRED_CAPTURES}`;
    }
  }

  if (captureCount >= REQUIRED_CAPTURES) {
    btnRegister.disabled = false;
  }
}

// ===== FILE UPLOAD HANDLER =====
async function handleFileUpload(event) {
  if (!modelsLoaded) {
    showToast('Please wait for AI models to finish loading.', 'error');
    fileUploadInput.value = '';
    return;
  }

  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  const remaining = REQUIRED_CAPTURES - captureCount;
  if (remaining <= 0) {
    showToast('Already captured 5 photos. Reset to start over.', 'error');
    fileUploadInput.value = '';
    return;
  }

  const filesToProcess = files.slice(0, remaining);
  showToast(`Processing ${filesToProcess.length} image(s)...`, 'info');

  let successCount = 0;

  for (const file of filesToProcess) {
    try {
      const imageData = await readFileAsDataURL(file);
      const img = await loadImage(imageData);

      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        showToast(`No face found in "${file.name}". Skipped.`, 'error');
        continue;
      }

      // Store descriptor
      capturedDescriptors.push(Array.from(detection.descriptor));

      // Crop face for preview
      const box = detection.detection.box;
      const padding = 40;
      const cropCanvas = document.createElement('canvas');
      const cropSize = Math.max(box.width, box.height) + padding * 2;
      cropCanvas.width = 200;
      cropCanvas.height = 200;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(
        img,
        box.x - padding, box.y - padding, cropSize, cropSize,
        0, 0, 200, 200
      );

      const croppedImage = cropCanvas.toDataURL('image/jpeg', 0.7);
      capturedImages.push(croppedImage);

      captureCount++;
      successCount++;

      // Show latest in preview
      capturedPreview.innerHTML = `<img src="${croppedImage}" alt="Capture ${captureCount}" />`;

      updateCaptureGallery();
      updateCaptureUI();
    } catch (err) {
      console.error('Error processing file:', file.name, err);
      showToast(`Error processing "${file.name}".`, 'error');
    }
  }

  if (successCount > 0) {
    if (captureCount >= REQUIRED_CAPTURES) {
      showToast(`✅ All ${REQUIRED_CAPTURES} photos ready! Enter name and register.`, 'success');
    } else {
      showToast(`📸 ${successCount} photo(s) added. ${REQUIRED_CAPTURES - captureCount} more needed.`, 'info');
    }
  }

  // Reset file input for re-use
  fileUploadInput.value = '';
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ===== CAMERA MANAGEMENT =====
async function startCamera(mode) {
  if (!modelsLoaded) {
    showToast('Please wait for AI models to finish loading.', 'error');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });

    if (mode === 'register') {
      registerVideo.srcObject = stream;
      registerVideo.classList.add('active');
      registerPlaceholder.classList.add('hidden');
      registerStream = stream;
      btnCaptureFace.disabled = false;
      updateCaptureUI();
      btnStartRegisterCam.textContent = '🎥 Camera Running';
      btnStartRegisterCam.disabled = true;
      startFaceDetectionLoop(registerVideo, registerOverlay);
    } else {
      attendanceVideo.srcObject = stream;
      attendanceVideo.classList.add('active');
      attendancePlaceholder.classList.add('hidden');
      attendanceStream = stream;
      btnMarkAttendance.disabled = false;
      btnStartAttendanceCam.textContent = '🎥 Camera Running';
      btnStartAttendanceCam.disabled = true;
      startFaceDetectionLoop(attendanceVideo, attendanceOverlay);
    }

    showToast('Camera started successfully!', 'success');
  } catch (error) {
    console.error('Camera error:', error);
    showToast('Could not access camera. Please allow camera permissions.', 'error');
  }
}

function stopCamera(mode) {
  if (mode === 'register' && registerStream) {
    registerStream.getTracks().forEach(t => t.stop());
    registerStream = null;
    registerVideo.classList.remove('active');
    registerPlaceholder.classList.remove('hidden');
    btnCaptureFace.disabled = true;
    btnStartRegisterCam.innerHTML = '<span>🎥</span> Start Camera';
    btnStartRegisterCam.disabled = false;
  }
  if (mode === 'attendance' && attendanceStream) {
    attendanceStream.getTracks().forEach(t => t.stop());
    attendanceStream = null;
    attendanceVideo.classList.remove('active');
    attendancePlaceholder.classList.remove('hidden');
    btnMarkAttendance.disabled = true;
    btnStartAttendanceCam.innerHTML = '<span>🎥</span> Start Camera';
    btnStartAttendanceCam.disabled = false;
  }
}

// ===== LIVE FACE DETECTION OVERLAY =====
function startFaceDetectionLoop(video, canvas) {
  const ctx = canvas.getContext('2d');

  async function detect() {
    if (!video.srcObject || video.paused || video.ended) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(det => {
      const box = det.detection.box;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const cornerLen = 15;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(box.x, box.y + cornerLen);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + cornerLen, box.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerLen, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + cornerLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - cornerLen);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + cornerLen, box.y + box.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
      ctx.stroke();
    });

    requestAnimationFrame(detect);
  }

  video.addEventListener('playing', () => {
    requestAnimationFrame(detect);
  });

  if (!video.paused) {
    requestAnimationFrame(detect);
  }
}

// ===== CAPTURE FACE (WEBCAM - MULTI-PHOTO) =====
async function captureFace() {
  if (!registerStream) return;
  if (captureCount >= REQUIRED_CAPTURES) return;

  btnCaptureFace.disabled = true;
  btnCaptureFace.innerHTML = '<span>⏳</span> Analyzing...';

  try {
    const detection = await faceapi
      .detectSingleFace(registerVideo)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      showToast('No face detected. Please face the camera clearly.', 'error');
      btnCaptureFace.disabled = false;
      updateCaptureUI();
      return;
    }

    capturedDescriptors.push(Array.from(detection.descriptor));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = registerVideo.videoWidth;
    tempCanvas.height = registerVideo.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(registerVideo, 0, 0);

    const box = detection.detection.box;
    const padding = 40;
    const cropCanvas = document.createElement('canvas');
    const cropSize = Math.max(box.width, box.height) + padding * 2;
    cropCanvas.width = 200;
    cropCanvas.height = 200;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(
      tempCanvas,
      box.x - padding, box.y - padding, cropSize, cropSize,
      0, 0, 200, 200
    );

    const imageData = cropCanvas.toDataURL('image/jpeg', 0.7);
    capturedImages.push(imageData);

    captureCount++;

    updateCaptureGallery();
    updateCaptureUI();

    capturedPreview.innerHTML = `<img src="${imageData}" alt="Capture ${captureCount}" />`;

    if (captureCount >= REQUIRED_CAPTURES) {
      showToast(`✅ All ${REQUIRED_CAPTURES} photos captured! Enter name and register.`, 'success');
    } else {
      showToast(`📸 Photo ${captureCount}/${REQUIRED_CAPTURES} captured. ${REQUIRED_CAPTURES - captureCount} more needed.`, 'info');
      setTimeout(() => {
        btnCaptureFace.disabled = false;
        updateCaptureUI();
      }, 800);
      return;
    }
  } catch (error) {
    console.error('Capture error:', error);
    showToast('Error capturing face. Please try again.', 'error');
  }

  btnCaptureFace.disabled = captureCount >= REQUIRED_CAPTURES;
  updateCaptureUI();
}

function updateCaptureGallery() {
  if (!captureGallery) return;

  captureGallery.innerHTML = capturedImages.map((img, i) => `
    <div class="gallery-thumb">
      <img src="${img}" alt="Capture ${i + 1}" />
      <span class="thumb-label">${i + 1}</span>
    </div>
  `).join('');
}

// ===== REGISTER STUDENT =====
function registerStudent() {
  const name = studentName.value.trim();
  const id = studentId.value.trim() || 'ID-' + Date.now().toString(36).toUpperCase();

  if (!name) {
    showToast('Please enter a student name.', 'error');
    return;
  }

  if (capturedDescriptors.length < REQUIRED_CAPTURES) {
    showToast(`Please capture all ${REQUIRED_CAPTURES} face photos first.`, 'error');
    return;
  }

  const students = getStudents();

  if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('A student with this name is already registered.', 'error');
    return;
  }

  students.push({
    name: name,
    id: id,
    descriptors: capturedDescriptors,
    image: capturedImages[0],
    images: capturedImages,
    photoCount: capturedDescriptors.length,
    registeredAt: new Date().toISOString()
  });

  saveStudents(students);

  studentName.value = '';
  studentId.value = '';
  resetCaptureState();

  updateRegisteredList();
  populateStudentFilter();
  showToast(`✅ ${name} registered with ${REQUIRED_CAPTURES} face photos!`, 'success');
}

// ===== MARK ATTENDANCE (MULTI-FACE) =====
async function markAttendance() {
  if (!attendanceStream) return;

  const students = getStudents();
  if (students.length === 0) {
    showToast('No students registered. Please register students first.', 'error');
    return;
  }

  btnMarkAttendance.disabled = true;
  btnMarkAttendance.innerHTML = '<span>⏳</span> Scanning...';

  resultCard.className = 'result-card';
  resultCard.innerHTML = `
    <div class="result-placeholder">
      <div class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto 16px;"></div>
      <h3>Scanning all faces...</h3>
      <p>Detecting multiple faces & matching against ${students.length} student(s)...</p>
    </div>`;

  try {
    // Detect ALL faces in the frame
    const detections = await faceapi
      .detectAllFaces(attendanceVideo)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      resultCard.className = 'result-card result-fail';
      resultCard.innerHTML = `
        <div class="result-info">
          <div class="match-icon">❌</div>
          <h3>No Faces Detected</h3>
          <p>Please make sure faces are clearly visible to the camera.</p>
        </div>`;
      showToast('No faces detected. Try again.', 'error');
      btnMarkAttendance.disabled = false;
      btnMarkAttendance.innerHTML = '<span>✅</span> Mark Attendance';
      return;
    }

    const today = getTodayStr();
    const records = getAttendance();
    if (!records[today]) records[today] = {};

    const matched = [];
    const unmatched = [];

    // Match each detected face against all students
    detections.forEach((det, faceIdx) => {
      const inputDescriptor = det.descriptor;

      let bestMatch = null;
      let bestDistance = Infinity;

      students.forEach(student => {
        const descriptorsList = student.descriptors || [student.descriptor];

        descriptorsList.forEach(desc => {
          const storedDescriptor = new Float32Array(desc);
          const distance = faceapi.euclideanDistance(inputDescriptor, storedDescriptor);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = student;
          }
        });
      });

      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        // Avoid marking same student twice in one scan
        if (!matched.some(m => m.name === bestMatch.name)) {
          if (!records[today][bestMatch.name]) {
            records[today][bestMatch.name] = {
              id: bestMatch.id,
              count: 0,
              timestamps: []
            };
          }

          records[today][bestMatch.name].count += 1;
          records[today][bestMatch.name].timestamps.push(new Date().toLocaleTimeString());

          matched.push({
            name: bestMatch.name,
            id: bestMatch.id,
            confidence: ((1 - bestDistance) * 100).toFixed(1),
            count: records[today][bestMatch.name].count,
            photoCount: bestMatch.photoCount || 1
          });
        }
      } else {
        unmatched.push({
          faceIndex: faceIdx + 1,
          closest: bestMatch ? bestMatch.name : 'N/A',
          distance: bestDistance.toFixed(3)
        });
      }
    });

    saveAttendance(records);

    // Build result display
    if (matched.length > 0) {
      const matchCards = matched.map(m => `
        <div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:10px;margin-bottom:8px;">
          <div style="font-size:1.1rem;font-weight:700;">✅ ${m.name}</div>
          <div style="font-size:0.82rem;color:#94a3b8;margin-top:4px;">
            ID: ${m.id} · Confidence: ${m.confidence}% · Today's count: ${m.count}
          </div>
        </div>
      `).join('');

      const unmatchedInfo = unmatched.length > 0
        ? `<p style="font-size:0.8rem;color:#f87171;margin-top:12px;">⚠️ ${unmatched.length} face(s) not recognized</p>`
        : '';

      resultCard.className = 'result-card result-success';
      resultCard.innerHTML = `
        <div class="result-info" style="width:100%;text-align:left;">
          <div style="text-align:center;margin-bottom:16px;">
            <div class="match-icon">🎯</div>
            <h3>${matched.length} Student(s) Recognized</h3>
            <p style="color:#94a3b8;font-size:0.85rem;">${detections.length} face(s) detected in frame · ${new Date().toLocaleTimeString()}</p>
          </div>
          ${matchCards}
          ${unmatchedInfo}
        </div>`;

      const names = matched.map(m => m.name).join(', ');
      showToast(`✅ Attendance marked for: ${names}`, 'success');
      updateTodayAttendance();
    } else {
      resultCard.className = 'result-card result-fail';
      resultCard.innerHTML = `
        <div class="result-info">
          <div class="match-icon">⚠️</div>
          <h3>${detections.length} Face(s) Detected — None Recognized</h3>
          <p>None of the detected faces match any registered student.</p>
        </div>`;

      showToast('No faces recognized. Please register first.', 'error');
    }
  } catch (error) {
    console.error('Attendance error:', error);
    resultCard.className = 'result-card result-fail';
    resultCard.innerHTML = `
      <div class="result-info">
        <div class="match-icon">❌</div>
        <h3>Error</h3>
        <p>An error occurred during recognition. Please try again.</p>
      </div>`;
    showToast('Recognition error. Please try again.', 'error');
  }

  btnMarkAttendance.disabled = false;
  btnMarkAttendance.innerHTML = '<span>✅</span> Mark Attendance';
}

// ===== UI UPDATE FUNCTIONS =====
function updateRegisteredList() {
  const students = getStudents();
  registeredCount.textContent = students.length;

  if (students.length === 0) {
    registeredList.innerHTML = '<p class="empty-msg">No students registered yet.</p>';
    return;
  }

  registeredList.innerHTML = students.map((s, i) => `
    <div class="student-card">
      <img class="student-avatar" src="${s.image || ''}" alt="${s.name}" />
      <div class="student-info">
        <h4>${s.name}</h4>
        <p>${s.id} · ${s.photoCount || 1} photo(s)</p>
      </div>
      <button class="btn-delete" onclick="deleteStudent(${i})" title="Remove student">🗑️</button>
    </div>
  `).join('');
}

function deleteStudent(index) {
  if (!confirm('Remove this student from the system?')) return;
  const students = getStudents();
  const name = students[index].name;
  students.splice(index, 1);
  saveStudents(students);
  updateRegisteredList();
  populateStudentFilter();
  showToast(`${name} has been removed.`, 'info');
}

function updateTodayAttendance() {
  const today = getTodayStr();
  todayDate.textContent = today;

  const records = getAttendance();
  const todayData = records[today];

  if (!todayData || Object.keys(todayData).length === 0) {
    todayList.innerHTML = '<p class="empty-msg">No attendance marked yet today.</p>';
    return;
  }

  todayList.innerHTML = Object.entries(todayData).map(([name, data]) => `
    <div class="today-item">
      <span class="name">${name}</span>
      <span class="count">×${data.count}</span>
    </div>
  `).join('');
}

// ===== STUDENT FILTER DROPDOWN =====
function populateStudentFilter() {
  if (!filterStudent) return;

  const students = getStudents();
  const records = getAttendance();

  // Collect all unique names from both students and records
  const names = new Set();
  students.forEach(s => names.add(s.name));
  Object.values(records).forEach(dayData => {
    Object.keys(dayData).forEach(name => names.add(name));
  });

  const currentVal = filterStudent.value;
  filterStudent.innerHTML = '<option value="">All Students</option>';
  Array.from(names).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    filterStudent.appendChild(opt);
  });
  filterStudent.value = currentVal;
}

// ===== RECORDS RENDERING =====
function renderRecords(dateFilter, studentFilter) {
  const records = getAttendance();
  let rows = [];

  const dates = Object.keys(records).sort().reverse();

  dates.forEach(date => {
    if (dateFilter && date !== dateFilter) return;

    const dayData = records[date];
    Object.entries(dayData).forEach(([name, data]) => {
      if (studentFilter && name !== studentFilter) return;

      const lastTime = data.timestamps?.[data.timestamps.length - 1] || '—';
      rows.push(`
        <tr>
          <td>${date}</td>
          <td>${name}</td>
          <td>${data.id || '—'}</td>
          <td class="count-cell">${data.count}</td>
          <td>${lastTime}</td>
        </tr>
      `);
    });
  });

  if (rows.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="5" class="empty-msg">No records found.</td></tr>';
  } else {
    recordsBody.innerHTML = rows.join('');
  }
}

// ===== PDF REPORT DOWNLOAD =====
function downloadPDFReport() {
  const records = getAttendance();
  const selectedStudent = filterStudent ? filterStudent.value : '';
  const selectedDate = filterDate ? filterDate.value : '';

  // Collect rows for PDF
  const pdfRows = [];
  const dates = Object.keys(records).sort().reverse();
  let totalCount = 0;

  dates.forEach(date => {
    if (selectedDate && date !== selectedDate) return;

    const dayData = records[date];
    Object.entries(dayData).forEach(([name, data]) => {
      if (selectedStudent && name !== selectedStudent) return;

      const lastTime = data.timestamps?.[data.timestamps.length - 1] || '—';
      pdfRows.push([date, name, data.id || '—', data.count.toString(), lastTime]);
      totalCount += data.count;
    });
  });

  if (pdfRows.length === 0) {
    showToast('No records to export. Adjust your filters.', 'error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Smart Attendance System', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Attendance Report', 105, 28, { align: 'center' });

    // Report info
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const infoY = 38;

    if (selectedStudent) {
      doc.text(`Student: ${selectedStudent}`, 14, infoY);
    } else {
      doc.text('Student: All Students', 14, infoY);
    }

    if (selectedDate) {
      doc.text(`Date: ${selectedDate}`, 14, infoY + 6);
    } else {
      doc.text('Date: All Dates', 14, infoY + 6);
    }

    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, infoY + 12);
    doc.text(`Total Attendance Count: ${totalCount}`, 14, infoY + 18);
    doc.text(`Total Records: ${pdfRows.length}`, 14, infoY + 24);

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(14, infoY + 28, 196, infoY + 28);

    // Table
    doc.autoTable({
      startY: infoY + 32,
      head: [['Date', 'Student Name', 'Student ID', 'Count', 'Last Marked']],
      body: pdfRows,
      theme: 'grid',
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 255]
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 35 }
      },
      styles: {
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      margin: { left: 14, right: 14 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Smart Attendance System — Page ${i} of ${pageCount}`,
        105, doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Generate filename
    let filename = 'attendance_report';
    if (selectedStudent) filename += `_${selectedStudent.replace(/\s+/g, '_')}`;
    if (selectedDate) filename += `_${selectedDate}`;
    filename += '.pdf';

    doc.save(filename);

    showToast(`📄 PDF report downloaded: ${filename}`, 'success');
  } catch (error) {
    console.error('PDF generation error:', error);
    showToast('Error generating PDF. Please try again.', 'error');
  }
}

// ===== STORAGE HELPERS =====
function getStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.students)) || [];
  } catch { return []; }
}

function saveStudents(data) {
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(data));
}

function getAttendance() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.attendance)) || {};
  } catch { return {}; }
}

function saveAttendance(data) {
  localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(data));
}

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function setTodayDate() {
  todayDate.textContent = getTodayStr();
  filterDate.value = getTodayStr();
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
