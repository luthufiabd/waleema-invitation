// ---------- Envelope open ----------
(function(){
  const envelope = document.getElementById('envelope');
  const overlay = document.getElementById('envelopeOverlay');
  let opened = false;

  function openEnvelope(){
    if (opened) return;
    opened = true;
    overlay.classList.add('zoomed-out');
    setTimeout(() => overlay.classList.add('rise'), 950);
    setTimeout(() => envelope.classList.add('opening'), 1750);
    setTimeout(() => overlay.classList.add('page-opening'), 2050);
    setTimeout(() => {
      overlay.classList.add('overlay-hide');
      document.body.classList.remove('lock-scroll');
    }, 2550);
  }
  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
})();

// ---------- Scroll reveal ----------
(function(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
})();

// ---------- Scroll cue ----------
document.getElementById('scrollCue').addEventListener('click', () => {
  document.getElementById('eventSection').scrollIntoView({ behavior: 'smooth' });
});

// ---------- Countdown ----------
(function(){
  const eventDate = new Date('2026-08-16T11:00:00+05:30');
  const daysEl = document.getElementById('cdDays');
  const hoursEl = document.getElementById('cdHours');
  const minsEl = document.getElementById('cdMins');
  const secsEl = document.getElementById('cdSecs');
  const row = document.getElementById('countdownRow');
  const started = document.getElementById('countdownStarted');
  function pad(n){ return String(n).padStart(2, '0'); }
  function tick(){
    const diff = eventDate.getTime() - Date.now();
    if (diff <= 0){
      row.classList.add('hidden');
      started.classList.remove('hidden');
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    daysEl.textContent = pad(d);
    hoursEl.textContent = pad(h);
    minsEl.textContent = pad(m);
    secsEl.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

// ---------- Add to calendar ----------
function icsUTC(date){
  const pad = n => String(n).padStart(2, '0');
  return date.getUTCFullYear() + pad(date.getUTCMonth()+1) + pad(date.getUTCDate()) +
    'T' + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + 'Z';
}
document.getElementById('calendarBtn').addEventListener('click', () => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luthufi and Lujeen//Waleema Invitation//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + Date.now() + '-waleema@invitation',
    'DTSTAMP:' + icsUTC(new Date()),
    'DTSTART:20260816T053000Z',
    'DTEND:20260816T083000Z',
    'SUMMARY:Waleema — Luthufi & Lujeen',
    'DESCRIPTION:Join us to celebrate the Waleema of Luthufi Abdul Latheef and Lujeen Abdul Jabbar.',
    'LOCATION:Fora Castle Auditorium\\, Chemrakkattur - Areecode - Kondotty Rd',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const ics = lines.join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Waleema-Luthufi-Lujeen.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
});

// ---------- Storage helpers ----------
async function submitRSVP(name, status, guests){
  const id = 'rsvp:' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const record = { name, status, guests, timestamp: new Date().toISOString() };
  try {
    const result = await window.storage.set(id, JSON.stringify(record), true);
    return !!result;
  } catch (e) {
    console.error('RSVP save failed', e);
    return false;
  }
}
async function loadAllRSVPs(){
  try {
    const listResult = await window.storage.list('rsvp:', true);
    if (!listResult || !listResult.keys) return [];
    const records = [];
    for (const key of listResult.keys){
      try {
        const res = await window.storage.get(key, true);
        if (res && res.value) records.push(JSON.parse(res.value));
      } catch (e) { /* skip broken record */ }
    }
    return records;
  } catch (e) {
    console.error('Failed to load RSVPs', e);
    return [];
  }
}
function timeAgo(isoString){
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return min + (min === 1 ? ' min ago' : ' mins ago');
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + (hr === 1 ? ' hour ago' : ' hours ago');
  const day = Math.floor(hr / 24);
  return day + (day === 1 ? ' day ago' : ' days ago');
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- RSVP form ----------
(function(){
  let chosenStatus = null;
  let guestCount = 1;
  const nameInput = document.getElementById('rsvpName');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');
  const guestStepper = document.getElementById('guestStepper');
  const guestCountEl = document.getElementById('guestCount');
  const sendBtn = document.getElementById('sendRsvpBtn');
  const formWrap = document.getElementById('rsvpFormWrap');
  const thankWrap = document.getElementById('rsvpThankYou');
  const errorEl = document.getElementById('rsvpError');

  function refreshSendState(){
    sendBtn.disabled = !chosenStatus;
  }
  nameInput.addEventListener('input', refreshSendState);

  acceptBtn.addEventListener('click', () => {
    chosenStatus = 'accepted';
    acceptBtn.classList.add('selected');
    declineBtn.classList.remove('selected');
    guestStepper.classList.remove('hidden');
    void guestStepper.offsetWidth;
    guestStepper.classList.add('stepper-visible');
    refreshSendState();
  });
  declineBtn.addEventListener('click', () => {
    chosenStatus = 'declined';
    declineBtn.classList.add('selected');
    acceptBtn.classList.remove('selected');
    guestStepper.classList.remove('stepper-visible');
    guestStepper.classList.add('hidden');
    refreshSendState();
  });
  document.getElementById('guestMinus').addEventListener('click', () => {
    if (guestCount > 1){ guestCount--; guestCountEl.textContent = guestCount; }
  });
  document.getElementById('guestPlus').addEventListener('click', () => {
    if (guestCount < 10){ guestCount++; guestCountEl.textContent = guestCount; }
  });

  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    errorEl.classList.add('hidden');
    const name = nameInput.value.trim();
    const guests = chosenStatus === 'accepted' ? guestCount : 0;
    let ok = await submitRSVP(name, chosenStatus, guests);
    if (!ok) {
      ok = await submitRSVP(name, chosenStatus, guests); // one silent retry
    }
    let msg;
    if (chosenStatus === 'accepted'){
      const who = name ? `Thank you, ${name}!` : `Thank you!`;
      msg = guests > 1
        ? `${who} We can't wait to celebrate with you and your ${guests - 1} guest${guests - 1 > 1 ? 's' : ''}.`
        : `${who} We can't wait to celebrate with you.`;
    } else {
      msg = name ? `Thank you for letting us know, ${name}.` : `Thank you for letting us know.`;
    }

    const thankIcon = document.getElementById('thankIcon');
    const thankMsg = document.getElementById('thankMsg');
    thankMsg.textContent = msg;

    formWrap.classList.add('fading-out');
    setTimeout(() => {
      formWrap.classList.add('hidden');
      thankWrap.classList.remove('hidden');
      void thankWrap.offsetWidth;
      thankWrap.classList.add('visible');
      if (chosenStatus === 'accepted') {
        thankIcon.classList.remove('hidden');
        void thankIcon.offsetWidth;
        thankIcon.classList.add('visible');
      }
    }, 350);
  });
})();

// ---------- Host dashboard ----------
(function(){
  const dashOverlay = document.getElementById('dashboardOverlay');
  const hostLink = document.getElementById('hostDashboardLink');
  const dashClose = document.getElementById('dashboardClose');
  const passcodeScreen = document.getElementById('passcodeScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const passcodeInput = document.getElementById('passcodeInput');
  const passcodeError = document.getElementById('passcodeError');
  const unlockBtn = document.getElementById('unlockBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const lockBtn = document.getElementById('lockBtn');
  const listEl = document.getElementById('responseList');

  hostLink.addEventListener('click', () => dashOverlay.classList.remove('hidden'));
  dashClose.addEventListener('click', () => dashOverlay.classList.add('hidden'));

  unlockBtn.addEventListener('click', async () => {
    if (passcodeInput.value === '1608'){
      passcodeError.classList.add('hidden');
      passcodeScreen.classList.add('hidden');
      dashboardScreen.classList.remove('hidden');
      await refreshDashboard();
    } else {
      passcodeInput.classList.add('shake');
      passcodeError.classList.remove('hidden');
      setTimeout(() => passcodeInput.classList.remove('shake'), 400);
    }
  });
  refreshBtn.addEventListener('click', refreshDashboard);
  lockBtn.addEventListener('click', () => {
    dashboardScreen.classList.add('hidden');
    passcodeScreen.classList.remove('hidden');
    passcodeInput.value = '';
  });

  async function refreshDashboard(){
    listEl.innerHTML = '<p class="dash-loading">Loading…</p>';
    const records = await loadAllRSVPs();
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const accepted = records.filter(r => r.status === 'accepted');
    const declined = records.filter(r => r.status === 'declined');
    const totalGuests = accepted.reduce((sum, r) => sum + (r.guests || 0), 0);

    document.getElementById('statAccepted').textContent = accepted.length;
    document.getElementById('statDeclined').textContent = declined.length;
    document.getElementById('statGuests').textContent = totalGuests;

    if (records.length === 0){
      listEl.innerHTML = '<p class="dash-empty">No responses yet.</p>';
      return;
    }
    listEl.innerHTML = records.map(r => `
      <div class="dash-row">
        <div class="dash-row-main">
          <span class="dash-name">${escapeHtml(r.name || 'Guest')}</span>
          <span class="dash-badge ${r.status}">${r.status === 'accepted' ? 'Accepted' : 'Declined'}</span>
        </div>
        <div class="dash-row-meta">
          <span>${r.status === 'accepted' ? (r.guests || 1) + ' guest' + ((r.guests || 1) > 1 ? 's' : '') : '—'}</span>
          <span>${timeAgo(r.timestamp)}</span>
        </div>
      </div>
    `).join('');
  }
})();
