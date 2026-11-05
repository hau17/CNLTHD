const fileInput       = document.getElementById('fileInput');
const fileCountText   = document.getElementById('fileCount');
const uploadSection   = document.getElementById('uploadSection');
const statusSection   = document.getElementById('statusSection');
const loadingUI       = document.getElementById('loadingUI');
const finishUI        = document.getElementById('finishUI');
const errorUI         = document.getElementById('errorUI');
const zipBtn          = document.getElementById('zipBtn');
const progressBar     = document.getElementById('progressBar');
const progressText    = document.getElementById('progressText');
const progressDetail  = document.getElementById('progressDetail');
const finishDetail    = document.getElementById('finishDetail');
const errorMsg        = document.getElementById('errorMsg');

const DEFAULT_FILE_TEXT = 'Chọn các file Excel (.xlsx, .xls)';

let pollTimer = null;

// ── Đọc JSON và ném lỗi kèm message server trả về (400/413/429/...) ──
async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const message = data?.message || `Server trả về lỗi ${res.status}.`;
        const details = Array.isArray(data?.details)
            ? data.details.map((d) => (typeof d === 'string' ? d : d.message)).join(', ')
            : '';
        throw new Error(details ? `${message} (${details})` : message);
    }
    return data;
}

// ── Khi chọn file ──
fileInput.addEventListener('change', () => {
    const count = fileInput.files.length;
    fileCountText.innerText = count > 0 ? `Đã chọn ${count} file` : DEFAULT_FILE_TEXT;
    fileCountText.classList.toggle('text-blue-400', count > 0);
});

// ── Bắt đầu upload ──
async function startProcess() {
    if (fileInput.files.length === 0) return alert('Vui lòng chọn ít nhất 1 file Excel!');

    const fd = new FormData();
    for (const f of fileInput.files) fd.append('excelFiles', f);

    showSection('status');

    try {
        const data = await fetchJson('/upload', { method: 'POST', body: fd });
        if (data?.status !== 'queued' || !data.requestId) {
            throw new Error('Phản hồi không hợp lệ từ server.');
        }
        pollStatus(data.requestId, data.total);
    } catch (err) {
        showError(err.message);
    }
}

// ── Poll /status/:requestId mỗi 2 giây ──
function pollStatus(requestId, total) {
    updateProgress(0, total, 0);

    pollTimer = setInterval(async () => {
        try {
            const data = await fetchJson(`/status/${requestId}`);

            if (data.status === 'processing') {
                updateProgress(data.percent || 0, data.total, data.done);
            }

            if (data.status === 'done') {
                clearInterval(pollTimer);
                showFinish(data.zipUrl, data.failed);
            }
        } catch (err) {
            clearInterval(pollTimer);
            showError(err.message);
        }
    }, 2000);
}

// ── Cập nhật progress bar ──
function updateProgress(percent, total, done) {
    progressBar.style.width = percent + '%';
    progressText.innerText = percent + '%';
    progressDetail.innerText = `Đã xong ${done} / ${total} file`;
}

// ── Hiện màn hình hoàn tất ──
function showFinish(zipUrl, failedCount) {
    loadingUI.classList.add('hidden');
    finishUI.classList.remove('hidden');
    zipBtn.href = zipUrl;

    if (failedCount > 0) {
        finishDetail.innerText = `Hoàn tất! (${failedCount} file bị lỗi, không có trong ZIP)`;
        finishDetail.classList.add('text-yellow-400');
    } else {
        finishDetail.innerText = 'Tất cả file đã được nén ZIP an toàn.';
    }
}

// ── Hiện màn hình lỗi ──
function showError(message) {
    loadingUI.classList.add('hidden');
    errorUI.classList.remove('hidden');
    errorMsg.innerText = message;
}

// ── Chuyển section ──
function showSection(name) {
    uploadSection.classList.toggle('hidden', name !== 'upload');
    statusSection.classList.toggle('hidden', name !== 'status');
    loadingUI.classList.remove('hidden');
    finishUI.classList.add('hidden');
    errorUI.classList.add('hidden');
}

// ── Reset về ban đầu ──
function resetApp() {
    clearInterval(pollTimer);
    fileInput.value = '';
    fileCountText.innerText = DEFAULT_FILE_TEXT;
    fileCountText.classList.remove('text-blue-400');
    progressBar.style.width = '0%';
    progressText.innerText = '0%';
    progressDetail.innerText = '';
    finishDetail.classList.remove('text-yellow-400');
    showSection('upload');
}

// CSP (helmet) chặn thuộc tính onclick inline → gắn sự kiện bằng JS.
document.getElementById('startBtn').addEventListener('click', startProcess);
document.querySelectorAll('[data-action="reset"]').forEach((btn) => btn.addEventListener('click', resetApp));
