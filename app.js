const questions = window.GEPT_QUESTIONS || [];

const state = {
  selectedId: 1,
  duration: 15,
  remaining: 15,
  timerId: null,
  recognition: null,
  recording: false,
  finalTranscript: ""
};

const els = {
  questionList: document.querySelector("#questionList"),
  searchInput: document.querySelector("#searchInput"),
  questionNumber: document.querySelector("#questionNumber"),
  questionText: document.querySelector("#questionText"),
  sampleAnswer: document.querySelector("#sampleAnswer"),
  practiceSentences: document.querySelector("#practiceSentences"),
  timerDisplay: document.querySelector("#timerDisplay"),
  recordButton: document.querySelector("#recordButton"),
  resetButton: document.querySelector("#resetButton"),
  statusLine: document.querySelector("#statusLine"),
  transcriptBox: document.querySelector("#transcriptBox"),
  correctedAnswer: document.querySelector("#correctedAnswer"),
  feedbackButton: document.querySelector("#feedbackButton"),
  randomButton: document.querySelector("#randomButton"),
  speakSampleButton: document.querySelector("#speakSampleButton"),
  readCorrectionButton: document.querySelector("#readCorrectionButton"),
  copySentencesButton: document.querySelector("#copySentencesButton"),
  timeChoices: document.querySelectorAll(".time-choice")
};

function currentQuestion() {
  return questions.find((item) => item.id === state.selectedId) || questions[0];
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => cleanSentence(sentence))
    .filter(Boolean) || [];
}

function cleanSentence(sentence) {
  const compact = sentence.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const withPeriod = /[.!?]$/.test(compact) ? compact : `${compact}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

function answerTopic(question) {
  return question
    .replace(/^(what|where|when|who|why|how|do|does|did|are|is|can|have|has|tell me about|describe)\b/i, "")
    .replace(/[?.,]/g, "")
    .replace(/\b(you|your|would|could|if|so|or|and|the|a|an)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "this question";
}

function practiceSentencesFor(item) {
  const sentences = splitSentences(item.answer);
  const topic = answerTopic(item.question);
  const frames = [
    `I think ${topic} is important because it is part of my daily life.`,
    `For example, I can give a clear reason and one simple detail.`,
    `In my opinion, a short answer with two or three sentences is enough.`,
    `That is why I want to speak slowly, clearly, and confidently.`,
    `If I need more time, I can use simple words and connect my ideas with because, so, and also.`
  ];
  return [...sentences, ...frames].slice(0, 5);
}

function renderQuestionList(filter = "") {
  const term = filter.trim().toLowerCase();
  const visible = questions.filter((item) => {
    return !term || String(item.id) === term || item.question.toLowerCase().includes(term);
  });

  els.questionList.innerHTML = "";
  visible.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-item${item.id === state.selectedId ? " active" : ""}`;
    button.innerHTML = `<span class="question-id">${item.id}</span><span class="question-label">${item.question}</span>`;
    button.addEventListener("click", () => selectQuestion(item.id));
    els.questionList.appendChild(button);
  });
}

function renderSelectedQuestion() {
  const item = currentQuestion();
  if (!item) return;

  els.questionNumber.textContent = `Question ${item.id}`;
  els.questionText.textContent = item.question;
  els.sampleAnswer.textContent = item.answer;
  els.practiceSentences.innerHTML = "";
  practiceSentencesFor(item).forEach((sentence) => {
    const li = document.createElement("li");
    li.textContent = sentence;
    els.practiceSentences.appendChild(li);
  });
  renderQuestionList(els.searchInput.value);
}

function selectQuestion(id) {
  stopRecording();
  state.selectedId = id;
  state.finalTranscript = "";
  els.transcriptBox.value = "";
  els.correctedAnswer.textContent = "Click Feedback after recording.";
  resetTimer();
  renderSelectedQuestion();
}

function resetTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.remaining = state.duration;
  els.timerDisplay.textContent = state.remaining;
  els.timerDisplay.classList.remove("warning");
}

function tickTimer() {
  state.remaining -= 1;
  els.timerDisplay.textContent = state.remaining;
  els.timerDisplay.classList.toggle("warning", state.remaining <= 5);
  if (state.remaining <= 0) {
    stopRecording();
    els.statusLine.textContent = "Time is up. Click Feedback to check your answer.";
  }
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.statusLine.textContent = "Speech recognition is not available in this browser. Try Chrome or Edge.";
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        state.finalTranscript += `${text} `;
      } else {
        interim += text;
      }
    }
    els.transcriptBox.value = `${state.finalTranscript}${interim}`.trim();
  };

  recognition.onerror = (event) => {
    els.statusLine.textContent = `Recording stopped: ${event.error}.`;
    stopRecording(false);
  };

  recognition.onend = () => {
    if (state.recording) {
      stopRecording(false);
    }
  };

  return recognition;
}

function startRecording() {
  const recognition = state.recognition || setupRecognition();
  if (!recognition) return;

  state.recognition = recognition;
  state.recording = true;
  state.finalTranscript = "";
  els.transcriptBox.value = "";
  els.correctedAnswer.textContent = "Recording...";
  els.recordButton.classList.add("recording");
  els.recordButton.innerHTML = '<span class="record-dot"></span>Stop Recording';
  els.statusLine.textContent = "Recording in English...";
  resetTimer();
  state.timerId = setInterval(tickTimer, 1000);

  try {
    recognition.start();
  } catch (error) {
    els.statusLine.textContent = "Recording is already active.";
  }
}

function stopRecording(callStop = true) {
  clearInterval(state.timerId);
  state.timerId = null;
  if (state.recording && callStop && state.recognition) {
    state.recognition.stop();
  }
  state.recording = false;
  els.recordButton.classList.remove("recording");
  els.recordButton.innerHTML = '<span class="record-dot"></span>Start Recording';
}

function polishTranscript(text) {
  let result = text.trim();
  if (!result) return "";

  const replacements = [
    [/\bi\b/g, "I"],
    [/\bim\b/gi, "I am"],
    [/\bive\b/gi, "I have"],
    [/\bid\b/gi, "I would"],
    [/\bdont\b/gi, "do not"],
    [/\bdoesnt\b/gi, "does not"],
    [/\bdidnt\b/gi, "did not"],
    [/\bcant\b/gi, "cannot"],
    [/\bwont\b/gi, "will not"],
    [/\bisnt\b/gi, "is not"],
    [/\barent\b/gi, "are not"],
    [/\bwasnt\b/gi, "was not"],
    [/\bwerent\b/gi, "were not"],
    [/\bgonna\b/gi, "going to"],
    [/\bwanna\b/gi, "want to"],
    [/\bkinda\b/gi, "kind of"],
    [/\bcuz\b/gi, "because"],
    [/\bme and my ([a-z]+)/gi, "my $1 and I"],
    [/\bmore better\b/gi, "better"],
    [/\bvery like\b/gi, "really like"],
    [/\bI am agree\b/gi, "I agree"],
    [/\bI born\b/gi, "I was born"],
    [/\bI very\b/gi, "I am very"],
    [/\bI go to home\b/gi, "I go home"],
    [/\bdepend on\b/gi, "depends on"]
  ];

  replacements.forEach(([pattern, value]) => {
    result = result.replace(pattern, value);
  });

  result = result
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([.!?])(?=[A-Za-z])/g, "$1 ")
    .trim();

  const chunks = result.match(/[^.!?]+[.!?]*|$/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => cleanSentence(part));

  return chunks.join(" ");
}

function giveFeedback() {
  const transcript = els.transcriptBox.value.trim();
  if (!transcript) {
    els.correctedAnswer.textContent = "Please record or type an answer first.";
    return;
  }
  els.correctedAnswer.textContent = polishTranscript(transcript);
  els.statusLine.textContent = "Feedback is ready. Read the corrected answer out loud.";
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

els.searchInput.addEventListener("input", () => renderQuestionList(els.searchInput.value));

els.timeChoices.forEach((button) => {
  button.addEventListener("click", () => {
    state.duration = Number(button.dataset.seconds);
    els.timeChoices.forEach((choice) => choice.classList.toggle("active", choice === button));
    resetTimer();
  });
});

els.recordButton.addEventListener("click", () => {
  if (state.recording) {
    stopRecording();
    els.statusLine.textContent = "Recording stopped. Click Feedback to check your answer.";
  } else {
    startRecording();
  }
});

els.resetButton.addEventListener("click", () => {
  stopRecording();
  state.finalTranscript = "";
  els.transcriptBox.value = "";
  els.correctedAnswer.textContent = "Click Feedback after recording.";
  els.statusLine.textContent = "Ready for a new answer.";
  resetTimer();
});

els.feedbackButton.addEventListener("click", giveFeedback);
els.randomButton.addEventListener("click", () => selectQuestion(questions[Math.floor(Math.random() * questions.length)].id));
els.speakSampleButton.addEventListener("click", () => speak(currentQuestion().answer));
els.readCorrectionButton.addEventListener("click", () => speak(els.correctedAnswer.textContent));
els.copySentencesButton.addEventListener("click", async () => {
  const text = practiceSentencesFor(currentQuestion()).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    els.statusLine.textContent = "Practice sentences copied.";
  } catch (error) {
    els.statusLine.textContent = "Clipboard access was blocked, but the sentences are still shown above.";
  }
});

renderQuestionList();
renderSelectedQuestion();
resetTimer();
