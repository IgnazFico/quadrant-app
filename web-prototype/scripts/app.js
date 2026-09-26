// =========================================================
// QUADRANT — COMPLETE WEB APPLICATION SCRIPT
// =========================================================

// Domain palette mapping
const DOMAIN_COLOR = {
  career: '#F97316',
  family: '#1E3A8A',
  growth: '#FB923C',
  health: '#22C55E',
  relationships: '#FACC15',
  community: '#F97316',
  values: '#1E3A8A',
};
function domainColor(d) { return DOMAIN_COLOR[d] ?? '#F97316'; }

// ---------------------------------------------------------
// DATA MODEL (Dynamic State)
// ---------------------------------------------------------
let ROLES = [
  {
    id: 'r1', label: 'Career', domain: 'career', tenureYears: 2, isFeatured: true, ringVotes: 18,
    goals: [
      { id: 'g1', title: 'Write feature specification', done: true },
      { id: 'g2', title: 'Code review PR #24', done: true },
      { id: 'g3', title: 'Draft Q4 engineering roadmap', done: false },
    ]
  },
  {
    id: 'r2', label: 'Health', domain: 'health', tenureYears: 1, isFeatured: true, ringVotes: 14,
    goals: [
      { id: 'g4', title: 'Morning run 5km × 4', done: true },
      { id: 'g5', title: 'Meal prep Sunday', done: false },
    ]
  },
  {
    id: 'r3', label: 'Family', domain: 'family', tenureYears: 1, isFeatured: false, ringVotes: 10,
    goals: [
      { id: 'g6', title: 'Sunday dinner with parents', done: false },
      { id: 'g7', title: 'Plan weekend nature trip', done: false },
      { id: 'g8', title: 'Call sister Wednesday evening', done: false },
    ]
  },
  {
    id: 'r4', label: 'Growth', domain: 'growth', tenureYears: 1, isFeatured: false, ringVotes: 8,
    goals: [
      { id: 'g9', title: 'Read 30 minutes daily (Deep Work)', done: false },
      { id: 'g10', title: 'Daily evening reflection note', done: true },
    ]
  },
];

let openRoleId = 'r1';

let todayBlocks = [
  { id: 'b1', roleId: 'r2', domain: 'health', time: '8 AM', title: 'Morning run 5km' },
  { id: 'b2', roleId: 'r1', domain: 'career', time: '10 AM', title: 'Deep focus: Feature specification' },
];

// Schedule matrix items
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let scheduleBlocks = [
  { day: 0, hour: 8,  domain: 'health', title: 'Morning run' },
  { day: 0, hour: 10, domain: 'career', title: 'Deep focus' },
  { day: 1, hour: 10, domain: 'career', title: 'Architecture spec' },
  { day: 2, hour: 8,  domain: 'health', title: 'Gym strength' },
  { day: 2, hour: 14, domain: 'family', title: 'Family video call' },
  { day: 3, hour: 10, domain: 'career', title: 'PR reviews' },
  { day: 4, hour: 14, domain: 'family', title: 'Date night' },
];
let weekOffset = 0;

// Last week's review state
let reviewGoals = [
  { id: 'rg1', role: 'Career', domain: 'career', title: 'Ship v1 schema migration', status: 'DONE' },
  { id: 'rg2', role: 'Health', domain: 'health', title: 'Daily hydration tracker', status: 'DONE' },
  { id: 'rg3', role: 'Family', domain: 'family', title: 'Family board game night', status: 'DONE' },
  { id: 'rg4', role: 'Growth', domain: 'growth', title: 'Finish chapter 4 Atomic Habits', status: 'DONE' },
  { id: 'rg5', role: 'Career', domain: 'career', title: 'Draft Q4 engineering roadmap', status: 'UNRESOLVED', choice: null, reason: '' },
  { id: 'rg6', role: 'Family', domain: 'family', title: 'Call high school mentor', status: 'UNRESOLVED', choice: null, reason: '' },
];
let activeReviewGoalId = 'rg5';

// Living Mission Statement state
let missionData = {
  a1: 'someone who shows up with calmness and craftsmanship, even when days are noisy',
  a2: 'software that restores agency and balance, and deep presence for family',
  a3: 'daily sleep, physical health, and emotional honesty',
  a4: 'Doing more is not the same as living well.',
  signedName: 'Alex Morgan',
};

// ---------------------------------------------------------
// SVG RING GENERATOR
// ---------------------------------------------------------
function ringSvg(color, progress, size = 30, strokeWidth = 3) {
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(progress, 0), 1));
  const cx = size / 2;
  const cy = size / 2;
  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ring-svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F3F4F6" stroke-width="${strokeWidth}" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})" style="transition: stroke-dashoffset 0.6s ease;" />
    </svg>
  `;
}

// ---------------------------------------------------------
// NAVIGATION (Sidebar, Breadcrumbs, URL Hashes)
// ---------------------------------------------------------
const ALL_PAGES = ['goals', 'review', 'schedule', 'patterns', 'profile', 'mission', 'year-review'];

function navigateTo(pageId) {
  if (!ALL_PAGES.includes(pageId)) pageId = 'goals';

  // Toggle active view
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');

  // Toggle sidebar items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Render on view
  if (pageId === 'goals') renderGoalsPage();
  if (pageId === 'review') renderReviewPage();
  if (pageId === 'schedule') renderSchedulePage();
  if (pageId === 'patterns') renderPatternsPage();
  if (pageId === 'profile') renderProfilePage();
  if (pageId === 'mission') renderMissionStudio();
  if (pageId === 'year-review') renderYearReview();

  // Keep window hash in sync without reloading
  if (window.location.hash.replace('#', '') !== pageId) {
    history.replaceState(null, '', '#' + pageId);
  }
}

// Sidebar link listeners
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(btn.dataset.page);
  });
});

// Breadcrumb & intra-page navigation
document.querySelectorAll('[data-page]').forEach(el => {
  if (!el.classList.contains('nav-item')) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  }
});

// Hash change router
window.addEventListener('hashchange', () => {
  const h = window.location.hash.replace('#', '');
  if (ALL_PAGES.includes(h)) navigateTo(h);
});

// ---------------------------------------------------------
// 1. THIS WEEK & TODAY LOGIC
// ---------------------------------------------------------
function getDoneCount() {
  return ROLES.reduce((sum, r) => sum + r.goals.filter(g => g.done).length, 0);
}
function getTotalGoalsCount() {
  return ROLES.reduce((sum, r) => sum + r.goals.length, 0);
}

function renderGoalsPage() {
  renderTodayBlocks();
  renderWeeklySummaryBars();
  renderRoleGoalsList();

  const done = getDoneCount();
  const total = getTotalGoalsCount();
  const text = `${done} of ${total} done`;

  const p1 = document.getElementById('goals-progress');
  const p2 = document.getElementById('roles-progress');
  if (p1) p1.textContent = text;
  if (p2) p2.textContent = text;

  // Review banner state
  const unresolved = reviewGoals.filter(g => g.status === 'UNRESOLVED').length;
  const banner = document.getElementById('review-gate-banner');
  const navBadge = document.getElementById('nav-review-badge');
  if (unresolved === 0) {
    if (banner) banner.style.display = 'none';
    if (navBadge) navBadge.style.display = 'none';
  } else {
    if (banner) banner.style.display = 'flex';
    if (navBadge) {
      navBadge.style.display = 'inline-block';
      navBadge.textContent = `${unresolved} Due`;
    }
  }
}

function renderTodayBlocks() {
  const container = document.getElementById('today-blocks');
  if (!container) return;

  if (todayBlocks.length === 0) {
    container.innerHTML = `
      <p style="padding: 24px 12px; text-align: center; font-size: 13px; color: #9CA3AF;">
        Nothing scheduled yet for today. Pull a high-leverage Quadrant II goal below.
      </p>
    `;
  } else {
    container.innerHTML = todayBlocks.map(b => `
      <div class="today-block" style="--role-color:${domainColor(b.domain)}">
        <span class="block-time">${b.time}</span>
        <div class="block-card">
          <div class="block-title">${b.title}</div>
          <div class="block-role">${b.domain}</div>
        </div>
        <button class="block-remove" data-id="${b.id}" title="Remove block">&times;</button>
      </div>
    `).join('');
  }

  const countEl = document.getElementById('today-count');
  if (countEl) countEl.textContent = `${todayBlocks.length} scheduled`;

  container.querySelectorAll('.block-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      todayBlocks = todayBlocks.filter(b => b.id !== btn.dataset.id);
      renderTodayBlocks();
    });
  });
}

function renderWeeklySummaryBars() {
  const container = document.getElementById('progress-bars');
  if (!container) return;

  container.innerHTML = ROLES.map(r => {
    const done = r.goals.filter(g => g.done).length;
    const total = r.goals.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
      <div class="progress-bar-row">
        <span class="progress-role-name">${r.label}</span>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%; background:${domainColor(r.domain)};"></div>
        </div>
        <span class="progress-frac">${done}/${total}</span>
      </div>
    `;
  }).join('');
}

function renderRoleGoalsList() {
  const container = document.getElementById('roles-list');
  if (!container) return;

  container.innerHTML = ROLES.map(role => {
    const done = role.goals.filter(g => g.done).length;
    const total = role.goals.length;
    const isOpen = role.id === openRoleId;
    const color = domainColor(role.domain);

    return `
      <div class="role-card" style="--role-color:${color};" data-role-id="${role.id}">
        <div class="role-card-header" data-toggle-role="${role.id}">
          <div class="role-header-left">
            <span class="role-label">${role.label}</span>
            <span class="role-progress-count">${done}/${total}</span>
          </div>
          <svg class="role-chevron ${isOpen ? 'open' : ''}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        ${isOpen ? `
          <div class="role-card-body">
            ${role.goals.map(g => `
              <div class="goal-item" data-goal-id="${g.id}">
                <div class="goal-checkbox ${g.done ? 'checked' : ''}" data-check-goal="${g.id}" data-role-id="${role.id}"></div>
                <span class="goal-title ${g.done ? 'done' : ''}">${g.title}</span>
                <button class="goal-action-btn" title="Add to today" data-quick-schedule="${g.id}" data-role-id="${role.id}">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
                  </svg>
                </button>
                <button class="goal-action-btn delete" title="Delete goal" data-delete-goal="${g.id}" data-role-id="${role.id}">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            `).join('')}

            <div class="add-goal-row">
              <input class="add-goal-input" placeholder="Add a goal for ${role.label}..." data-role-id="${role.id}" />
              <button class="add-goal-submit" data-add-goal="${role.id}">+</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Attach event handlers
  container.querySelectorAll('[data-toggle-role]').forEach(el => {
    el.addEventListener('click', () => {
      const rid = el.dataset.toggleRole;
      openRoleId = (openRoleId === rid) ? null : rid;
      renderRoleGoalsList();
    });
  });

  container.querySelectorAll('[data-check-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.checkGoal;
      const rid = btn.dataset.roleId;
      const role = ROLES.find(r => r.id === rid);
      const goal = role?.goals.find(g => g.id === gid);
      if (goal) {
        goal.done = !goal.done;
        // If completed, add a vote to growth ring
        if (goal.done) role.ringVotes = (role.ringVotes || 0) + 1;
        renderGoalsPage();
      }
    });
  });

  container.querySelectorAll('[data-delete-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.deleteGoal;
      const rid = btn.dataset.roleId;
      const role = ROLES.find(r => r.id === rid);
      if (role) {
        role.goals = role.goals.filter(g => g.id !== gid);
        renderGoalsPage();
      }
    });
  });

  container.querySelectorAll('[data-quick-schedule]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.quickSchedule;
      const rid = btn.dataset.roleId;
      const role = ROLES.find(r => r.id === rid);
      const goal = role?.goals.find(g => g.id === gid);
      if (goal && role) {
        todayBlocks.push({
          id: 'b' + Date.now(),
          roleId: rid,
          domain: role.domain,
          time: '1:00 PM',
          title: goal.title,
        });
        renderTodayBlocks();
      }
    });
  });

  container.querySelectorAll('[data-add-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.addGoal;
      const input = container.querySelector(`.add-goal-input[data-role-id="${rid}"]`);
      const val = input?.value.trim();
      if (!val) return;
      const role = ROLES.find(r => r.id === rid);
      if (role) {
        role.goals.push({ id: 'g' + Date.now(), title: val, done: false });
        renderGoalsPage();
      }
    });
  });

  container.querySelectorAll('.add-goal-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const rid = input.dataset.roleId;
        container.querySelector(`[data-add-goal="${rid}"]`)?.click();
      }
    });
  });
}

// Add block to today form toggle
const addBlockBtn = document.getElementById('add-block-btn');
const addBlockForm = document.getElementById('add-block-form');
const cancelBlockBtn = document.getElementById('cancel-block');
const submitBlockBtn = document.getElementById('submit-block');

addBlockBtn?.addEventListener('click', () => {
  addBlockForm?.classList.remove('hidden');
  addBlockBtn?.classList.add('hidden');
});
cancelBlockBtn?.addEventListener('click', () => {
  addBlockForm?.classList.add('hidden');
  addBlockBtn?.classList.remove('hidden');
});

// Handle custom goal dropdown change
const formGoalSelect = document.getElementById('form-goal');
const formCustomInput = document.getElementById('form-custom-title');
formGoalSelect?.addEventListener('change', () => {
  if (formGoalSelect.value === '__custom__') {
    formCustomInput?.classList.remove('hidden');
  } else {
    formCustomInput?.classList.add('hidden');
  }
});

submitBlockBtn?.addEventListener('click', () => {
  const roleSelect = document.getElementById('form-role');
  const timeInput = document.getElementById('form-time');
  const roleId = roleSelect?.value || 'r1';
  const role = ROLES.find(r => r.id === roleId);
  const timeVal = timeInput?.value || '09:00';
  const [h] = timeVal.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;

  let title = formGoalSelect?.value;
  if (title === '__custom__') title = formCustomInput?.value.trim();
  if (!title) title = 'Focus Session';

  todayBlocks.push({
    id: 'b' + Date.now(),
    roleId,
    domain: role?.domain || 'career',
    time: `${h12}:00 ${period}`,
    title,
  });

  addBlockForm?.classList.add('hidden');
  addBlockBtn?.classList.remove('hidden');
  renderTodayBlocks();
});

document.getElementById('btn-open-review')?.addEventListener('click', () => {
  navigateTo('review');
});

// ---------------------------------------------------------
// 2. WEEKLY REVIEW & TRUTH-TELLING STUDIO
// ---------------------------------------------------------
function renderReviewPage() {
  const doneList = document.getElementById('review-completed-list');
  const unresList = document.getElementById('review-unresolved-list');

  const doneGoals = reviewGoals.filter(g => g.status === 'DONE');
  const unresolvedGoals = reviewGoals.filter(g => g.status === 'UNRESOLVED');

  // Stats
  const doneStat = document.getElementById('review-done-stat');
  const pendingStat = document.getElementById('review-pending-stat');
  const rateStat = document.getElementById('review-rate-stat');

  if (doneStat) doneStat.textContent = doneGoals.length;
  if (pendingStat) pendingStat.textContent = unresolvedGoals.length;
  if (rateStat) {
    const rate = Math.round((doneGoals.length / reviewGoals.length) * 100);
    rateStat.textContent = `${rate}%`;
  }

  // Render completed list
  if (doneList) {
    doneList.innerHTML = doneGoals.map(g => `
      <div class="review-goal-card resolved">
        <div class="review-goal-left">
          <span class="review-role-pill" style="border-left: 3px solid ${domainColor(g.domain)};">${g.role}</span>
          <span class="review-goal-name" style="text-decoration: line-through; color: #9CA3AF;">${g.title}</span>
        </div>
        <span class="review-status-pill status-done">Done</span>
      </div>
    `).join('');
  }

  // Render unresolved list
  if (unresList) {
    if (unresolvedGoals.length === 0) {
      unresList.innerHTML = `
        <div style="padding: 16px; text-align: center; font-size: 12px; color: #059669; background: #ECFDF5; border-radius: 8px;">
          All goals for this week have been honestly addressed!
        </div>
      `;
    } else {
      unresList.innerHTML = unresolvedGoals.map(g => {
        const isActive = g.id === activeReviewGoalId;
        const statusLabel = g.choice ? (g.choice === 'CARRY' ? 'Carried' : 'Let Go') : 'Pending';
        const statusClass = g.choice ? (g.choice === 'CARRY' ? 'status-carry' : 'status-cancel') : 'status-pending';

        return `
          <div class="review-goal-card ${isActive ? 'active' : ''}" data-review-select="${g.id}">
            <div class="review-goal-left">
              <span class="review-role-pill" style="border-left: 3px solid ${domainColor(g.domain)};">${g.role}</span>
              <span class="review-goal-name">${g.title}</span>
            </div>
            <span class="review-status-pill ${statusClass}">${statusLabel}</span>
          </div>
        `;
      }).join('');

      unresList.querySelectorAll('[data-review-select]').forEach(card => {
        card.addEventListener('click', () => {
          activeReviewGoalId = card.dataset.reviewSelect;
          renderReviewStudioCard();
          renderReviewPage();
        });
      });
    }
  }

  renderReviewStudioCard();
}

function renderReviewStudioCard() {
  const activeGoal = reviewGoals.find(g => g.id === activeReviewGoalId);
  const studioBody = document.getElementById('studio-body');
  const studioComplete = document.getElementById('studio-complete-state');
  const unresolvedLeft = reviewGoals.filter(g => g.status === 'UNRESOLVED' && !g.choice);

  if (unresolvedLeft.length === 0 && !activeGoal) {
    if (studioBody) studioBody.classList.add('hidden');
    if (studioComplete) studioComplete.classList.remove('hidden');
    return;
  }

  if (studioBody) studioBody.classList.remove('hidden');
  if (studioComplete) studioComplete.classList.add('hidden');

  if (!activeGoal) {
    const firstUnres = reviewGoals.find(g => g.status === 'UNRESOLVED');
    if (firstUnres) activeReviewGoalId = firstUnres.id;
    else return;
  }

  const curGoal = reviewGoals.find(g => g.id === activeReviewGoalId);
  if (!curGoal) return;

  const titleEl = document.getElementById('studio-active-title');
  const roleEl = document.getElementById('studio-active-role');
  const reasonText = document.getElementById('reflection-reason');

  if (titleEl) titleEl.textContent = curGoal.title;
  if (roleEl) {
    roleEl.textContent = curGoal.role;
    roleEl.style.color = domainColor(curGoal.domain);
  }
  if (reasonText) reasonText.value = curGoal.reason || '';

  // Decision buttons
  const btnCarry = document.getElementById('btn-choice-carry');
  const btnCancel = document.getElementById('btn-choice-cancel');
  const curChoice = curGoal.choice || 'CARRY';

  btnCarry?.classList.toggle('active', curChoice === 'CARRY');
  btnCancel?.classList.toggle('active', curChoice === 'CANCEL');
}

// Decision button listeners
let currentReviewChoice = 'CARRY';
document.getElementById('btn-choice-carry')?.addEventListener('click', () => {
  currentReviewChoice = 'CARRY';
  document.getElementById('btn-choice-carry')?.classList.add('active');
  document.getElementById('btn-choice-cancel')?.classList.remove('active');
});
document.getElementById('btn-choice-cancel')?.addEventListener('click', () => {
  currentReviewChoice = 'CANCEL';
  document.getElementById('btn-choice-cancel')?.classList.add('active');
  document.getElementById('btn-choice-carry')?.classList.remove('active');
});

document.getElementById('btn-save-reflection')?.addEventListener('click', () => {
  const goal = reviewGoals.find(g => g.id === activeReviewGoalId);
  if (goal) {
    goal.choice = currentReviewChoice;
    goal.reason = document.getElementById('reflection-reason')?.value || '';

    // If carried forward, inject into This Week's goals list
    if (goal.choice === 'CARRY') {
      const targetRole = ROLES.find(r => r.label === goal.role) || ROLES[0];
      if (!targetRole.goals.some(g => g.title === goal.title)) {
        targetRole.goals.push({ id: 'g_carried_' + Date.now(), title: goal.title, done: false });
      }
    }

    // Advance to next unresolved goal
    const nextUnres = reviewGoals.find(g => g.status === 'UNRESOLVED' && !g.choice);
    if (nextUnres) {
      activeReviewGoalId = nextUnres.id;
    } else {
      activeReviewGoalId = null;
    }

    renderReviewPage();
    renderGoalsPage();
  }
});

document.getElementById('btn-finish-review')?.addEventListener('click', () => {
  // Mark all unresolved review goals as handled
  reviewGoals.forEach(g => {
    if (g.status === 'UNRESOLVED') g.status = 'DONE';
  });
  navigateTo('goals');
});

// ---------------------------------------------------------
// 3. SCHEDULE MATRIX
// ---------------------------------------------------------
let sheetTarget = null;

function renderSchedulePage() {
  const days = getWeekDates(weekOffset);
  const weekLabel = `${formatDate(days[0], { month: 'short', day: 'numeric' })} – ${formatDate(days[6], { month: 'short', day: 'numeric' })}`;
  const labelEl = document.getElementById('week-range-label');
  if (labelEl) labelEl.textContent = weekLabel;

  // Legend
  const legend = document.getElementById('role-legend');
  if (legend) {
    legend.innerHTML = ROLES.map(r => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${domainColor(r.domain)};"></span>
        <span>${r.label}</span>
      </div>
    `).join('');
  }

  const grid = document.getElementById('schedule-grid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.style.gridTemplateRows = `48px 50px repeat(${HOURS.length}, 52px)`;

  // Corner
  const corner = document.createElement('div');
  corner.className = 'sg-corner';
  grid.appendChild(corner);

  // Day headers
  days.forEach((d, i) => {
    const head = document.createElement('div');
    const isCurToday = isToday(d);
    head.className = `sg-day-head${isCurToday ? ' today-head' : ''}`;
    head.style.gridColumn = String(i + 2);
    head.innerHTML = `
      <span class="sg-dname">${DAY_NAMES[i]}</span>
      <span class="sg-dnum">${d.getDate()}</span>
    `;
    grid.appendChild(head);
  });

  // Priorities cell
  days.forEach((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'sg-priority-cell';
    cell.style.gridColumn = String(i + 2);
    cell.innerHTML = `
      <button class="sg-priority-add" data-day-index="${i}">+ priority</button>
    `;
    grid.appendChild(cell);
  });

  // Grid rows
  HOURS.forEach((h, rIdx) => {
    const tLabel = document.createElement('div');
    tLabel.className = 'sg-time-label';
    tLabel.style.gridRow = String(rIdx + 3);
    tLabel.textContent = fmtHour(h);
    grid.appendChild(tLabel);

    days.forEach((d, i) => {
      const cell = document.createElement('div');
      cell.className = `sg-hour-cell${isToday(d) ? ' today-col' : ''}`;
      cell.style.gridColumn = String(i + 2);
      cell.style.gridRow = String(rIdx + 3);

      const block = scheduleBlocks.find(b => b.day === i && b.hour === h);
      if (block) {
        const color = domainColor(block.domain);
        cell.innerHTML = `
          <div class="sg-hblock" style="--dot:${color}; --blockbg:${color}18;">
            ${block.title}
          </div>
        `;
      }

      cell.addEventListener('click', () => {
        openScheduleSheet(i, d, h, block);
      });
      grid.appendChild(cell);
    });
  });

  grid.querySelectorAll('.sg-priority-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.dayIndex);
      openScheduleSheet(idx, days[idx], null, null);
    });
  });
}

function openScheduleSheet(dayIndex, date, hour, existing) {
  sheetTarget = { dayIndex, date, hour, existing };
  const overlay = document.getElementById('sheet-overlay');
  const title = document.getElementById('sheet-title');
  const meta = document.getElementById('sheet-meta');
  const roleSelect = document.getElementById('sheet-role');
  const goalSelect = document.getElementById('sheet-goal');
  const customInput = document.getElementById('sheet-custom');

  if (!overlay) return;

  const dateStr = formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' });
  if (title) title.textContent = existing ? 'Edit Time Block' : (hour !== null ? 'Schedule a Time Block' : 'Add Day Priority');
  if (meta) meta.textContent = hour !== null ? `${dateStr} · ${fmtHour(hour)}` : `${dateStr} · Flexible Day Priority`;

  if (roleSelect) {
    roleSelect.innerHTML = ROLES.map(r => `<option value="${r.id}">${r.label}</option>`).join('');
  }

  if (goalSelect) {
    const goalsOptions = ROLES.flatMap(r => r.goals.map(g => `<option value="${g.title}">[${r.label}] ${g.title}</option>`)).join('');
    goalSelect.innerHTML = `<option value="">Custom task title below...</option>${goalsOptions}`;
  }

  if (customInput) customInput.value = existing?.title || '';

  overlay.classList.remove('hidden');
}

document.getElementById('sheet-cancel')?.addEventListener('click', () => {
  document.getElementById('sheet-overlay')?.classList.add('hidden');
});
document.getElementById('sheet-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('sheet-overlay')?.classList.add('hidden');
  }
});

document.getElementById('sheet-save')?.addEventListener('click', () => {
  if (!sheetTarget) return;
  const roleId = document.getElementById('sheet-role')?.value;
  const role = ROLES.find(r => r.id === roleId);
  const goalVal = document.getElementById('sheet-goal')?.value;
  const customVal = document.getElementById('sheet-custom')?.value.trim();
  const title = goalVal || customVal || 'Scheduled Priority';

  if (sheetTarget.hour !== null) {
    scheduleBlocks = scheduleBlocks.filter(b => !(b.day === sheetTarget.dayIndex && b.hour === sheetTarget.hour));
    scheduleBlocks.push({
      day: sheetTarget.dayIndex,
      hour: sheetTarget.hour,
      domain: role?.domain || 'career',
      title,
    });
  }

  document.getElementById('sheet-overlay')?.classList.add('hidden');
  renderSchedulePage();
});

document.getElementById('prev-week')?.addEventListener('click', () => {
  weekOffset--;
  renderSchedulePage();
});
document.getElementById('next-week')?.addEventListener('click', () => {
  weekOffset++;
  renderSchedulePage();
});

// ---------------------------------------------------------
// 4. PATTERNS
// ---------------------------------------------------------
function renderPatternsPage() {
  const hm = document.getElementById('presence-heatmap');
  if (hm && hm.children.length === 0) {
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const active = Math.random() > 0.3;
      const dot = document.createElement('div');
      dot.className = 'hm-dot';
      dot.style.background = active ? 'rgba(180,67,42,0.8)' : 'rgba(180,67,42,0.12)';
      dot.title = `Day ${28 - i}: ${active ? 'Present' : 'Rest'}`;
      hm.appendChild(dot);
    }
  }

  const balanceList = document.getElementById('patterns-balance-list');
  if (balanceList) {
    const percentages = [45, 30, 15, 10];
    balanceList.innerHTML = ROLES.slice(0, 4).map((r, i) => `
      <div class="balance-item">
        <div class="balance-blob" style="background:${domainColor(r.domain)};">${percentages[i]}%</div>
        <div>
          <div class="balance-role-name">${r.label}</div>
          <div class="balance-pct" style="color:${domainColor(r.domain)};">${percentages[i]}% of energy logged</div>
        </div>
      </div>
    `).join('');
  }
}

// ---------------------------------------------------------
// 5. PROFILE & 3D ID CARD
// ---------------------------------------------------------
function renderProfilePage() {
  // Barcode
  const barcode = document.getElementById('id-barcode');
  if (barcode && barcode.children.length === 0) {
    for (let i = 0; i < 14; i++) {
      const bar = document.createElement('span');
      bar.style.height = (8 + Math.random() * 12) + 'px';
      barcode.appendChild(bar);
    }
  }

  // Update card counts & featured rings
  const featured = ROLES.filter(r => r.isFeatured).slice(0, 2);
  const ringsWrap = document.getElementById('id-featured-rings');
  if (ringsWrap) {
    ringsWrap.innerHTML = featured.map(r => `
      <div class="id-ring-chip">
        ${ringSvg(domainColor(r.domain), (r.ringVotes || 12) / 24, 28, 3)}
        <div>
          <div class="ring-chip-label">${r.label}</div>
          <div class="ring-chip-year">Year ${r.tenureYears || 1}</div>
        </div>
      </div>
    `).join('');
  }

  // Title on card
  const titleEl = document.getElementById('id-card-title');
  if (titleEl) {
    titleEl.textContent = featured.map(r => `${ordinal(r.tenureYears || 1)} Year ${r.label}`).join(' · ');
  }

  const activeRolesEl = document.getElementById('id-active-roles-count');
  if (activeRolesEl) activeRolesEl.textContent = ROLES.length;

  // Badges grid
  const badgesGrid = document.getElementById('badges-grid');
  if (badgesGrid) {
    badgesGrid.innerHTML = ROLES.map(r => `
      <button class="badge-card ${r.isFeatured ? 'featured' : ''}" data-role-badge="${r.id}">
        ${ringSvg(domainColor(r.domain), (r.ringVotes || 12) / 24, 34, 3.5)}
        <div>
          <div class="badge-label">${r.label}</div>
          <div class="badge-year">Year ${r.tenureYears || 1} &bull; ${r.isFeatured ? 'Featured' : 'Active'}</div>
        </div>
      </button>
    `).join('');

    badgesGrid.querySelectorAll('[data-role-badge]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.dataset.roleBadge;
        const role = ROLES.find(r => r.id === rid);
        if (role) {
          const featuredCount = ROLES.filter(r => r.isFeatured).length;
          if (!role.isFeatured && featuredCount >= 2) {
            alert('You can feature up to 2 primary identity roles on your card front.');
            return;
          }
          role.isFeatured = !role.isFeatured;
          renderProfilePage();
        }
      });
    });
  }

  // Mission quote preview on card back
  const statementBox = document.getElementById('card-statement-preview');
  if (statementBox) {
    statementBox.textContent = `"${assembleStatement(missionData)}"`;
  }
  const signatureBox = document.getElementById('card-signature-preview');
  if (signatureBox) {
    signatureBox.textContent = `Signed by ${missionData.signedName}`;
  }
}

// 3D Card Flip
document.getElementById('id-card')?.addEventListener('click', (e) => {
  // Avoid flipping if clicking links
  document.getElementById('id-card')?.classList.toggle('flipped');
});

// Profile secondary action triggers
document.getElementById('btn-goto-mission')?.addEventListener('click', () => navigateTo('mission'));
document.getElementById('btn-goto-year-review')?.addEventListener('click', () => navigateTo('year-review'));
document.getElementById('btn-open-feedback')?.addEventListener('click', () => openFeedbackModal());
document.getElementById('btn-add-role-profile')?.addEventListener('click', () => openRoleModal());
document.getElementById('btn-quick-add-role')?.addEventListener('click', () => openRoleModal());

// ---------------------------------------------------------
// 6. MISSION STATEMENT STUDIO
// ---------------------------------------------------------
function assembleStatement(data) {
  const a1 = data.a1.trim() || 'someone who shows up with calmness';
  const a2 = data.a2.trim() || 'meaningful contributions';
  const a3 = data.a3.trim() || 'personal honesty';
  const a4 = data.a4.trim();
  let s = `I want to be ${a1}. I want to have contributed ${a2} to the people and things I care about. I'm not willing to compromise on ${a3}.`;
  if (a4) s += ` Above all: ${a4}`;
  return s;
}

function renderMissionStudio() {
  const p1 = document.getElementById('prompt-1');
  const p2 = document.getElementById('prompt-2');
  const p3 = document.getElementById('prompt-3');
  const p4 = document.getElementById('prompt-4');
  const signInput = document.getElementById('mission-sign-name');
  const assembledText = document.getElementById('assembled-text');

  if (p1) p1.value = missionData.a1;
  if (p2) p2.value = missionData.a2;
  if (p3) p3.value = missionData.a3;
  if (p4) p4.value = missionData.a4;
  if (signInput) signInput.value = missionData.signedName;

  function updateLivePreview() {
    missionData.a1 = p1?.value || '';
    missionData.a2 = p2?.value || '';
    missionData.a3 = p3?.value || '';
    missionData.a4 = p4?.value || '';
    missionData.signedName = signInput?.value || 'Alex Morgan';

    if (assembledText) {
      assembledText.textContent = `"${assembleStatement(missionData)}"`;
    }
  }

  [p1, p2, p3, p4, signInput].forEach(inp => {
    inp?.addEventListener('input', updateLivePreview);
  });

  updateLivePreview();
}

document.getElementById('btn-save-mission')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-save-mission');
  if (btn) {
    btn.innerHTML = '<span>Encrypting &amp; Signing...</span>';
    setTimeout(() => {
      btn.innerHTML = '<span>Saved to ID Card!</span>';
      renderProfilePage();
      setTimeout(() => {
        btn.innerHTML = '<span>Encrypt &amp; Sign Statement</span><span class="arrow">&rarr;</span>';
        navigateTo('profile');
      }, 700);
    }, 500);
  }
});

// ---------------------------------------------------------
// 7. YEAR IN REVIEW
// ---------------------------------------------------------
function renderYearReview() {
  // Rings showcase
  const ringsWrap = document.getElementById('yr-rings-showcase');
  if (ringsWrap) {
    ringsWrap.innerHTML = ROLES.map(r => `
      <div class="yr-ring-item">
        <div class="yr-ring-svg-wrap">
          ${ringSvg(domainColor(r.domain), (r.ringVotes || 12) / 24, 72, 6)}
        </div>
        <div class="yr-ring-title">${r.label}</div>
        <div class="yr-ring-votes">${r.ringVotes || 18} votes sealed &bull; Year ${r.tenureYears || 1}</div>
      </div>
    `).join('');
  }
}

// Year Review Chapters Navigation
document.querySelectorAll('.yr-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const chapter = btn.dataset.chapter;
    document.querySelectorAll('.yr-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.yr-chapter').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById('yr-' + chapter)?.classList.add('active');
  });
});

// Year selector tabs
document.querySelectorAll('.year-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Copy Annual Badge text
document.getElementById('btn-copy-badge')?.addEventListener('click', () => {
  const text = `Quadrant Life Architecture — Class of 2025\nalex.morgan: 2nd Year Career · 1st Year Health · 1st Year Family\n248 completed goals · 214 days present · 0 streak resets`;
  navigator.clipboard?.writeText(text);
  const btn = document.getElementById('btn-copy-badge');
  if (btn) {
    btn.textContent = 'Copied to Clipboard!';
    setTimeout(() => { btn.textContent = 'Copy Badge Text'; }, 1800);
  }
});

// ---------------------------------------------------------
// 8. ROLE CREATOR MODAL
// ---------------------------------------------------------
let selectedNewRoleDomain = 'career';

function openRoleModal() {
  document.getElementById('role-modal')?.classList.remove('hidden');
}
function closeRoleModal() {
  document.getElementById('role-modal')?.classList.add('hidden');
}

document.getElementById('close-role-modal')?.addEventListener('click', closeRoleModal);
document.getElementById('cancel-role-modal')?.addEventListener('click', closeRoleModal);

document.querySelectorAll('.domain-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.domain-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedNewRoleDomain = chip.dataset.domain;
  });
});

document.getElementById('save-new-role')?.addEventListener('click', () => {
  const labelInput = document.getElementById('new-role-label');
  const label = labelInput?.value.trim() || 'New Role';

  const newRole = {
    id: 'r' + Date.now(),
    label,
    domain: selectedNewRoleDomain,
    tenureYears: 1,
    isFeatured: false,
    ringVotes: 1,
    goals: [
      { id: 'g' + Date.now(), title: `Define first milestone for ${label}`, done: false },
    ],
  };

  ROLES.push(newRole);
  closeRoleModal();
  renderGoalsPage();
  renderProfilePage();
  renderSchedulePage();
});

// ---------------------------------------------------------
// 9. BETA FEEDBACK MODAL
// ---------------------------------------------------------
function openFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  const formWrap = document.getElementById('feedback-form-wrap');
  const successWrap = document.getElementById('feedback-success');

  if (formWrap) formWrap.classList.remove('hidden');
  if (successWrap) successWrap.classList.add('hidden');
  modal?.classList.remove('hidden');
}
function closeFeedbackModal() {
  document.getElementById('feedback-modal')?.classList.add('hidden');
}

document.getElementById('close-feedback-modal')?.addEventListener('click', closeFeedbackModal);
document.getElementById('cancel-feedback-modal')?.addEventListener('click', closeFeedbackModal);

document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
  });
});

document.getElementById('submit-feedback-btn')?.addEventListener('click', () => {
  const msg = document.getElementById('feedback-message')?.value;
  if (!msg || !msg.trim()) return;

  const btn = document.getElementById('submit-feedback-btn');
  if (btn) btn.textContent = 'Sending...';

  setTimeout(() => {
    document.getElementById('feedback-form-wrap')?.classList.add('hidden');
    document.getElementById('feedback-success')?.classList.remove('hidden');
    setTimeout(() => {
      closeFeedbackModal();
      document.getElementById('feedback-message').value = '';
      if (btn) btn.textContent = 'Send Reflection';
    }, 1600);
  }, 500);
});

// ---------------------------------------------------------
// 10. FLOATING RECAP PROMPT
// ---------------------------------------------------------
document.getElementById('btn-recap-dismiss')?.addEventListener('click', () => {
  document.getElementById('floating-recap')?.remove();
});
document.getElementById('btn-recap-view')?.addEventListener('click', () => {
  document.getElementById('floating-recap')?.remove();
  navigateTo('year-review');
});

// ---------------------------------------------------------
// 11. NOTIFICATIONS PANEL
// ---------------------------------------------------------
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
const notifDot = document.getElementById('notif-dot');

notifBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  notifPanel?.classList.toggle('hidden');
  notifDot?.classList.add('hidden');
});
document.getElementById('notif-close')?.addEventListener('click', () => {
  notifPanel?.classList.add('hidden');
});

document.addEventListener('click', (e) => {
  if (notifPanel && !notifPanel.contains(e.target) && !notifBtn?.contains(e.target)) {
    notifPanel.classList.add('hidden');
  }
});

document.getElementById('notif-link-review')?.addEventListener('click', (e) => {
  e.preventDefault();
  notifPanel?.classList.add('hidden');
  navigateTo('review');
});
document.getElementById('notif-link-year')?.addEventListener('click', (e) => {
  e.preventDefault();
  notifPanel?.classList.add('hidden');
  navigateTo('year-review');
});
document.getElementById('notif-link-mission')?.addEventListener('click', (e) => {
  e.preventDefault();
  notifPanel?.classList.add('hidden');
  navigateTo('mission');
});

// Helper utilities
function getWeekDates(offset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function formatDate(d, opts) { return d.toLocaleDateString('en-US', opts); }
function isToday(d) {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}
function fmtHour(h) {
  const p = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${p}`;
}
function ordinal(n) {
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s}`;
}

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const initialHash = window.location.hash.replace('#', '');
  if (ALL_PAGES.includes(initialHash)) {
    navigateTo(initialHash);
  } else {
    navigateTo('goals');
  }
});
