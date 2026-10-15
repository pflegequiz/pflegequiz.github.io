(function () {
  'use strict';

  var TIME_LIMIT = 30; // Sekunden pro Frage
  var MAX_POINTS = 1000;
  var ACCESS_CODE = '4713'; // Zugangscode, wird in der Schulung genannt

  var QUESTIONS = [
    {
      q: 'Wann sollen die Fersen postoperativ freigelagert werden?',
      a: [
        'Immer',
        'Sobald der Patient an den Fersen Schmerzen angibt',
        'Sobald an mind. einer Ferse eine Rötung erkennbar ist',
        'Wenn ich ein Mepilex border heel darauf geklebt habe, benötigt es keine Freilagerung mehr.'
      ],
      correct: [0]
    },
    {
      q: 'Was muss ich tun, wenn ich ein AMS Bett für einen Patienten benötige?',
      a: [
        'Im Factsheet nachlesen, die Hotline anrufen und mir ein AMS Bett liefern lassen.',
        'Im Bettendepot das AMS Bett holen und dieses anschliessend online anmelden.',
        'Nur das AMS Bett aus dem Bettendepot holen.'
      ],
      correct: [1]
    },
    {
      q: 'Wie fülle ich das Dekubitusereignisformular korrekt aus?',
      a: [
        'Sobald ich Zeit habe ein Wundfoto vom Dekubitus zu machen',
        'Sobald ich den Dekubitus das erste Mal gesehen habe den oberen Teil, bei Austritt den unteren Teil bzgl. Abheilung.',
        'Haben wir nicht im Bethesda Spital'
      ],
      correct: [1]
    },
    {
      q: 'Brauche ich unter einem Mepilex border (flex) (Schaumstoffverband auf Silikonbasis) ein Mepitel One (Wunddistanzgitter)?',
      a: [
        'Je nach Wunde zum Schutz, damit der Verband nicht mit dem Wundgrund verklebt.',
        'Ja unbedingt immer zusammen verwenden.',
        'Nein, brauche ich nicht.'
      ],
      correct: [2]
    },
    {
      q: 'Reicht eine gute Hautpflege aus für die Dekubitusprävention bei gefährdeten Patienten?',
      a: [
        'Ja, solange die Haut intakt ist',
        'Nein, es benötigt unbedingt Druckentlastung',
        'Nein, die Hautpflege braucht es bei der Dekubitusprävention nicht, ein moderner Schaumstoffverband ist die bessere Prophylaxe'
      ],
      correct: [1]
    },
    {
      q: 'Was muss bei einem AMS Bett jede Schicht überprüft werden?',
      a: [
        'Ob der Patient es noch benötigt.',
        'Ob das Bett läuft.',
        'Ob das Bett eingesteckt ist.'
      ],
      correct: [1, 2]
    }
  ];

  var SHAPES = [
    '<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 2l10 10-10 10L2 12 12 2z"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>',
    '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
  ];
  var LETTERS = ['A', 'B', 'C', 'D'];

  var $ = function (id) { return document.getElementById(id); };
  var screens = {
    start: $('screen-start'),
    question: $('screen-question'),
    feedback: $('screen-feedback'),
    result: $('screen-result'),
    qr: $('screen-qr')
  };

  var state = {
    name: '',
    index: 0,
    score: 0,
    selected: [],
    locked: false,
    startedAt: 0,
    timerId: null,
    remaining: TIME_LIMIT,
    log: [],
    previousScreen: 'start'
  };

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('is-active', k === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function currentScreen() {
    for (var k in screens) if (screens[k].classList.contains('is-active')) return k;
    return 'start';
  }

  function startQuiz(name) {
    state.name = name;
    state.index = 0;
    state.score = 0;
    state.log = [];
    renderQuestion();
    show('question');
  }

  function renderQuestion() {
    var item = QUESTIONS[state.index];
    state.selected = [];
    state.locked = false;

    $('progressChip').textContent = 'Frage ' + (state.index + 1) + ' / ' + QUESTIONS.length;
    $('scoreChip').textContent = state.score + ' Punkte';
    $('questionText').textContent = item.q;

    var multi = item.correct.length > 1;
    $('multiHint').hidden = !multi;
    $('confirmWrap').hidden = !multi;
    $('confirmBtn').disabled = true;

    var wrap = $('answers');
    wrap.innerHTML = '';
    wrap.classList.remove('is-revealed');
    wrap.classList.toggle('is-single-col', item.a.some(function (t) { return t.length > 70; }));

    item.a.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer';
      btn.setAttribute('data-i', String(i));
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML =
        '<span class="answer__shape" aria-hidden="true">' + SHAPES[i] + '</span>' +
        '<span><span class="answer__text"></span><span class="answer__mark" hidden></span></span>';
      btn.querySelector('.answer__text').textContent = LETTERS[i] + ') ' + text;
      btn.addEventListener('click', function () { onAnswer(i, multi); });
      wrap.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    stopTimer();
    state.remaining = TIME_LIMIT;
    state.startedAt = Date.now();
    updateTimerUI();
    state.timerId = setInterval(function () {
      var elapsed = (Date.now() - state.startedAt) / 1000;
      state.remaining = Math.max(0, TIME_LIMIT - elapsed);
      updateTimerUI();
      if (state.remaining <= 0) {
        stopTimer();
        evaluate(true);
      }
    }, 200);
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  function updateTimerUI() {
    var pct = (state.remaining / TIME_LIMIT) * 100;
    var bar = $('timerBar');
    bar.style.width = pct + '%';
    bar.classList.toggle('is-low', state.remaining <= 5);
    $('timerText').textContent = Math.ceil(state.remaining);
  }

  function onAnswer(i, multi) {
    if (state.locked) return;
    var buttons = $('answers').querySelectorAll('.answer');
    if (multi) {
      var pos = state.selected.indexOf(i);
      if (pos >= 0) state.selected.splice(pos, 1); else state.selected.push(i);
      buttons[i].classList.toggle('is-selected', pos < 0);
      buttons[i].setAttribute('aria-pressed', pos < 0 ? 'true' : 'false');
      $('confirmBtn').disabled = state.selected.length === 0;
    } else {
      state.selected = [i];
      buttons[i].classList.add('is-selected');
      evaluate(false);
    }
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.slice().sort(), sb = b.slice().sort();
    for (var i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
    return true;
  }

  function evaluate(timedOut) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();

    var item = QUESTIONS[state.index];
    var elapsed = (Date.now() - state.startedAt) / 1000;
    var correct = !timedOut && arraysEqual(state.selected, item.correct);
    var points = 0;
    if (correct) {
      var frac = Math.min(1, elapsed / TIME_LIMIT);
      points = Math.round(MAX_POINTS * (1 - frac / 2));
    }
    state.score += points;

    state.log.push({ q: item.q, correct: correct, timedOut: timedOut, chosen: state.selected.slice(), points: points });

    // reveal
    var wrap = $('answers');
    wrap.classList.add('is-revealed');
    wrap.querySelectorAll('.answer').forEach(function (btn, i) {
      btn.disabled = true;
      var mark = btn.querySelector('.answer__mark');
      if (item.correct.indexOf(i) >= 0) {
        btn.classList.add('is-correct');
        mark.hidden = false;
        mark.textContent = 'Richtig';
      } else if (state.selected.indexOf(i) >= 0) {
        mark.hidden = false;
        mark.textContent = 'Deine Wahl';
      }
    });
    $('confirmWrap').hidden = true;

    setTimeout(function () { renderFeedback(correct, timedOut, points, item); }, 900);
  }

  function renderFeedback(correct, timedOut, points, item) {
    var card = $('feedbackCard');
    card.classList.toggle('is-bad', !correct);
    $('feedbackVerdict').textContent = correct ? 'Richtig!' : (timedOut ? 'Zeit abgelaufen' : 'Leider falsch');
    $('feedbackPoints').textContent = correct ? '+' + points + ' Punkte' : '+0 Punkte · Gesamt ' + state.score;
    if (correct) $('feedbackPoints').textContent += ' · Gesamt ' + state.score;

    var ul = $('feedbackSolution');
    ul.innerHTML = '';
    item.correct.forEach(function (ci) {
      var li = document.createElement('li');
      li.textContent = LETTERS[ci] + ') ' + item.a[ci];
      ul.appendChild(li);
    });

    $('nextBtn').textContent = state.index + 1 < QUESTIONS.length ? 'Nächste Frage' : 'Ergebnis anzeigen';
    show('feedback');
  }

  function next() {
    state.index += 1;
    if (state.index >= QUESTIONS.length) {
      renderResult();
      show('result');
    } else {
      renderQuestion();
      show('question');
    }
  }

  function renderResult() {
    var right = state.log.filter(function (l) { return l.correct; }).length;
    var total = QUESTIONS.length;
    var pct = Math.round((right / total) * 100);

    var title;
    if (right === total) title = 'Perfekt, ' + state.name + '!';
    else if (right >= total - 1) title = 'Stark, ' + state.name + '!';
    else if (right >= Math.ceil(total / 2)) title = 'Gut gemacht, ' + state.name;
    else title = 'Dranbleiben, ' + state.name;
    $('resultTitle').textContent = title;

    $('resultPoints').textContent = String(state.score);
    $('resultSummary').textContent = right + ' von ' + total + ' Fragen richtig (' + pct + ' %).';
    setTimeout(function () { $('resultBarFill').style.width = pct + '%'; }, 50);

    var ol = $('review');
    ol.innerHTML = '';
    state.log.forEach(function (l, i) {
      var li = document.createElement('li');
      var icon = document.createElement('span');
      icon.className = 'review__icon ' + (l.correct ? 'ok' : 'bad');
      icon.textContent = l.correct ? '✓' : '✕';
      var body = document.createElement('span');
      var q = document.createElement('span');
      q.className = 'review__q';
      q.textContent = (i + 1) + '. ' + l.q;
      var a = document.createElement('span');
      a.className = 'review__a';
      var item = QUESTIONS[i];
      a.textContent = 'Richtig: ' + item.correct.map(function (c) { return LETTERS[c]; }).join(' + ') +
        (l.correct ? ' · +' + l.points + ' Punkte' : (l.timedOut ? ' · keine Antwort' : ' · deine Wahl: ' + l.chosen.map(function (c) { return LETTERS[c]; }).join(' + ')));
      body.appendChild(q);
      body.appendChild(a);
      li.appendChild(icon);
      li.appendChild(body);
      ol.appendChild(li);
    });
  }

  // QR-Code
  function openQr() {
    state.previousScreen = currentScreen();
    var url = window.location.href.split('#')[0];
    $('qrUrl').textContent = url;
    var canvas = $('qrCanvas');
    if (window.QRCode && window.QRCode.toCanvas) {
      window.QRCode.toCanvas(canvas, url, { width: 520, margin: 1, color: { dark: '#15302b', light: '#ffffff' } }, function (err) {
        if (err) { $('qrUrl').textContent = 'QR-Code konnte nicht erzeugt werden. Link: ' + url; }
      });
    } else {
      $('qrUrl').textContent = 'QR-Code konnte nicht geladen werden. Link: ' + url;
    }
    show('qr');
  }

  function closeQr() {
    var target = state.previousScreen === 'question' ? 'start' : state.previousScreen;
    show(target);
  }

  // Events
  $('startForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('accessCode').value.replace(/\s+/g, '');
    var name = $('playerName').value.trim();
    if (code !== ACCESS_CODE) {
      $('codeError').hidden = false;
      $('accessCode').classList.add('is-invalid');
      $('accessCode').focus();
      return;
    }
    $('codeError').hidden = true;
    $('accessCode').classList.remove('is-invalid');
    if (!name) return;
    startQuiz(name);
  });
  $('accessCode').addEventListener('input', function () {
    $('codeError').hidden = true;
    $('accessCode').classList.remove('is-invalid');
  });
  $('confirmBtn').addEventListener('click', function () { evaluate(false); });
  $('nextBtn').addEventListener('click', next);
  $('restartBtn').addEventListener('click', function () {
    show('start');
    $('playerName').focus();
  });
  $('qrBtn').addEventListener('click', function () {
    if (currentScreen() === 'question' && !state.locked) {
      if (!window.confirm('Laufende Frage abbrechen und QR-Code anzeigen?')) return;
      stopTimer();
    }
    openQr();
  });
  $('resultQrBtn').addEventListener('click', openQr);
  $('qrBackBtn').addEventListener('click', closeQr);
  $('brandLink').addEventListener('click', function (e) {
    e.preventDefault();
    if (currentScreen() === 'question' && !state.locked) {
      if (!window.confirm('Quiz abbrechen und zur Startseite?')) return;
    }
    stopTimer();
    show('start');
  });
})();
