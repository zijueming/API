const chat = document.getElementById("chat");
const input = document.getElementById("input");
const send = document.getElementById("send");
const voice = document.getElementById("voice");
const avatar = document.getElementById("avatar");
const mouth = avatar ? avatar.querySelector(".mouth") : null;
const idleVideo = document.getElementById("avatar-video-idle");
const talkVideo = document.getElementById("avatar-video-talk");

let isSending = false;
let isRecordingSpeech = false;
let audioContext;
let avatarVideosDisabled = false;
let idleVideoReady = false;

function resetMouth() {
  if (!mouth) return;
  mouth.style.transform = "scaleY(0.2)";
  mouth.dataset.manual = "false";
  mouth.dataset.fallback = "true";
}

function playAvatarVideo(video, { restart = false } = {}) {
  if (!video) return;
  if (restart) {
    try {
      video.currentTime = 0;
    } catch (err) {
      // 有些浏览器在元数据尚未加载完时会抛错，忽略即可
    }
  }
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((err) => {
      console.warn("头像视频播放失败:", err);
      if (video === talkVideo) {
        if (idleVideo && idleVideoReady && !avatarVideosDisabled) {
          activateIdleVideo();
        } else if (avatar) {
          avatar.classList.remove("has-video");
        }
      } else if (video === idleVideo) {
        disableAvatarVideos();
      }
    });
  }
}

function disableAvatarVideos() {
  if (avatarVideosDisabled) return;
  avatarVideosDisabled = true;
  idleVideoReady = false;
  if (avatar) {
    avatar.classList.remove("has-video");
  }
  [idleVideo, talkVideo].forEach((video) => {
    if (!video) return;
    try {
      video.pause();
      video.currentTime = 0;
    } catch (err) {
      // 忽略暂停时的异常
    }
    video.classList.remove("is-active");
  });
  resetMouth();
}

function enableAvatarVideos() {
  if (avatarVideosDisabled) {
    avatarVideosDisabled = false;
  }
  if (avatar) {
    avatar.classList.add("has-video");
  }
}

function activateIdleVideo() {
  if (avatarVideosDisabled || !idleVideo || !idleVideoReady) {
    if (avatar) {
      avatar.classList.remove("has-video");
    }
    return false;
  }
  if (talkVideo) {
    try {
      talkVideo.pause();
      talkVideo.currentTime = 0;
    } catch (err) {
      // 忽略暂停时的异常
    }
    talkVideo.classList.remove("is-active");
  }
  idleVideo.classList.add("is-active");
  enableAvatarVideos();
  playAvatarVideo(idleVideo);
  return true;
}

function activateTalkVideo() {
  if (avatarVideosDisabled || !talkVideo) {
    return false;
  }
  if (idleVideo && idleVideoReady) {
    try {
      idleVideo.pause();
    } catch (err) {
      // 忽略暂停异常
    }
    idleVideo.classList.remove("is-active");
  }
  talkVideo.classList.add("is-active");
  enableAvatarVideos();
  playAvatarVideo(talkVideo, { restart: true });
  return true;
}

function setupAvatarVideos() {
  if (!avatar) return;
  if (!idleVideo && !talkVideo) return;

  const initIdleVideo = () => {
    if (avatarVideosDisabled || idleVideoReady || !idleVideo) {
      return;
    }
    idleVideoReady = true;
    idleVideo.classList.add("is-active");
    enableAvatarVideos();
    playAvatarVideo(idleVideo);
  };

  if (idleVideo) {
    if (idleVideo.readyState >= 2) {
      initIdleVideo();
    } else {
      idleVideo.addEventListener("loadeddata", initIdleVideo, { once: true });
    }
    idleVideo.addEventListener("error", (err) => {
      console.warn("默认头像视频加载失败:", err);
      disableAvatarVideos();
    });
  }

  if (talkVideo) {
    talkVideo.addEventListener("error", (err) => {
      console.warn("说话头像视频加载失败:", err);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      !avatarVideosDisabled &&
      !avatar.classList.contains("talking")
    ) {
      activateIdleVideo();
    }
  });
}

setupAvatarVideos();

function syncMouthWithAudio(audioElement) {
  if (!mouth) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    mouth.dataset.fallback = "true";
    mouth.dataset.manual = "false";
    return;
  }

  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch (err) {
      console.warn("无法初始化 AudioContext:", err);
      mouth.dataset.fallback = "true";
      mouth.dataset.manual = "false";
      return;
    }
  }

  mouth.dataset.manual = "true";
  mouth.dataset.fallback = "false";

  let source;
  try {
    source = audioContext.createMediaElementSource(audioElement);
  } catch (err) {
    console.warn("无法创建媒体源:", err);
    mouth.dataset.manual = "false";
    mouth.dataset.fallback = "true";
    return;
  }
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function updateMouth() {
    analyser.getByteFrequencyData(dataArray);
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const scale = Math.min(1.4, 0.2 + average / 150);
    mouth.style.transform = `scaleY(${scale.toFixed(2)})`;
    if (!audioElement.paused && !audioElement.ended) {
      requestAnimationFrame(updateMouth);
    }
  }

  const resumeContext = () => {
    audioContext
      .resume()
      .then(() => {
        requestAnimationFrame(updateMouth);
      })
      .catch((err) => {
        console.warn("AudioContext 无法恢复:", err);
        resetMouth();
      });
  };

  audioElement.addEventListener("play", resumeContext, { once: true });

  const cleanup = () => {
    resetMouth();
    if (source) {
      try {
        source.disconnect();
      } catch (err) {
        console.warn("媒体源断开失败:", err);
      }
    }
    try {
      analyser.disconnect();
    } catch (err) {
      console.warn("分析器断开失败:", err);
    }
  };

  ["pause", "ended", "error"].forEach((eventName) => {
    audioElement.addEventListener(eventName, cleanup, { once: true });
  });
}

function appendBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function setTalking(status) {
  if (!avatar) return;
  avatar.classList.toggle("talking", status);
  if (status) {
    activateTalkVideo();
  } else {
    activateIdleVideo();
    resetMouth();
  }
}

async function handleStream(message) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error("网络请求失败");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const botBubble = appendBubble("", "bot");
  botBubble.dataset.audioPending = "false";
  botBubble.dataset.pendingText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      processPayload(line.trim(), botBubble);
    }
  }

  if (buffer.trim()) {
    processPayload(buffer.trim(), botBubble);
  }
}

function processPayload(raw, botBubble) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error("解析流数据失败:", err, raw);
    return;
  }

  const { type, data } = payload;

  switch (type) {
    case "text": {
      const existingText = botBubble.dataset.pendingText || "";
      const nextText = existingText + data;
      if (botBubble.dataset.audioPending === "true") {
        botBubble.dataset.pendingText = nextText;
      } else {
        botBubble.textContent = nextText;
        botBubble.dataset.pendingText = "";
        chat.scrollTop = chat.scrollHeight;
      }
      break;
    }
    case "audio": {
      if (!data) break;
      const audio = new Audio(`data:audio/wav;base64,${data}`);
      syncMouthWithAudio(audio);
      botBubble.dataset.audioPending = "true";
      botBubble.textContent = "正在播放语音...";
      const finalize = () => {
        if (botBubble.dataset.audioPending !== "true") {
          return;
        }
        setTalking(false);
        botBubble.dataset.audioPending = "false";
        const pendingText = botBubble.dataset.pendingText;
        if (pendingText) {
          botBubble.textContent = pendingText;
          botBubble.dataset.pendingText = "";
          chat.scrollTop = chat.scrollHeight;
        } else {
          botBubble.textContent = "";
        }
      };
      audio.addEventListener("play", () => setTalking(true));
      audio.addEventListener("ended", finalize);
      audio.addEventListener("error", finalize);
      audio.play().catch((err) => {
        console.error("音频播放失败:", err);
        finalize();
      });
      break;
    }
    case "status": {
      botBubble.textContent = data || "正在准备语音...";
      break;
    }
    case "done": {
      isSending = false;
      send.disabled = false;
      send.textContent = "发送";
      break;
    }
    default: {
      console.warn("未知类型:", payload);
    }
  }
}

async function sendMessage() {
  if (isSending) return;
  const message = input.value.trim();
  if (!message) return;

  appendBubble(message, "user");
  input.value = "";
  isSending = true;
  send.disabled = true;
  send.textContent = "发送中...";
  setTalking(false);

  try {
    await handleStream(message);
  } catch (error) {
    console.error(error);
    appendBubble("抱歉，服务器出错了，请稍后重试。", "bot");
    isSending = false;
    send.disabled = false;
    send.textContent = "发送";
  }
}

send.addEventListener("click", () => {
  void sendMessage();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
});

function setupVoiceInput() {
  if (!voice) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voice.disabled = true;
    voice.textContent = "语音不可用";
    voice.title = "当前浏览器不支持语音识别";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let baseTextBeforeRecording = "";
  let finalTranscript = "";

  function composeInput(interimText = "") {
    const recognized = (finalTranscript + interimText).trim();
    if (!recognized) {
      input.value = baseTextBeforeRecording;
      return;
    }

    if (!baseTextBeforeRecording) {
      input.value = recognized;
      return;
    }

    const needsSpace = !/\s$/.test(baseTextBeforeRecording);
    input.value = `${baseTextBeforeRecording}${
      needsSpace ? " " : ""
    }${recognized}`;
  }

  function resetVoiceButton() {
    isRecordingSpeech = false;
    voice.textContent = "语音输入";
    voice.classList.remove("recording");
  }

  recognition.addEventListener("start", () => {
    isRecordingSpeech = true;
    baseTextBeforeRecording = input.value;
    finalTranscript = "";
    voice.textContent = "停止录音";
    voice.classList.add("recording");
    input.focus();
  });

  recognition.addEventListener("result", (event) => {
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }
    composeInput(interimText);
  });

  recognition.addEventListener("end", () => {
    composeInput();
    resetVoiceButton();
    input.focus();
  });

  recognition.addEventListener("error", (event) => {
    console.error("语音识别错误:", event);
    composeInput();
    resetVoiceButton();
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      voice.disabled = true;
      voice.textContent = "语音被拒绝";
      voice.title = "麦克风访问被拒绝，刷新页面后可重新授权。";
    }
  });

  voice.addEventListener("click", () => {
    if (isRecordingSpeech) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("语音识别启动失败:", err);
      }
    }
  });
}

setupVoiceInput();
