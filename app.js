const questions = window.GEPT_QUESTIONS || [];

const state = {
  selectedId: 1,
  duration: 15,
  remaining: 15,
  timerId: null,
  timerEndsAt: null,
  recognition: null,
  recording: false,
  finalTranscript: "",
  correctedText: "",
  readTranscript: "",
  readChecking: false
};

const els = {
  questionList: document.querySelector("#questionList"),
  searchInput: document.querySelector("#searchInput"),
  questionNumber: document.querySelector("#questionNumber"),
  questionText: document.querySelector("#questionText"),
  sampleAnswer: document.querySelector("#sampleAnswer"),
  questionTip: document.querySelector("#questionTip"),
  practiceSentences: document.querySelector("#practiceSentences"),
  timerDisplay: document.querySelector("#timerDisplay"),
  recordButton: document.querySelector("#recordButton"),
  resetButton: document.querySelector("#resetButton"),
  statusLine: document.querySelector("#statusLine"),
  transcriptBox: document.querySelector("#transcriptBox"),
  mistakeReview: document.querySelector("#mistakeReview"),
  correctedAnswer: document.querySelector("#correctedAnswer"),
  submitButton: document.querySelector("#submitButton"),
  randomButton: document.querySelector("#randomButton"),
  speakSampleButton: document.querySelector("#speakSampleButton"),
  readAloudButton: document.querySelector("#readAloudButton"),
  readCheckStatus: document.querySelector("#readCheckStatus"),
  unclearWords: document.querySelector("#unclearWords"),
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
  if (item.patterns && item.patterns.length) {
    return item.patterns;
  }

  const sentences = splitSentences(item.answer);
  const topic = answerTopic(item.question);
  const first = sentences[0] || `I can answer this question clearly.`;
  const second = sentences[1] || `It is a simple answer, but I can add one detail.`;
  const lowerTopic = topic || "this topic";

  let openingPattern = "I think (answer) because (reason).";
  let openingExample = first;

  if (/where were you born/i.test(item.question)) {
    openingPattern = "I was born in (country/city name).";
    openingExample = "I was born in Taipei City.";
  } else if (/how old/i.test(item.question)) {
    openingPattern = "I am (age) years old.";
    openingExample = "I am fifteen years old.";
  } else if (/favorite/i.test(item.question)) {
    openingPattern = "My favorite (thing) is (answer) because (reason).";
    openingExample = first;
  } else if (/what time|when/i.test(item.question)) {
    openingPattern = "I usually (verb phrase) at/on (time).";
    openingExample = first;
  } else if (/what did|last night|this morning/i.test(item.question)) {
    openingPattern = "I (past-tense verb) (detail) because (reason).";
    openingExample = first;
  } else if (/do you|can you|have you|are you|is your/i.test(item.question)) {
    openingPattern = "Yes/No, I (answer) because (reason).";
    openingExample = first;
  } else if (/tell me about|describe/i.test(item.question)) {
    openingPattern = "There is/are (main detail), and (extra detail).";
    openingExample = first;
  } else if (/what would|if you|what do you say|what do you do/i.test(item.question)) {
    openingPattern = "I would (action) because (reason).";
    openingExample = first;
  }

  return [
    {
      pattern: openingPattern,
      example: openingExample
    },
    {
      pattern: "It is/They are (a feature or description).",
      example: second
    },
    {
      pattern: "There is/are (feature/detail), so (result).",
      example: `There are many things to say about ${lowerTopic}, so I can give one clear example.`
    },
    {
      pattern: "For example, (specific detail).",
      example: `For example, ${first.charAt(0).toLowerCase()}${first.slice(1)}`
    },
    {
      pattern: "In my opinion, (your idea) is (adjective) because (reason).",
      example: `In my opinion, ${lowerTopic} is important because it helps me speak more naturally.`
    }
  ];
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
  els.questionTip.textContent = item.tip ? `Tip: ${item.tip}` : "";
  els.practiceSentences.innerHTML = "";
  practiceSentencesFor(item).forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="pattern-line">${escapeHtml(entry.pattern)}</div><div class="example-line">e.g. ${escapeHtml(entry.example)}</div>`;
    els.practiceSentences.appendChild(li);
  });
  renderQuestionList(els.searchInput.value);
}

function selectQuestion(id) {
  stopRecording();
  state.selectedId = id;
  state.finalTranscript = "";
  state.correctedText = "";
  state.readTranscript = "";
  els.transcriptBox.value = "";
  els.mistakeReview.textContent = "Submit your answer to check grammar.";
  els.correctedAnswer.textContent = "Click Submit Answer after recording.";
  els.readCheckStatus.textContent = "Submit an answer first, then read the corrected version aloud.";
  els.unclearWords.innerHTML = "";
  resetTimer();
  renderSelectedQuestion();
}

function resetTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.timerEndsAt = null;
  state.remaining = state.duration;
  els.timerDisplay.textContent = state.remaining;
  els.timerDisplay.classList.remove("warning");
}

function updateTimerDisplay() {
  if (!state.timerEndsAt) return;
  state.remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
  els.timerDisplay.textContent = state.remaining;
  els.timerDisplay.classList.toggle("warning", state.remaining <= 5);
  if (state.remaining <= 0) {
    stopRecording(true, true);
    els.statusLine.textContent = "Time is up. Click Submit Answer to check your answer.";
  }
}

function startTimer() {
  clearInterval(state.timerId);
  state.remaining = state.duration;
  state.timerEndsAt = Date.now() + state.duration * 1000;
  els.timerDisplay.textContent = state.remaining;
  els.timerDisplay.classList.remove("warning");
  state.timerId = setInterval(updateTimerDisplay, 250);
}

function setupRecognition(mode = "answer") {
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
        if (mode === "readcheck") {
          state.readTranscript += `${text} `;
        } else {
          state.finalTranscript += `${text} `;
        }
      } else {
        interim += text;
      }
    }
    if (mode === "readcheck") {
      updateReadAloudCheck(`${state.readTranscript}${interim}`.trim());
    } else {
      els.transcriptBox.value = `${state.finalTranscript}${interim}`.trim();
    }
  };

  recognition.onerror = (event) => {
    if (mode === "readcheck") {
      els.readCheckStatus.textContent = `Read-aloud check stopped: ${event.error}.`;
      stopReadAloudCheck(false);
    } else {
      els.statusLine.textContent = `Speech-to-text stopped: ${event.error}. The timer is still running.`;
      stopRecording(false, false);
    }
  };

  recognition.onend = () => {
    if (mode === "readcheck" && state.readChecking) {
      stopReadAloudCheck(false);
    } else if (state.recording) {
      stopRecording(false, false);
    }
  };

  return recognition;
}

function startRecording() {
  stopReadAloudCheck();
  const recognition = setupRecognition("answer");
  if (!recognition) return;

  state.recognition = recognition;
  state.recording = true;
  state.finalTranscript = "";
  els.transcriptBox.value = "";
  els.mistakeReview.textContent = "Recording your answer...";
  els.correctedAnswer.textContent = "Click Submit Answer after recording.";
  els.readCheckStatus.textContent = "Submit an answer first, then read the corrected version aloud.";
  els.unclearWords.innerHTML = "";
  els.recordButton.classList.add("recording");
  els.recordButton.innerHTML = '<span class="record-dot"></span>Stop Recording';
  els.statusLine.textContent = "Recording in English...";
  startTimer();

  try {
    recognition.start();
  } catch (error) {
    els.statusLine.textContent = "Speech-to-text is already active. The timer is still running.";
  }
}

function stopRecording(callStop = true, clearTimer = true) {
  if (clearTimer) {
    clearInterval(state.timerId);
    state.timerId = null;
    state.timerEndsAt = null;
  }
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

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function wordsFrom(text) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]/g) || [];
}

function normalizeWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function alignWords(originalWords, correctedWords) {
  const a = originalWords.map(normalizeWord);
  const b = correctedWords.map(normalizeWord);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] && a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const originalMatched = new Set();
  const correctedMatched = new Set();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] && a[i] === b[j]) {
      originalMatched.add(i);
      correctedMatched.add(j);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return { originalMatched, correctedMatched };
}

function renderGrammarReview(original, corrected) {
  const originalWords = wordsFrom(original);
  const correctedWords = wordsFrom(corrected);
  const { originalMatched, correctedMatched } = alignWords(originalWords, correctedWords);

  const originalHtml = originalWords.map((word, index) => {
    const isWord = normalizeWord(word);
    const html = escapeHtml(word);
    return isWord && !originalMatched.has(index)
      ? `<mark>${html}</mark>`
      : html;
  }).join(" ").replace(/\s+([,.!?;:])/g, "$1");

  const correctedHtml = correctedWords.map((word, index) => {
    const isWord = normalizeWord(word);
    const html = escapeHtml(word);
    return isWord && !correctedMatched.has(index)
      ? `<span class="corrected-word">${html}</span>`
      : html;
  }).join(" ").replace(/\s+([,.!?;:])/g, "$1");

  els.mistakeReview.innerHTML = originalHtml || "No answer submitted.";
  els.correctedAnswer.innerHTML = correctedHtml || "Please submit an answer first.";
}

function submitAnswer() {
  stopRecording();
  stopReadAloudCheck();
  const transcript = els.transcriptBox.value.trim();
  if (!transcript) {
    els.mistakeReview.textContent = "Please record or type an answer first.";
    els.correctedAnswer.textContent = "Please record or type an answer first.";
    return;
  }
  state.correctedText = polishTranscript(transcript);
  renderGrammarReview(transcript, state.correctedText);
  els.readCheckStatus.textContent = "Click Read Aloud and read the corrected answer out loud.";
  els.unclearWords.innerHTML = "";
  els.statusLine.textContent = "Answer submitted. Now read the corrected version aloud.";
}

function compareReadAloud(expected, spoken) {
  const expectedWords = wordsFrom(expected)
    .map((word) => normalizeWord(word))
    .filter(Boolean);
  const spokenWords = wordsFrom(spoken)
    .map((word) => normalizeWord(word))
    .filter(Boolean);

  const rows = expectedWords.length + 1;
  const cols = spokenWords.length + 1;
  const table = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = expectedWords.length - 1; i >= 0; i -= 1) {
    for (let j = spokenWords.length - 1; j >= 0; j -= 1) {
      table[i][j] = expectedWords[i] === spokenWords[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const matched = new Set();
  let i = 0;
  let j = 0;
  while (i < expectedWords.length && j < spokenWords.length) {
    if (expectedWords[i] === spokenWords[j]) {
      matched.add(i);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  const unclear = expectedWords.filter((word, index) => !matched.has(index));
  const clarity = expectedWords.length
    ? Math.round((matched.size / expectedWords.length) * 100)
    : 0;
  return { clarity, unclear };
}

function renderUnclearWords(words) {
  els.unclearWords.innerHTML = "";
  if (!words.length) {
    const chip = document.createElement("span");
    chip.className = "word-chip clear";
    chip.textContent = "All words clear";
    els.unclearWords.appendChild(chip);
    return;
  }

  [...new Set(words)].slice(0, 24).forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "word-chip";
    chip.textContent = word;
    els.unclearWords.appendChild(chip);
  });
}

function updateReadAloudCheck(spokenText) {
  const result = compareReadAloud(state.correctedText, spokenText);
  els.readCheckStatus.textContent = `Clarity check: ${result.clarity}% matched. Keep reading clearly.`;
  renderUnclearWords(result.unclear);
}

function startReadAloudCheck() {
  stopRecording();
  if (!state.correctedText) {
    els.readCheckStatus.textContent = "Submit an answer first, then read the corrected version aloud.";
    return;
  }

  const recognition = setupRecognition("readcheck");
  if (!recognition) return;

  state.recognition = recognition;
  state.readChecking = true;
  state.readTranscript = "";
  els.unclearWords.innerHTML = "";
  els.readAloudButton.textContent = "Stop Check";
  els.readCheckStatus.textContent = "Listening. Read the corrected answer clearly.";
  document.querySelector(".readcheck-box")?.classList.add("active");

  try {
    recognition.start();
  } catch (error) {
    els.readCheckStatus.textContent = "Read-aloud check is already active.";
  }
}

function stopReadAloudCheck(callStop = true) {
  if (state.readChecking && callStop && state.recognition) {
    state.recognition.stop();
  }
  if (state.readChecking && state.readTranscript) {
    updateReadAloudCheck(state.readTranscript.trim());
  }
  state.readChecking = false;
  els.readAloudButton.textContent = "Read Aloud";
  document.querySelector(".readcheck-box")?.classList.remove("active");
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
    els.statusLine.textContent = "Recording stopped. Click Submit Answer to check your answer.";
  } else {
    startRecording();
  }
});

els.resetButton.addEventListener("click", () => {
  stopRecording();
  stopReadAloudCheck();
  state.finalTranscript = "";
  state.correctedText = "";
  state.readTranscript = "";
  els.transcriptBox.value = "";
  els.mistakeReview.textContent = "Submit your answer to check grammar.";
  els.correctedAnswer.textContent = "Click Submit Answer after recording.";
  els.readCheckStatus.textContent = "Submit an answer first, then read the corrected version aloud.";
  els.unclearWords.innerHTML = "";
  els.statusLine.textContent = "Ready for a new answer.";
  resetTimer();
});

els.submitButton.addEventListener("click", submitAnswer);
els.randomButton.addEventListener("click", () => selectQuestion(questions[Math.floor(Math.random() * questions.length)].id));
els.speakSampleButton.addEventListener("click", () => speak(currentQuestion().answer));
els.readAloudButton.addEventListener("click", () => {
  if (state.readChecking) {
    stopReadAloudCheck();
  } else {
    startReadAloudCheck();
  }
});
els.copySentencesButton.addEventListener("click", async () => {
  const text = practiceSentencesFor(currentQuestion())
    .map((entry, index) => `${index + 1}. ${entry.pattern}\ne.g. ${entry.example}`)
    .join("\n\n");
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
