// --- Cấu hình Game ---
const SPEECH_TIMEOUT_SECONDS = 5;
const MAX_SPEECH_ATTEMPTS = 3;
const LOCAL_STORAGE_VOICE_KEY = 'typingGameSelectedVoiceURI';

// --- Lấy các phần tử HTML ---
const wordToTypeElement = document.getElementById('word-to-type');
const wordMeaningElement = document.getElementById('word-meaning');
const typingInputElement = document.getElementById('typing-input');
const feedbackElement = document.getElementById('feedback');
const speechFeedbackElement = document.getElementById('speech-feedback');
const scoreElement = document.getElementById('score');
const speechAttemptsCountElement = document.getElementById('speech-attempts-count');
const startButton = document.getElementById('start-button');
const instructionsElement = document.getElementById('instructions');
const apiSupportNotice = document.getElementById('api-support-notice');
const ttsSupportNotice = document.getElementById('tts-support-notice');
const dictionaryErrorNotice = document.getElementById('dictionary-error-notice');
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const voiceSelect = document.getElementById('voice-select');
const closeSettingsButton = document.getElementById('close-settings-button');


// --- Biến trạng thái Game ---
let currentWordObject = null; // Lưu đối tượng từ hiện tại {en, vi}
let currentWord = '';         // Chỉ lưu từ tiếng Anh
let score = 0;
let isPlaying = false;
let availableWords = []; // Lưu các object từ chưa dùng
let speechAttempts = 0;
let speechTimeout = null;
let isRecognizing = false;
let isSpeaking = false;
let availableVoices = [];
let selectedVoiceURI = null;
let gameWords = []; // Lưu toàn bộ từ điển (mảng các object)

// --- Web Speech API ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let sttApiSupported = false;
const synth = window.speechSynthesis;
let ttsApiSupported = false;

// --- Khởi tạo và Kiểm tra API ---
function initializeApis() {
    console.log("Initializing APIs...");
    // STT
    if (SpeechRecognition) {
        try {
            recognition = new SpeechRecognition();
            recognition.continuous = false; 
            recognition.lang = 'en-US'; 
            recognition.interimResults = false; 
            recognition.maxAlternatives = 1;
            recognition.onresult = handleSpeechResult; 
            recognition.onerror = handleSpeechError;
            sttApiSupported = true; 
            console.log("STT API được hỗ trợ.");
        } catch (e) {
            console.error("Lỗi khởi tạo STT:", e); 
            apiSupportNotice.style.display = 'block'; 
            sttApiSupported = false;
        }
    } else { 
        console.warn("STT API không được hỗ trợ."); 
        apiSupportNotice.style.display = 'block'; 
        sttApiSupported = false; 
    }

    // TTS
    if ('speechSynthesis' in window) {
        ttsApiSupported = true; 
        console.log("TTS API được hỗ trợ.");
        synth.onvoiceschanged = populateVoiceList;
        populateVoiceList(); // Gọi phòng trường hợp event đã xảy ra
    } else {
        console.warn("TTS API không được hỗ trợ."); 
        ttsSupportNotice.style.display = 'block'; 
        ttsApiSupported = false;
        voiceSelect.innerHTML = '<option value="">-- TTS không hỗ trợ --</option>'; 
        voiceSelect.disabled = true;
    }
}

// --- Tải Từ điển ---
async function loadDictionary() {
    console.log("Loading dictionary...");
    try {
        const response = await fetch('dictionary.json');
        if (!response.ok) { 
            throw new Error(`HTTP error! status: ${response.status}`); 
        }
        gameWords = await response.json();
        console.log(`Dictionary loaded with ${gameWords.length} word objects.`);
        if (!Array.isArray(gameWords) || gameWords.length === 0 || !gameWords[0].en || !gameWords[0].vi) {
            throw new Error("Định dạng từ điển không hợp lệ hoặc từ điển trống.");
        }
        initializeGame(); // Khởi tạo trạng thái game sau khi tải xong
        startButton.disabled = false; // Kích hoạt nút Start
        wordToTypeElement.textContent = 'Sẵn sàng?';
        wordMeaningElement.textContent = '';
    } catch (error) {
        console.error("Failed to load dictionary:", error);
        dictionaryErrorNotice.textContent = `Lỗi tải từ điển: ${error.message}. Vui lòng kiểm tra file dictionary.json và tải lại trang.`;
        dictionaryErrorNotice.style.display = 'block';
        wordToTypeElement.textContent = 'Lỗi';
        wordMeaningElement.textContent = '';
        startButton.disabled = true;
    }
}


// --- Hàm xử lý Giọng đọc (Voices) ---
function populateVoiceList() {
    if (!ttsApiSupported) return;
    
    availableVoices = synth.getVoices().filter(voice => voice.lang.startsWith('en-'));
    voiceSelect.innerHTML = '';
    
    if (availableVoices.length === 0) { 
        voiceSelect.innerHTML = '<option value="">-- Không tìm thấy giọng Tiếng Anh --</option>'; 
        return; 
    }
    
    availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`; 
        option.setAttribute('value', voice.voiceURI);
        voiceSelect.appendChild(option);
    });
    
    loadSettings();
    const currentSelectedOption = voiceSelect.querySelector(`option[value="${selectedVoiceURI}"]`);
    
    if (currentSelectedOption) {
        currentSelectedOption.selected = true;
    } else if (voiceSelect.options.length > 0) {
        voiceSelect.options[0].selected = true;
        selectedVoiceURI = voiceSelect.options[0].value;
    }
}

// --- Hàm xử lý Cài đặt (Settings) & LocalStorage ---
function loadSettings() {
    selectedVoiceURI = localStorage.getItem(LOCAL_STORAGE_VOICE_KEY);
    console.log("Loaded voice URI:", selectedVoiceURI);
}

function saveSettings() {
    const currentSelectedURI = voiceSelect.value;
    if (currentSelectedURI) {
        localStorage.setItem(LOCAL_STORAGE_VOICE_KEY, currentSelectedURI);
        selectedVoiceURI = currentSelectedURI; 
        console.log("Saved voice URI:", currentSelectedURI);
    } else {
        localStorage.removeItem(LOCAL_STORAGE_VOICE_KEY); 
        selectedVoiceURI = null; 
        console.log("Removed voice URI.");
    }
}

// --- Hàm xử lý Game ---
function initializeGame() {
    console.log("Initializing game state...");
    loadSettings();

    score = 0;
    isPlaying = false;
    isRecognizing = false; 
    isSpeaking = false; 
    speechAttempts = 0;
    currentWordObject = null; 
    currentWord = '';

    clearTimeout(speechTimeout);
    if (recognition && sttApiSupported) { 
        try { 
            recognition.abort(); 
        } catch(e) {
            console.error("Error aborting recognition:", e);
        } 
    }
    
    if (synth && ttsApiSupported) { 
        synth.cancel(); 
    }

    scoreElement.textContent = score;
    speechAttemptsCountElement.textContent = `${speechAttempts}/${MAX_SPEECH_ATTEMPTS}`;
    wordToTypeElement.textContent = 'Sẵn sàng?';
    wordMeaningElement.textContent = '';
    feedbackElement.textContent = ''; 
    feedbackElement.className = '';
    speechFeedbackElement.textContent = ''; 
    speechFeedbackElement.className = '';
    typingInputElement.value = '';
    typingInputElement.disabled = true;
    startButton.disabled = (gameWords.length === 0); // Chỉ bật nếu từ điển đã tải
    startButton.textContent = 'Bắt đầu!';
    instructionsElement.style.display = 'block';
    settingsPanel.style.display = 'none';
    console.log("Game state initialized.");
}

function startGame() {
    console.log("Starting game...");
    if (isPlaying) return;
    if (gameWords.length === 0) { 
        console.error("Cannot start, dictionary not loaded."); 
        return; 
    }

    isPlaying = true;
    typingInputElement.disabled = false;
    startButton.disabled = true; 
    startButton.textContent = 'Đang chơi...';
    instructionsElement.style.display = 'none'; 
    settingsPanel.style.display = 'none';

    score = 0; 
    speechAttempts = 0;
    availableWords = [...gameWords]; // Lấy bản sao mảng các object từ
    scoreElement.textContent = score;
    speechAttemptsCountElement.textContent = `${speechAttempts}/${MAX_SPEECH_ATTEMPTS}`;
    feedbackElement.textContent = ''; 
    speechFeedbackElement.textContent = '';

    displayNextWord();
    typingInputElement.focus();
    console.log("Game started.");
}

function displayNextWord() {
    console.log("Displaying next word...");
    isRecognizing = false; 
    isSpeaking = false; 
    clearTimeout(speechTimeout);
    
    if (recognition && sttApiSupported) { 
        try { 
            recognition.abort(); 
        } catch(e) {
            console.error("Error aborting recognition:", e);
        } 
    }
    
    if (synth && ttsApiSupported) { 
        synth.cancel(); 
    }

    if (!isPlaying) { 
        console.log("Game stopped."); 
        return; 
    }

    if (availableWords.length === 0) {
        endGame("Chúc mừng! Bạn đã hoàn thành hết các từ!");
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    currentWordObject = availableWords[randomIndex];
    currentWord = currentWordObject.en;
    availableWords.splice(randomIndex, 1);

    wordToTypeElement.textContent = currentWordObject.en;
    wordMeaningElement.textContent = currentWordObject.vi;

    typingInputElement.value = ''; 
    feedbackElement.textContent = ''; 
    feedbackElement.className = '';
    speechFeedbackElement.textContent = ''; 
    speechFeedbackElement.className = '';
    speechAttempts = 0; 
    speechAttemptsCountElement.textContent = `${speechAttempts}/${MAX_SPEECH_ATTEMPTS}`;
    typingInputElement.disabled = false;
    typingInputElement.focus();
    console.log("Next word:", currentWordObject);
}

function endGame(message) {
    console.log("Ending game:", message);
    isPlaying = false; 
    isRecognizing = false; 
    isSpeaking = false;
    clearTimeout(speechTimeout);
    
    if (recognition && sttApiSupported) { 
        try { 
            recognition.abort(); 
        } catch(e) {
            console.error("Error aborting recognition:", e);
        } 
    }
    
    if (synth && ttsApiSupported) { 
        synth.cancel(); 
    }

    typingInputElement.disabled = true;
    startButton.disabled = false; 
    startButton.textContent = 'Chơi lại?';

    feedbackElement.textContent = message + ` Điểm cuối cùng: ${score}`;
    feedbackElement.className = '';
    speechFeedbackElement.textContent = '';
    wordToTypeElement.textContent = 'Game Over!';
    wordMeaningElement.textContent = '';
}

function handleTyping(event) {
    if (event.key === 'Enter' && isPlaying && !isSpeaking && !isRecognizing) { 
        checkTypedWord(); 
    }
}

function checkTypedWord() {
    const typedValue = typingInputElement.value.trim().toLowerCase();
    if (typedValue === currentWord.toLowerCase()) {
        score++; 
        scoreElement.textContent = score;
        feedbackElement.textContent = 'Gõ đúng!'; 
        feedbackElement.className = 'correct';
        typingInputElement.value = ''; 
        typingInputElement.disabled = true;
        
        if (ttsApiSupported) { 
            speakWord(currentWord); 
        } else if (sttApiSupported) { 
            prepareForSpeechRecognition(); 
        } else { 
            setTimeout(displayNextWord, 1500); 
        }
    } else {
        feedbackElement.textContent = 'Gõ sai! Thử lại.'; 
        feedbackElement.className = 'incorrect';
        typingInputElement.focus();
    }
}

function speakWord(textToSpeak) {
    if (!ttsApiSupported || !isPlaying) return;
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const selectedVoice = availableVoices.find(voice => voice.voiceURI === selectedVoiceURI);
    
    if (selectedVoice) { 
        utterance.voice = selectedVoice; 
        utterance.lang = selectedVoice.lang; 
    } else { 
        utterance.lang = 'en-US'; 
    } // Mặc định nếu không tìm thấy giọng
    
    utterance.rate = 0.9; 
    utterance.pitch = 1;
    
    utterance.onstart = () => { 
        isSpeaking = true; 
        speechFeedbackElement.textContent = `Đang đọc: "${textToSpeak}"...`; 
        speechFeedbackElement.className = 'speaking info'; 
    };
    
    utterance.onend = () => {
        isSpeaking = false; 
        if (!isPlaying) return;
        if (sttApiSupported) { 
            prepareForSpeechRecognition(); 
        } else { 
            setTimeout(displayNextWord, 1500); 
        }
    };
    
    utterance.onerror = (event) => {
        console.error("TTS Error:", event.error); 
        isSpeaking = false;
        speechFeedbackElement.textContent = `Lỗi đọc: ${event.error}`; 
        speechFeedbackElement.className = 'incorrect';
        if (sttApiSupported && isPlaying) { 
            prepareForSpeechRecognition(); 
        } else if (isPlaying) { 
            setTimeout(displayNextWord, 1500); 
        }
    };
    
    synth.speak(utterance);
}

function prepareForSpeechRecognition() {
    if (!sttApiSupported || !isPlaying) { 
        if(isPlaying) setTimeout(displayNextWord, 1500); 
        return; 
    }
    
    isRecognizing = true; 
    speechAttempts = 0; 
    speechAttemptsCountElement.textContent = `${speechAttempts}/${MAX_SPEECH_ATTEMPTS}`;
    speechFeedbackElement.textContent = `Phát âm: "${currentWord}"`;
    speechFeedbackElement.className = 'info';
    setTimeout(startSpeechRecognition, 1000);
}

function startSpeechRecognition() {
    if (!isPlaying || !isRecognizing || !sttApiSupported) { 
        if(isPlaying) { 
            handleFailedSpeechAttempt("Lỗi nghe."); 
        } 
        return;
    }
    
    speechFeedbackElement.textContent = `Đang nghe... (${SPEECH_TIMEOUT_SECONDS}s)`; 
    speechFeedbackElement.className = 'listening';
    
    try {
        clearTimeout(speechTimeout);
        if (recognition.abort) { 
            try { 
                recognition.abort(); 
            } catch(e) {
                console.error("Error aborting recognition:", e);
            } 
        }
        
        setTimeout(() => {
            if (!isRecognizing || !isPlaying) return;
            try {
                recognition.start();
                speechTimeout = setTimeout(() => { 
                    if (isRecognizing) { 
                        try { 
                            recognition.stop(); 
                        } catch(e) {
                            console.error("Error stopping recognition:", e);
                        } 
                        handleSpeechTimeout(); 
                    } 
                }, SPEECH_TIMEOUT_SECONDS * 1000);
            } catch (startError) { 
                console.error("STT start() error:", startError); 
                handleSpeechError({ error: 'start-error' }); 
            }
        }, 100);
    } catch (e) { 
        console.error("STT prepare error:", e); 
        handleSpeechError({ error: 'start-error' }); 
    }
}

function handleSpeechResult(event) {
    if (!isRecognizing || !isPlaying) return; 
    clearTimeout(speechTimeout);
    
    const spokenWord = event.results[0][0].transcript.trim().toLowerCase();
    const expectedWord = currentWord.toLowerCase().replace(/[.,!?;:]/g, '');
    const recognizedWord = spokenWord.replace(/[.,!?;:]/g, '');
    
    if (recognizedWord === expectedWord) {
        isRecognizing = false; 
        speechFeedbackElement.textContent = `Chính xác! (${spokenWord})`; 
        speechFeedbackElement.className = 'correct';
        setTimeout(displayNextWord, 1500);
    } else { 
        handleFailedSpeechAttempt(`Sai! (Nói: ${spokenWord})`); 
    }
}

function handleSpeechError(event) {
    if (!isRecognizing || !isPlaying) return; 
    clearTimeout(speechTimeout);
    
    let msg = 'Lỗi nhận dạng.';
    if (event.error) {
        console.error('STT Error:', event.error);
        if (event.error === 'no-speech') msg = 'Không phát hiện giọng nói.';
        else if (event.error === 'audio-capture') msg = 'Lỗi micro.';
        else if (event.error === 'not-allowed') msg = 'Chưa cấp quyền micro.';
        else if (event.error === 'network') msg = 'Lỗi mạng.';
        else if (event.error === 'aborted') { 
            if(isRecognizing) msg = 'Đã dừng.'; 
            else return; 
        } // Bỏ qua nếu không còn nghe
        else if (event.error === 'start-error') msg = 'Lỗi bắt đầu ghi âm.';
        else msg = `Lỗi: ${event.error}.`;
    } else { 
        console.error('STT Error:', event); 
    }
    
    handleFailedSpeechAttempt(msg);
}

function handleSpeechTimeout() { 
    if (!isRecognizing || !isPlaying) return; 
    handleFailedSpeechAttempt('Hết giờ nói.'); 
}

function handleFailedSpeechAttempt(message) {
    if (!isPlaying) return; 
    
    speechAttempts++; 
    speechAttemptsCountElement.textContent = `${speechAttempts}/${MAX_SPEECH_ATTEMPTS}`;
    speechFeedbackElement.textContent = `${message} Thử lại (${speechAttempts}/${MAX_SPEECH_ATTEMPTS}).`; 
    speechFeedbackElement.className = 'incorrect';
    
    if (speechAttempts >= MAX_SPEECH_ATTEMPTS) {
        isRecognizing = false; 
        speechFeedbackElement.textContent += " Chuyển từ mới.";
        setTimeout(displayNextWord, 2000);
    } else { 
        setTimeout(startSpeechRecognition, 1500); 
    }
}

// --- Gắn sự kiện UI ---
settingsButton.addEventListener('click', () => { 
    settingsPanel.style.display = (settingsPanel.style.display === 'block') ? 'none' : 'block'; 
});

closeSettingsButton.addEventListener('click', () => { 
    settingsPanel.style.display = 'none'; 
});

voiceSelect.addEventListener('change', saveSettings);
startButton.addEventListener('click', startGame);
typingInputElement.addEventListener('keydown', handleTyping);

// Thêm sự kiện khi click ra ngoài panel cài đặt để đóng
document.addEventListener('click', (event) => {
    if (settingsPanel.style.display === 'block' && 
        !settingsPanel.contains(event.target) && 
        event.target !== settingsButton) {
        settingsPanel.style.display = 'none';
    }
});

// Thêm sự kiện phím tắt
document.addEventListener('keydown', (event) => {
    // Phím Escape đóng panel cài đặt
    if (event.key === 'Escape' && settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none';
    }
    
    // Phím Space bắt đầu trò chơi khi chưa chơi
    if (event.key === ' ' && !isPlaying && !startButton.disabled) {
        event.preventDefault(); // Ngăn cuộn trang
        startGame();
    }
});

// --- Khởi tạo ---
document.addEventListener('DOMContentLoaded', () => {
    // Thêm sự kiện khi service worker nếu hỗ trợ (cho PWA)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.log('ServiceWorker đăng ký thành công:', registration.scope);
            }).catch(error => {
                console.log('ServiceWorker đăng ký thất bại:', error);
            });
        });
    }
    
    // Khởi tạo game
    initializeApis(); // Khởi tạo API (TTS/STT)
    loadDictionary(); // Tải từ điển (sẽ gọi initializeGame khi thành công)
});