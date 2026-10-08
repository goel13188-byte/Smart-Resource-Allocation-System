const state = {
  token: localStorage.getItem('token') || '',
  user: null,
  organization: null,
  summary: {},
  resources: [],
  resourceAdditionRequests: [],
  authority: { canManageResources: false, canReviewResourceProposals: false },
  resourceImageData: '',
  proposalImageData: '',
  requests: [],
  conflicts: [],
  allocations: [],
  approvals: [],
  maintenance: [],
  departments: [],
  members: [],
  priorities: [],
  trends: [],
  organizationTypes: [],
  detailResourceId: null,
};

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const welcomeTitle = document.getElementById('welcomeTitle');
const currentUserLabel = document.getElementById('currentUserLabel');
const profileTrigger = document.getElementById('profileTrigger');
const profileDropdown = document.getElementById('profileDropdown');
const profileName = document.getElementById('profileName');
const profilePost = document.getElementById('profilePost');
const profileAvatar = document.getElementById('profileAvatar');
const profileAvatarLarge = document.getElementById('profileAvatarLarge');
const profileOrgType = document.getElementById('profileOrgType');
const profileOrgName = document.getElementById('profileOrgName');
const dropdownOrgName = document.getElementById('dropdownOrgName');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserId = document.getElementById('dropdownUserId');
const dropdownPost = document.getElementById('dropdownPost');
const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.getElementById('sidebarNav');

const sectionButtons = document.querySelectorAll('.nav-item, .quick-action');
const tabButtons = document.querySelectorAll('.tab-button');
const authForms = document.querySelectorAll('.auth-form');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resourceForm = document.getElementById('resourceForm');
const requestForm = document.getElementById('requestForm');
const resourceProposalForm = document.getElementById('resourceProposalForm');

document.addEventListener('click', (event) => {
  const quickButton = event.target.closest('[data-quick-section]');
  if (!quickButton) return;
  setSection(quickButton.dataset.quickSection);
  sidebarNav.classList.add('hidden');
});

function setSection(sectionName) {
  document.querySelectorAll('.panel-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionName);
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === sectionName);
  });

  const sectionMeta = {
    dashboard: ['Dashboard', 'Your resource command center.'],
    resources: ['Resources', 'Discover, monitor, and manage organizational capacity.'],
    requests: ['Resource Requests', 'Review demand and move requests toward a decision.'],
    allocations: ['Allocations', 'See how approved resources are being scheduled.'],
    maintenance: ['Maintenance & Asset Lifecycle', 'Keep resources healthy, traceable, and operational.'],
    calendar: ['Resource Calendar', 'Plan bookings, spot demand, and see committed capacity.'],
    approvals: ['Approval Center', 'Review requests, conflicts, and decisions in one place.'],
    conflicts: ['Conflicts', 'Resolve competing demands before they block operations.'],
    members: ['Members', 'Understand who is requesting and managing resources.'],
    departments: ['Departments', 'View the organizational structure behind allocation.'],
    priorities: ['Priorities', 'Keep resource decisions aligned with organizational priorities.'],
    trends: ['Strategic Trends', 'Turn resource activity into operational insight.'],
    reports: ['Reports', 'A concise view of utilization, demand, and risk.'],
  };
  const [title, subtitle] = sectionMeta[sectionName] || [sectionName, 'Manage your resource operations.'];
  welcomeTitle.textContent = title;
  const subtitleNode = document.getElementById('sectionSubtitle');
  if (subtitleNode) subtitleNode.textContent = subtitle;

  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch && sectionName !== 'resources' && globalSearch.value) globalSearch.value = '';
}

function setAuthView(isLoggedIn) {
  authScreen.classList.toggle('hidden', isLoggedIn);
  appShell.classList.toggle('hidden', !isLoggedIn);
}

function normalizeAuthority(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
}

function iconMarkup(name, altText = '') {
  const icons = {
    dashboard: '<path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-3H4v3Zm10-7h6v-3h-6v3Z"/>',
    resource: '<path d="M4 5.5 12 2l8 3.5v13L12 22l-8-3.5v-13Zm8 1.8 5.5-2.4L12 2.5 6.5 4.9 12 7.3Zm-6 1.5v8.4l5 2.2V11L6 8.8Zm7 2.2v9.2l5-2.2V8.8l-5 2.2Z"/>',
    request: '<path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h8M8 12h5"/>',
    allocation: '<path d="M5 4h5v5H5V4Zm9 11h5v5h-5v-5ZM14 6h2a3 3 0 0 1 3 3v6M10 6h2M7.5 9v6a3 3 0 0 0 3 3H14"/>',
    conflict: '<path d="m12 3 9 16H3L12 3Zm0 5v5m0 3v1"/>',
    user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"/>',
    department: '<path d="M4 20V9l8-5 8 5v11H4Zm4 0v-6h8v6M8 9h.01M12 9h.01M16 9h.01"/>',
    priority: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    strategic: '<path d="M4 19V5m0 14h16M7 16l4-5 3 2 5-7M7 16h.01M11 11h.01M14 13h.01M19 6h.01"/>',
    reports: '<path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h6M9 16h6M9 8h2"/>',
    approval: '<path d="M5 4h14v16H5V4Zm4 5 2 2 4-4M9 15h6"/>',
    maintenance: '<path d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9L3 18l3 3 5.8-5.8a4.5 4.5 0 0 0 5.9-5.9l-2.4 2.4-2.2-2.2 2.4-2.4Z"/>',
    logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M4 5h16l-6.5 7.5V18l-3 1v-6.5L4 5Z"/>',
    view: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
    edit: '<path d="m4 16-.8 4.8L8 20l11.2-11.2-4-4L4 16Zm10-8 4 4M12 20h8"/>',
    delete: '<path d="M5 7h14m-9-4h4l1 4H9l1-4Zm-3 4 1 13h8l1-13M10 11v8m4-8v8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.01"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    spark: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/>'

  };
  const svg = icons[name] || icons.info;
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg>`;
}

function showToast(message, type = 'info') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function resolveAuthority(user) {
  const role = normalizeAuthority(user?.role);
  const designation = normalizeAuthority(user?.designation);
  const accessLevel = normalizeAuthority(user?.access_level);
  const leadership = [role, designation, accessLevel].some((value) =>
    ['admin', 'administrator', 'organization admin', 'super admin'].includes(value)
    || /\b(ceo|chief executive|director|chairman|chairperson|department head|head of department|department chair|chair of department)\b/.test(value)
  );
  const departmentName = normalizeAuthority(state.departments.find((department) => Number(department.id) === Number(user?.department_id))?.name);
  const logistics = departmentName.includes('logistics') || role.includes('logistics');
  const resourceManager = [role, accessLevel].includes('resource manager');

  return {
    canManageResources: leadership || logistics || resourceManager,
    canReviewResourceProposals: leadership,
    canDecideRequests: leadership || /\b(manager|supervisor)\b/.test(role) || /\b(manager|supervisor)\b/.test(accessLevel),
  };
}

function renderAuthorityControls() {
  state.authority = resolveAuthority(state.user);
  document.getElementById('addResourceBtn')?.classList.toggle('hidden', !state.authority.canManageResources);
  document.getElementById('resourcePermissionNote')?.classList.toggle('hidden', state.authority.canManageResources);
}

function renderProfile() {
  const user = state.user || {};
  const organization = state.organization || {};
  const userName = user.full_name || 'User';
  const role = user.role || 'Member';
  const orgName = organization.organization_name || organization.name || 'Organization';
  const orgType = organization.organization_type_name || organization.organization_type || 'Organization';
  const userId = user.id || user.user_id || 'N/A';

  const initials = userName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U';

  profileName.textContent = userName;
  profilePost.textContent = role;
  profileAvatar.textContent = initials;
  profileAvatarLarge.textContent = initials;
  profileOrgType.textContent = orgType;
  profileOrgName.textContent = orgName;
  dropdownOrgName.textContent = orgName;
  dropdownUserName.textContent = userName;
  dropdownUserId.textContent = String(userId);
  dropdownPost.textContent = role;
  currentUserLabel.textContent = `${userName} • ${role}`;
  const firstName = userName.split(' ')[0] || 'there';
  const greetingNode = document.getElementById('dashboardGreeting');
  if (greetingNode) greetingNode.textContent = `Good to see you, ${firstName}`;
}

function selectAuthTab(targetId) {
  authForms.forEach((form) => form.classList.toggle('active', form.id === targetId));
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.target === targetId));
}

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      state.token = '';
      setAuthView(false);
    }
    const message = response.status === 403
      ? 'You do not have permission to perform this action.'
      : payload.message || `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

async function loadOrganizationTypes() {
  try {
    const response = await apiFetch('/api/organizations/types');
    state.organizationTypes = response.data || [];
    populateSelect('orgType', state.organizationTypes.map((type) => ({ value: type.name, label: type.name })));
  } catch (error) {
    console.warn('Falling back to default organization types:', error.message);
    populateSelect('orgType', [
      { value: 'Company', label: 'Company' },
      { value: 'School', label: 'School' },
      { value: 'College', label: 'College' },
      { value: 'Hospital', label: 'Hospital' },
      { value: 'Government', label: 'Government' },
      { value: 'NGO', label: 'NGO' },
      { value: 'Other', label: 'Other' },
    ]);
  }
}

function populateSelect(id, options) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
}

function bindImagePicker(inputId, previewId, hiddenId, stateKey) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const hidden = document.getElementById(hiddenId);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      showToast('Choose a PNG, JPEG, WebP, or GIF image smaller than 3 MB.', 'error');
      input.value = '';
      state[stateKey] = '';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state[stateKey] = String(reader.result || '');
      preview.src = state[stateKey];
      preview.classList.remove('hidden');
      hidden.value = '';
    });
    reader.readAsDataURL(file);
  });
}

function clearImagePicker(inputId, previewId, hiddenId, stateKey, existingImage = '') {
  document.getElementById(inputId).value = '';
  const preview = document.getElementById(previewId);
  preview.removeAttribute('src');
  preview.classList.add('hidden');
  document.getElementById(hiddenId).value = existingImage;
  state[stateKey] = '';
  if (existingImage) {
    preview.src = existingImage;
    preview.classList.remove('hidden');
  }
}


function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getSearchResults(query) {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const score = (text) => {
    const value = normalizeSearchText(text);
    if (!value) return 0;
    if (value === q) return 100;
    if (value.startsWith(q)) return 80;
    if (value.includes(q)) return 55;
    const words = q.split(' ');
    return words.filter((word) => value.includes(word)).length * 12;
  };

  const results = [];
  state.resources.forEach((item) => {
    const value = score([item.name, item.code, item.location, item.resource_type_name, item.department_name].join(' '));
    if (value) results.push({ type: 'Resource', title: item.name, meta: [item.code, item.location, item.status].filter(Boolean).join(' · '), section: 'resources', id: item.id, score: value + 10, icon: 'resource' });
  });
  state.requests.forEach((item) => {
    const value = score([item.project_name, item.resource_name, item.requester_name, item.status, item.priority_level].join(' '));
    if (value) results.push({ type: 'Request', title: item.project_name || `Request #${item.id}`, meta: [item.resource_name, item.status, item.priority_level].filter(Boolean).join(' · '), section: 'requests', id: item.id, score: value, icon: 'request' });
  });
  state.members.forEach((item) => {
    const value = score([item.full_name, item.member_code, item.email, item.role, item.department_name].join(' '));
    if (value) results.push({ type: 'People', title: item.full_name, meta: [item.member_code, item.role, item.department_name].filter(Boolean).join(' · '), section: 'members', id: item.id, score: value, icon: 'user' });
  });
  state.departments.forEach((item) => {
    const value = score([item.name, item.code, item.status].join(' '));
    if (value) results.push({ type: 'Department', title: item.name, meta: [item.code, item.status].filter(Boolean).join(' · '), section: 'departments', id: item.id, score: value, icon: 'department' });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 9);
}

let globalSearchActiveIndex = -1;

function renderGlobalSearchResults(query) {
  const panel = document.getElementById('globalSearchResults');
  const input = document.getElementById('globalSearch');
  const clear = document.getElementById('globalSearchClear');
  if (!panel || !input) return;

  const cleanQuery = query.trim();
  clear?.classList.toggle('hidden', !cleanQuery);

  if (!cleanQuery) {
    panel.innerHTML = `
      <div class="search-empty">
        <span class="search-empty-key">⌕</span>
        <div><strong>Search your workspace</strong><small>Find resources, requests, people and departments.</small></div>
      </div>`;
    panel.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    globalSearchActiveIndex = -1;
    return;
  }

  const results = getSearchResults(cleanQuery);
  if (!results.length) {
    panel.innerHTML = `
      <div class="search-empty">
        <span class="search-empty-key">×</span>
        <div><strong>No matches found</strong><small>Try a resource name, code, location, project or person.</small></div>
      </div>`;
  } else {
    const grouped = results.reduce((map, result) => {
      (map[result.type] ||= []).push(result);
      return map;
    }, {});
    panel.innerHTML = Object.entries(grouped).map(([group, items]) => `
      <div class="search-group">
        <div class="search-group-title">${escapeHtml(group)}</div>
        ${items.map((item) => `
          <button type="button" class="search-result" role="option" data-search-section="${item.section}" data-search-id="${Number(item.id)}">
            <span class="search-result-icon">${iconMarkup(item.icon)}</span>
            <span class="search-result-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta || '')}</small></span>
            <span class="search-result-arrow">↗</span>
          </button>`).join('')}
      </div>`).join('');
  }
  panel.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
  globalSearchActiveIndex = -1;
}

function closeGlobalSearch(clearValue = false) {
  const panel = document.getElementById('globalSearchResults');
  const input = document.getElementById('globalSearch');
  const clear = document.getElementById('globalSearchClear');
  if (clearValue && input) input.value = '';
  panel?.classList.add('hidden');
  input?.setAttribute('aria-expanded', 'false');
  clear?.classList.toggle('hidden', !input?.value);
  globalSearchActiveIndex = -1;
}

function chooseGlobalSearchResult(section, id) {
  const input = document.getElementById('globalSearch');
  setSection(section);
  closeGlobalSearch();
  if (section === 'resources') {
    const resource = state.resources.find((item) => Number(item.id) === Number(id));
    const search = document.getElementById('resourceSearch');
    if (resource && search) {
      search.value = resource.name || resource.code || '';
      renderResources();
    }
  }
  const sectionNode = document.getElementById(section);
  sectionNode?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  input?.blur();
}

function renderRequestAvailability() {
  const panel = document.getElementById('requestAvailabilityPanel');
  if (!panel) return;
  const resourceId = Number(document.getElementById('requestResource')?.value);
  const date = document.getElementById('requestDate')?.value;
  const start = document.getElementById('requestStart')?.value;
  const end = document.getElementById('requestEnd')?.value;

  if (!resourceId || !date || !start || !end) {
    panel.innerHTML = `
      <div class="availability-panel-placeholder">
        <span class="availability-panel-icon">◌</span>
        <div><strong>Availability check</strong><small>Select a resource, date and time to preview availability before submitting.</small></div>
      </div>`;
    return;
  }

  const resource = state.resources.find((item) => Number(item.id) === resourceId);
  if (!resource) return;

  const toMinutesLocal = (value) => {
    const [h, m] = String(value).split(':').map(Number);
    return (h * 60) + m;
  };
  const requestedStart = toMinutesLocal(start);
  const requestedEnd = toMinutesLocal(end);
  if (requestedEnd <= requestedStart) {
    panel.innerHTML = `
      <div class="availability-state warning">
        <span class="availability-state-icon">!</span>
        <div><strong>Time window needs attention</strong><small>End time must be later than start time.</small></div>
      </div>`;
    return;
  }

  const sameWindow = (itemDate, itemStart, itemEnd) => String(itemDate || '').slice(0, 10) === date
    && toMinutesLocal(String(itemStart).slice(0, 5)) < requestedEnd
    && toMinutesLocal(String(itemEnd).slice(0, 5)) > requestedStart;

  const allocations = state.allocations.filter((item) => Number(item.resource_id || state.resources.find((r) => r.name === item.resource_name)?.id) === resourceId
    && !['Cancelled', 'Rejected', 'Completed'].includes(item.status)
    && sameWindow(item.allocated_date, item.start_time, item.end_time));

  const openRequests = state.requests.filter((item) => {
    const requestResource = state.resources.find((r) => r.name === item.resource_name);
    return Number(requestResource?.id) === resourceId
      && !['Rejected', 'Cancelled', 'Completed', 'Allocated', 'Approved'].includes(item.status)
      && sameWindow(item.requested_date, item.start_time, item.end_time);
  });

  const resourceReady = ['Available', 'Partially Available'].includes(resource.status);
  const hasConflict = allocations.length > 0 || openRequests.length > 0;
  let tone = resourceReady && !hasConflict ? 'available' : 'warning';
  let title = resourceReady && !hasConflict ? 'Looks available' : 'Potential scheduling conflict';
  let detail = resourceReady && !hasConflict
    ? 'No current allocation or open request overlaps this time window.'
    : `${allocations.length ? `${allocations.length} existing allocation${allocations.length > 1 ? 's' : ''}` : ''}${allocations.length && openRequests.length ? ' and ' : ''}${openRequests.length ? `${openRequests.length} open request${openRequests.length > 1 ? 's' : ''}` : ''} overlap this window.`;

  panel.innerHTML = `
    <div class="availability-state ${tone}">
      <span class="availability-state-icon">${resourceReady && !hasConflict ? '✓' : '!'}</span>
      <div class="availability-state-copy">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </div>
      <span class="availability-resource-status">${escapeHtml(resource.status || 'Unknown')}</span>
    </div>
    <div class="availability-check-meta">
      <span><b>${escapeHtml(resource.name)}</b></span>
      <span>${escapeHtml(date)}</span>
      <span>${escapeHtml(start)}–${escapeHtml(end)}</span>
      ${hasConflict ? '<span class="availability-warning-label">Review before submitting</span>' : '<span class="availability-ready-label">Ready to request</span>'}
    </div>`;
}

async function loadProtectedData() {
  try {
    const userResponse = await apiFetch('/api/auth/me');
    state.user = userResponse.data?.user || null;
    state.organization = userResponse.data?.organization || null;
    renderProfile();

    const [summaryRes, resourcesRes, requestsRes, conflictsRes, allocRes, approvalsRes, departmentsRes, membersRes, prioritiesRes, trendsRes, resourceAdditionsRes] = await Promise.all([
      apiFetch('/api/dashboard/summary'),
      apiFetch('/api/resources'),
      apiFetch('/api/requests'),
      apiFetch('/api/conflicts'),
      apiFetch('/api/allocations'),
      apiFetch('/api/approvals').catch(() => ({ data: [] })),
      apiFetch('/api/departments'),
      apiFetch('/api/users'),
      apiFetch('/api/priorities'),
      apiFetch('/api/trends'),
      apiFetch('/api/resource-addition-requests').catch((error) => {
        console.warn('Resource addition requests are unavailable:', error.message);
        return { data: [] };
      }),
    ]);

    state.summary = summaryRes.data || {};
    state.resources = resourcesRes.data || [];
    state.resourceAdditionRequests = resourceAdditionsRes.data || [];
    state.requests = requestsRes.data || [];
    state.conflicts = conflictsRes.data || [];
    state.allocations = allocRes.data || [];
    state.approvals = approvalsRes.data || [];
    state.departments = departmentsRes.data || [];
    state.members = membersRes.data || [];
    state.priorities = prioritiesRes.data || [];
    state.trends = trendsRes.data || [];

    renderAuthorityControls();
    populateDepartmentOptions();
    populateResourceOptions();
    renderDashboard();
    renderResources();
    renderResourceAdditionRequests();
    renderRequests();
    renderAllocations();
    renderCalendar();
    renderApprovals();
    renderMaintenance();
    renderConflicts();
    renderMembers();
    renderDepartments();
    renderPriorities();
    renderTrends();
    renderReports();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Unable to load dashboard data.', 'error');
    throw error;
  }
}

function saveToken(token) {
  state.token = token;
  localStorage.setItem('token', token);
}

async function handleLogin(event) {
  event.preventDefault();
  const organizationCode = document.getElementById('loginOrganizationCode').value.trim();
  const memberCode = document.getElementById('loginMemberCode').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ organization_code: organizationCode, member_code: memberCode, password }),
    });

    saveToken(response.data.token);
    setAuthView(true);
    await loadProtectedData();
  } catch (error) {
    showToast(error.message || 'Unable to log in.', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const payload = {
    organization_name: document.getElementById('orgName').value,
    organization_code: document.getElementById('orgCode').value,
    organization_type: document.getElementById('orgType').value,
    email: document.getElementById('orgEmail').value,
    admin_name: document.getElementById('adminName').value,
    password: document.getElementById('registerPassword').value,
  };

  try {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveToken(response.data.token);
    setAuthView(true);
    await loadProtectedData();
  } catch (error) {
    showToast(error.message || 'Unable to register organization.', 'error');
  }
}

async function handleResourceSubmit(event) {
  event.preventDefault();
  if (!state.authority.canManageResources) return showToast('You do not have permission to manage resources.', 'error');
  const id = document.getElementById('resourceId').value;
  const payload = {
    code: document.getElementById('resourceCode').value.trim(),
    name: document.getElementById('resourceName').value.trim(),
    resource_type: document.getElementById('resourceType').value,
    description: document.getElementById('resourceDescription').value.trim(),
    location: document.getElementById('resourceLocation').value.trim(),
    capacity: Number(document.getElementById('resourceCapacity').value),
    quantity: Number(document.getElementById('resourceQuantity').value),
    department_id: document.getElementById('resourceDepartment').value || null,
    responsible_person: document.getElementById('resourceResponsiblePerson').value.trim(),
    status: document.getElementById('resourceStatus').value,
    asset_tag: document.getElementById('resourceAssetTag').value.trim(),
    serial_number: document.getElementById('resourceSerialNumber').value.trim(),
    vendor_name: document.getElementById('resourceVendorName').value.trim(),
    purchase_date: document.getElementById('resourcePurchaseDate').value || null,
    warranty_until: document.getElementById('resourceWarrantyUntil').value || null,
    lifecycle_status: document.getElementById('resourceLifecycleStatus').value,
    next_maintenance_at: document.getElementById('resourceNextMaintenance').value || null,
    image_name: document.getElementById('resourceImageName').value,
    image_data: state.resourceImageData,
  };
  const submitButton = resourceForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    if (id) {
      await apiFetch(`/api/resources/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/resources', { method: 'POST', body: JSON.stringify(payload) });
    }

    resourceForm.reset();
    document.getElementById('resourceForm').classList.add('hidden');
    clearImagePicker('resourceImageFile', 'resourceImagePreview', 'resourceImageName', 'resourceImageData');
    await loadProtectedData();
    showToast(id ? 'Resource updated successfully.' : 'Resource added successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Unable to save resource.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save Resource';
  }
}

async function handleResourceProposalSubmit(event) {
  event.preventDefault();
  const payload = {
    resource_code: document.getElementById('proposalCode').value.trim(),
    resource_name: document.getElementById('proposalName').value.trim(),
    resource_type: document.getElementById('proposalType').value,
    location: document.getElementById('proposalLocation').value.trim(),
    quantity: Number(document.getElementById('proposalQuantity').value),
    department_id: document.getElementById('proposalDepartment').value || null,
    priority_category: document.getElementById('proposalPriority').value,
    justification: document.getElementById('proposalJustification').value.trim(),
    image_data: state.proposalImageData,
  };

  try {
    await apiFetch('/api/resource-addition-requests', { method: 'POST', body: JSON.stringify(payload) });
    resourceProposalForm.reset();
    document.getElementById('proposalQuantity').value = '1';
    resourceProposalForm.classList.add('hidden');
    clearImagePicker('proposalImageFile', 'proposalImagePreview', 'proposalImageName', 'proposalImageData');
    await loadProtectedData();
  } catch (error) {
    showToast(error.message || 'Unable to submit resource-addition request.', 'error');
  }
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  const payload = {
    resource_id: document.getElementById('requestResource').value,
    project_name: document.getElementById('requestProjectName').value,
    purpose: document.getElementById('requestPurpose').value,
    requested_date: document.getElementById('requestDate').value,
    start_time: document.getElementById('requestStart').value,
    end_time: document.getElementById('requestEnd').value,
    priority_level: document.getElementById('requestPriority').value,
    deadline: document.getElementById('requestDeadline').value,
    notes: 'Submitted from dashboard UI',
  };

  try {
    const response = await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(payload) });
    requestForm.reset();
    document.getElementById('requestForm').classList.add('hidden');
    await loadProtectedData();
    const result = response.data || {};
    const resource = state.resources.find((item) => Number(item.id) === Number(payload.resource_id));
    showToast(`Request #${result.id} for ${resource?.name || 'resource'}: ${result.status || 'Pending'}, score ${result.system_priority_score ?? 'n/a'}. ${result.recommendation || ''}`, result.status === 'Conflict' ? 'error' : 'success');
  } catch (error) {
    showToast(error.message || 'Unable to create request.', 'error');
  }
}

function renderDashboard() {
  const cards = [
    { label: 'Total Resources', value: state.summary.total_resources || 0 },
    { label: 'Available Resources', value: state.summary.available_resources || 0 },
    { label: 'Allocated Resources', value: state.summary.allocated_resources || 0 },
    { label: 'Pending Requests', value: state.summary.pending_requests || 0 },
    { label: 'High Priority', value: state.summary.high_priority_requests || 0 },
    { label: 'Conflicts', value: state.summary.conflicts || 0 },
    { label: 'Approved Requests', value: state.summary.approved_requests || 0 },
    { label: 'Utilization %', value: `${state.summary.resource_utilization_percentage || 0}%` },
  ];

  document.getElementById('statsGrid').innerHTML = cards.map((card) => `
    <div class="stat-card">
      <span class="label">${card.label}</span>
      <span class="value">${card.value}</span>
    </div>
  `).join('');

  const recentRequests = state.requests.slice(0, 5);
  document.getElementById('recentRequestsList').innerHTML = recentRequests.length
    ? recentRequests.map((request) => `
        <div class="card-item"><strong>${request.project_name || 'Request'}</strong><br /><small>${request.status || 'Pending'}</small></div>
      `).join('')
    : '<p>No recent requests.</p>';

  const conflicts = state.conflicts.slice(0, 5);
  document.getElementById('conflictSummaryList').innerHTML = conflicts.length
    ? conflicts.map((conflict) => `
        <div class="card-item"><strong>${conflict.conflict_type || 'Time overlap'}</strong><br /><small>${conflict.description || 'Conflict detected'}</small></div>
      `).join('')
    : '<p>No open conflicts.</p>';

  const utilization = Math.min(100, Math.max(0, Number(state.summary.resource_utilization_percentage || 0)));
  const total = Number(state.summary.total_resources || 0);
  const available = Number(state.summary.available_resources || 0);
  const allocated = Number(state.summary.allocated_resources || 0);
  const maintenance = state.resources.filter((item) => String(item.status || '').toLowerCase() === 'maintenance').length;
  const topResources = state.resources.slice(0, 4);
  const insights = document.getElementById('dashboardInsights');
  if (insights) {
    insights.innerHTML = `
      <div class="insight-card utilization-card">
        <div class="insight-heading"><span class="insight-kicker">RESOURCE HEALTH</span><span class="insight-status"><i></i> Live</span></div>
        <div class="health-layout">
          <div class="health-ring" style="--progress:${utilization * 3.6}deg"><strong>${utilization}%</strong><span>utilized</span></div>
          <div class="health-metrics">
            <div><span>Available</span><b>${available}</b></div>
            <div><span>Allocated</span><b>${allocated}</b></div>
            <div><span>Maintenance</span><b>${maintenance}</b></div>
          </div>
        </div>
      </div>
      <div class="insight-card">
        <div class="insight-heading"><span class="insight-kicker">RESOURCE PULSE</span><span class="insight-link">Live inventory</span></div>
        <div class="pulse-list">
          ${topResources.length ? topResources.map((resource) => {
            const status = String(resource.status || 'Available');
            const cls = status.toLowerCase().includes('maintenance') ? 'warning' : status.toLowerCase().includes('allocated') ? 'busy' : 'ready';
            return `<div class="pulse-row"><span class="pulse-dot ${cls}"></span><div><strong>${escapeHtml(resource.name || 'Resource')}</strong><small>${escapeHtml(resource.location || resource.resource_type_name || 'Organizational resource')}</small></div><em>${escapeHtml(status)}</em></div>`;
          }).join('') : '<div class="empty-state">No resource activity yet.</div>'}
        </div>
      </div>
      <div class="insight-card decision-card">
        <div class="insight-heading"><span class="insight-kicker">DECISION QUEUE</span><span class="queue-count">${Number(state.summary.pending_requests || 0)}</span></div>
        <h4>${Number(state.summary.pending_requests || 0) ? 'Requests need your attention' : 'Everything is under control'}</h4>
        <p>${Number(state.summary.pending_requests || 0) ? 'Review pending requests and resolve conflicts before they affect allocation.' : 'No pending requests are waiting for a decision right now.'}</p>
        <button type="button" class="insight-action" data-quick-section="requests">Open request queue <span>→</span></button>
      </div>
    `;
  }
}

function populateDepartmentOptions() {
  populateSelect('resourceDepartment', [
    { value: '', label: 'No department' },
    ...state.departments.map((department) => ({ value: department.id, label: department.name })),
  ]);
  populateSelect('proposalDepartment', [
    { value: '', label: 'Select department' },
    ...state.departments.map((department) => ({ value: department.id, label: department.name })),
  ]);
}

function populateResourceOptions() {
  populateSelect('requestResource', state.resources.map((resource) => ({ value: resource.id, label: `${resource.name} (${resource.code})` })));
  populateSelect('resourceType', [
    { value: 'Meeting Room', label: 'Meeting Room' },
    { value: 'Conference Room', label: 'Conference Room' },
    { value: 'Projector', label: 'Projector' },
    { value: 'Laboratory', label: 'Laboratory' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Equipment', label: 'Equipment' },
    { value: 'Sports Facility', label: 'Sports Facility' },
    { value: 'Library', label: 'Library' },
    { value: 'Workspace', label: 'Workspace' },
    { value: 'Medical Equipment', label: 'Medical Equipment' },
    { value: 'Operation Theatre', label: 'Operation Theatre' },
    { value: 'Classroom', label: 'Classroom' },
    { value: 'Other', label: 'Other' },
  ]);
  populateSelect('proposalType', [
    { value: 'Meeting Room', label: 'Meeting Room' },
    { value: 'Conference Room', label: 'Conference Room' },
    { value: 'Projector', label: 'Projector' },
    { value: 'Laboratory', label: 'Laboratory' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Equipment', label: 'Equipment' },
    { value: 'Sports Facility', label: 'Sports Facility' },
    { value: 'Library', label: 'Library' },
    { value: 'Workspace', label: 'Workspace' },
    { value: 'Medical Equipment', label: 'Medical Equipment' },
    { value: 'Operation Theatre', label: 'Operation Theatre' },
    { value: 'Classroom', label: 'Classroom' },
    { value: 'Other', label: 'Other' },
  ]);
  const priorityOptions = state.priorities.length
    ? state.priorities.map((priority) => ({ value: priority.priority_name, label: priority.priority_name }))
    : ['Critical', 'High', 'Medium', 'Low'].map((name) => ({ value: name, label: name }));
  populateSelect('proposalPriority', priorityOptions);
}

function setResourceFilterOptions(selectId, values, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
  if (values.includes(currentValue)) select.value = currentValue;
}

function renderResources() {
  setResourceFilterOptions('resourceCategoryFilter', [...new Set(state.resources.map((resource) => resource.resource_type_name).filter(Boolean))].sort(), 'All categories');
  setResourceFilterOptions('resourceDepartmentFilter', [...new Set(state.resources.map((resource) => resource.department_name).filter(Boolean))].sort(), 'All departments');
  setResourceFilterOptions('resourceStatusFilter', [...new Set(state.resources.map((resource) => resource.status).filter(Boolean))].sort(), 'All statuses');

  const query = document.getElementById('resourceSearch').value.trim().toLowerCase();
  const category = document.getElementById('resourceCategoryFilter').value;
  const department = document.getElementById('resourceDepartmentFilter').value;
  const status = document.getElementById('resourceStatusFilter').value;
  const availability = document.getElementById('resourceAvailabilityFilter').value;
  const resources = state.resources.filter((resource) => {
    const text = [resource.name, resource.code, resource.location].join(' ').toLowerCase();
    const isAvailable = ['Available', 'Partially Available'].includes(resource.status);
    return (!query || text.includes(query))
      && (!category || resource.resource_type_name === category)
      && (!department || resource.department_name === department)
      && (!status || resource.status === status)
      && (!availability || (availability === 'available') === isAvailable);
  });

  document.getElementById('resourceResultCount').textContent = `${resources.length} of ${state.resources.length} resources`;

  const resourceCards = document.getElementById('resourceCardGrid');
  if (resourceCards) {
    resourceCards.innerHTML = resources.length ? resources.map((resource) => {
      const available = ['Available', 'Partially Available'].includes(resource.status);
      const statusClass = resource.status === 'Available' ? 'green' : ['Inactive', 'Maintenance'].includes(resource.status) ? 'orange' : 'blue';
      return `
        <article class="resource-card">
          <div class="resource-card-image">${renderResourceImage(resource.image_name, resource.name, resource.resource_type_name)}</div>
          <div class="resource-card-body">
            <div class="resource-card-topline">
              <span class="tag ${statusClass}">${escapeHtml(resource.status || 'Unknown')}</span>
              <span class="resource-card-code">${escapeHtml(resource.code || '')}</span>
            </div>
            <h4>${escapeHtml(resource.name || 'Resource')}</h4>
            <p class="resource-card-type">${escapeHtml(resource.resource_type_name || 'General')} · ${escapeHtml(resource.department_name || 'Unassigned')}</p>
            <div class="resource-card-meta">
              <span><b>${Number(resource.quantity) || 0}</b> units</span>
              <span><b>${Number(resource.capacity) || 0}</b> capacity</span>
              <span>${escapeHtml(resource.location || 'Location not set')}</span>
            </div>
            <div class="resource-card-footer">
              <span class="availability-dot ${available ? 'available' : 'unavailable'}"><i></i>${available ? 'Ready to request' : 'Not available'}</span>
              <button class="resource-card-view" data-action="view-resource" data-id="${Number(resource.id)}">View resource →</button>
            </div>
          </div>
        </article>`;
    }).join('') : '<div class="empty-state resource-empty">No resources match your filters.</div>';
  }

  const actions = (resource) => `
    <div class="action-group">
      <button class="action-btn" data-action="view-resource" data-id="${Number(resource.id)}" aria-label="View ${escapeHtml(resource.name)}">${iconMarkup('view')}<span>View</span></button>
      ${state.authority.canManageResources ? `<button class="action-btn" data-action="edit-resource" data-id="${Number(resource.id)}" aria-label="Edit ${escapeHtml(resource.name)}">${iconMarkup('edit')}<span>Edit</span></button><button class="action-btn action-reject" data-action="delete-resource" data-id="${Number(resource.id)}" aria-label="Deactivate ${escapeHtml(resource.name)}">${iconMarkup('delete')}<span>Deactivate</span></button>` : ''}
    </div>`;
  const rows = resources.map((resource) => {
    const statusClass = resource.status === 'Available' ? 'green' : ['Inactive', 'Maintenance'].includes(resource.status) ? 'orange' : 'blue';
    const isAvailable = ['Available', 'Partially Available'].includes(resource.status);
    return `
      <tr>
        <td>${renderResourceImage(resource.image_name, resource.name, resource.resource_type_name)}</td>
        <td><strong>${escapeHtml(resource.name)}</strong></td>
        <td>${escapeHtml(resource.code)}</td>
        <td>${escapeHtml(resource.resource_type_name || 'General')}</td>
        <td>${escapeHtml(resource.department_name || 'Unassigned')}</td>
        <td>${escapeHtml(resource.location || 'Not specified')}</td>
        <td>${Number(resource.quantity) || 0}</td>
        <td>${Number(resource.capacity) || 0}</td>
        <td><span class="tag ${statusClass}">${escapeHtml(resource.status || 'Unknown')}</span><br><small>${isAvailable ? 'Available' : 'Unavailable'}</small></td>
        <td>${actions(resource)}</td>
      </tr>`;
  }).join('');
  document.getElementById('resourcesTableBody').innerHTML = rows || `<tr><td colspan="10">${state.resources.length ? 'No resources match these filters.' : 'No resources found.'}</td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function resourceFallbackImage(resourceType) {
  const type = normalizeAuthority(resourceType);
  const image = type.includes('vehicle') ? 'vehicle.png'
    : type.includes('workspace') ? 'workspace.png'
      : type.includes('meeting') || type.includes('conference') || type.includes('room') ? 'meeting_room.png'
        : type.includes('projector') ? 'projector.png'
          : type.includes('laboratory') || type.includes('lab') ? 'laboratory.png'
            : type.includes('library') ? 'library.png'
              : type.includes('sport') ? 'sports.png'
                : type.includes('equipment') ? 'equipment.png' : 'default_resources.png';
  return `/images/${image}`;
}

function renderResourceImage(imageName, altText, resourceType) {
  const safeAlt = escapeHtml(altText || 'Resource photo');
  const source = imageName ? (String(imageName).startsWith('/') ? imageName : `/images/${encodeURIComponent(imageName)}`) : resourceFallbackImage(resourceType);
  const fallback = resourceFallbackImage(resourceType);
  return `<div class="resource-image-frame"><img class="resource-thumbnail" src="${escapeHtml(source)}" data-fallback="${fallback}" alt="${safeAlt}" loading="lazy" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback=''}else{this.hidden=true;this.nextElementSibling.hidden=false}"><span hidden>No image available</span></div>`;
}

function renderResourceAdditionRequests() {
  const rows = state.resourceAdditionRequests.map((request) => {
    const statusClass = request.status === 'Approved' ? 'green' : request.status === 'Rejected' ? 'red' : 'orange';
    const reviewActions = state.authority.canReviewResourceProposals && request.status === 'Pending'
      ? `<div class="action-group"><button class="action-btn action-approve" data-action="review-resource-addition" data-decision="Approved" data-id="${request.request_id}">Approve</button><button class="action-btn action-reject" data-action="review-resource-addition" data-decision="Rejected" data-id="${request.request_id}">Reject</button></div>`
      : request.review_note ? escapeHtml(request.review_note) : '—';
    const department = state.departments.find((item) => Number(item.id) === Number(request.department_id))?.name || '—';
    return `<tr>
      <td>${renderResourceImage(request.image_name, request.resource_name, request.resource_type)}</td>
      <td><strong>${escapeHtml(request.resource_name)}</strong><br><small>${escapeHtml(request.resource_code)} · ${escapeHtml(request.resource_type)} × ${escapeHtml(request.quantity)}</small></td>
      <td>${escapeHtml(request.requester_name || 'Organization Admin')}</td>
      <td>${escapeHtml(department)}</td>
      <td>${escapeHtml(request.priority_category || 'General')}</td>
      <td>${escapeHtml(request.justification)}</td>
      <td><span class="tag ${statusClass}">${escapeHtml(request.status)}</span></td>
      <td>${reviewActions}</td>
    </tr>`;
  }).join('');
  document.getElementById('resourceProposalsTableBody').innerHTML = rows || '<tr><td colspan="8">No resource-addition requests yet.</td></tr>';
}

function renderRequests() {
  const requestSummary = document.getElementById('requestSummaryStrip');
  if (requestSummary) {
    const pending = state.requests.filter((r) => ['Pending', 'Under Review'].includes(r.status)).length;
    const approved = state.requests.filter((r) => ['Approved', 'Allocated'].includes(r.status)).length;
    const high = state.requests.filter((r) => ['High', 'Critical'].includes(r.priority_level)).length;
    const conflicts = state.requests.filter((r) => String(r.status || '').toLowerCase().includes('conflict')).length;
    requestSummary.innerHTML = [
      ['PENDING DECISIONS', pending, 'Requests waiting for review', 'violet'],
      ['APPROVED / ALLOCATED', approved, 'Requests moving forward', 'green'],
      ['HIGH PRIORITY', high, 'High-impact demand', 'amber'],
      ['CONFLICTING', conflicts, 'Needs resolution', 'red'],
    ].map(([label, value, note, tone]) => `<div class="operation-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  }
  const rows = state.requests.map((request) => {
    const isOpen = !['Approved', 'Rejected', 'Allocated', 'Completed', 'Cancelled'].includes(request.status);
    const approvalActions = state.authority.canDecideRequests && isOpen
      ? `<div class="action-group"><button class="action-btn action-approve" data-action="decide-request" data-decision="Approved" data-id="${request.id}">Approve</button><button class="action-btn action-reject" data-action="decide-request" data-decision="Rejected" data-id="${request.id}">Reject</button></div>`
      : '';
    return `
    <tr>
      <td>${request.project_name || 'N/A'}</td>
      <td>${request.resource_name || 'N/A'}</td>
      <td>${request.requested_date || 'N/A'}</td>
      <td><span class="tag blue">${request.priority_level || 'Medium'}</span></td>
      <td><span class="tag ${request.status === 'Conflict' ? 'red' : request.status === 'Approved' ? 'green' : 'orange'}">${request.status || 'Pending'}</span></td>
      <td>${approvalActions}</td>
    </tr>
    `;
  }).join('');
  document.getElementById('requestsTableBody').innerHTML = rows || '<tr><td colspan="6">No requests found.</td></tr>';
}

function renderAllocations() {
  const allocationSummary = document.getElementById('allocationSummaryStrip');
  if (allocationSummary) {
    const scheduled = state.allocations.filter((a) => !['Cancelled', 'Rejected'].includes(a.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = state.allocations.filter((a) => String(a.allocated_date || '').slice(0, 10) === today).length;
    const active = state.allocations.filter((a) => String(a.status || '').toLowerCase().includes('active')).length;
    const resourcesUsed = new Set(state.allocations.map((a) => a.resource_name).filter(Boolean)).size;
    allocationSummary.innerHTML = [
      ['SCHEDULED', scheduled, 'Committed allocation slots', 'violet'],
      ['TODAY', todayCount, 'Allocation slots today', 'cyan'],
      ['ACTIVE', active, 'Currently in progress', 'green'],
      ['RESOURCES USED', resourcesUsed, 'Distinct resources allocated', 'amber'],
    ].map(([label, value, note, tone]) => `<div class="operation-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  }
  const rows = state.allocations.map((allocation) => `
    <tr>
      <td>${allocation.resource_name || 'N/A'}</td>
      <td>${allocation.allocated_date || 'N/A'}</td>
      <td>${allocation.start_time || 'N/A'}</td>
      <td>${allocation.end_time || 'N/A'}</td>
      <td>${allocation.status || 'Scheduled'}</td>
    </tr>
  `).join('');
  document.getElementById('allocationsTableBody').innerHTML = rows || '<tr><td colspan="5">No allocations found.</td></tr>';
}


let calendarWeekOffset = 0;

function localDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarWeekStart(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (offset * 7));
  return date;
}

function formatCalendarDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return (hours * 60) + minutes;
}

function calendarEventForAllocation(item) {
  return {
    kind: 'allocated',
    title: item.resource_name || 'Resource',
    subtitle: item.status || 'Scheduled',
    date: String(item.allocated_date || '').slice(0, 10),
    start: item.start_time,
    end: item.end_time,
    id: item.id,
  };
}

function calendarEventForRequest(item) {
  const status = String(item.status || '').toLowerCase();
  return {
    kind: status.includes('conflict') ? 'conflict' : 'pending',
    title: item.project_name || `Request #${item.id}`,
    subtitle: item.resource_name || 'Resource request',
    date: String(item.requested_date || '').slice(0, 10),
    start: item.start_time,
    end: item.end_time,
    id: item.id,
  };
}

function renderCalendar() {
  const root = document.getElementById('resourceCalendar');
  if (!root) return;

  const start = getCalendarWeekStart(calendarWeekOffset);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const end = days[6];
  const range = document.getElementById('calendarRangeLabel');
  const hint = document.getElementById('calendarRangeHint');
  if (range) range.textContent = `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(end)}`;
  if (hint) hint.textContent = calendarWeekOffset === 0 ? 'Current operational week' : calendarWeekOffset < 0 ? 'Previous schedule' : 'Upcoming schedule';

  const events = [
    ...state.allocations.filter((item) => !['Cancelled', 'Rejected', 'Completed'].includes(item.status)).map(calendarEventForAllocation),
    ...state.requests.filter((item) => !['Rejected', 'Cancelled', 'Completed', 'Allocated', 'Approved'].includes(item.status)).map(calendarEventForRequest),
  ];

  const hours = Array.from({ length: 12 }, (_, index) => 8 + index);
  root.innerHTML = `
    <div class="calendar-grid">
      <div class="calendar-corner">TIME</div>
      ${days.map((day) => {
        const today = localDateKey(day) === localDateKey(new Date());
        return `<div class="calendar-day-head ${today ? 'today' : ''}"><span>${day.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>${day.getDate()}</strong></div>`;
      }).join('')}
      ${hours.map((hour) => `
        <div class="calendar-time"><span>${String(hour).padStart(2, '0')}:00</span></div>
        ${days.map((day) => {
          const key = localDateKey(day);
          const dayEvents = events.filter((event) => event.date === key && Math.floor(minutesFromTime(event.start) / 60) === hour);
          return `<div class="calendar-slot">${dayEvents.map((event) => {
            const duration = Math.max(1, minutesFromTime(event.end) - minutesFromTime(event.start));
            const span = Math.min(2.8, Math.max(1.1, duration / 60));
            return `<button type="button" class="calendar-event ${event.kind}" data-calendar-request="${event.id}" data-calendar-kind="${event.kind}" style="--event-span:${span}">
              <strong>${escapeHtml(event.title)}</strong>
              <small>${escapeHtml(String(event.start || '').slice(0,5))}–${escapeHtml(String(event.end || '').slice(0,5))}</small>
              <em>${escapeHtml(event.subtitle)}</em>
            </button>`;
          }).join('')}</div>`;
        }).join('')}
      `).join('')}
    </div>`;

  root.querySelectorAll('[data-calendar-request]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.calendarRequest);
      if (button.dataset.calendarKind === 'allocated') {
        setSection('allocations');
        showToast('This booking is already allocated.', 'info');
      } else {
        setSection('requests');
        const request = state.requests.find((item) => Number(item.id) === id);
        if (request) {
          requestForm.reset();
          document.getElementById('requestResource').value = String(request.resource_id || '');
          document.getElementById('requestProjectName').value = request.project_name || '';
          document.getElementById('requestPurpose').value = request.purpose || '';
          document.getElementById('requestDate').value = String(request.requested_date || '').slice(0,10);
          document.getElementById('requestStart').value = String(request.start_time || '').slice(0,5);
          document.getElementById('requestEnd').value = String(request.end_time || '').slice(0,5);
          document.getElementById('requestPriority').value = request.priority_level || 'Medium';
          requestForm.classList.remove('hidden');
          renderRequestAvailability();
        }
      }
    });
  });
}

function renderApprovals() {
  const pending = state.requests.filter((request) => !['Approved','Rejected','Allocated','Completed','Cancelled'].includes(request.status));
  const approved = state.requests.filter((request) => ['Approved','Allocated'].includes(request.status)).length;
  const conflicts = state.requests.filter((request) => String(request.status || '').toLowerCase().includes('conflict')).length;
  const strip = document.getElementById('approvalSummaryStrip');
  if (strip) {
    strip.innerHTML = [
      ['AWAITING DECISION', pending.length, 'Requests in the queue', 'violet'],
      ['APPROVED / ALLOCATED', approved, 'Requests moving forward', 'green'],
      ['CONFLICT RISK', conflicts, 'Requests needing attention', 'red'],
      ['DECISIONS LOGGED', state.approvals.length, 'Approval records', 'cyan'],
    ].map(([label, value, note, tone]) => `<div class="operation-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  }

  const queue = document.getElementById('approvalQueue');
  if (!queue) return;
  if (!pending.length) {
    queue.innerHTML = '<div class="approval-empty"><span>✓</span><div><strong>Decision queue is clear</strong><small>No open requests currently require approval.</small></div></div>';
    return;
  }

  queue.innerHTML = pending.slice(0, 12).map((request) => {
    const canDecide = state.authority.canDecideRequests;
    const isConflict = String(request.status || '').toLowerCase().includes('conflict');
    return `
      <div class="approval-item ${isConflict ? 'risk' : ''}">
        <div class="approval-item-icon">${iconMarkup(isConflict ? 'conflict' : 'request')}</div>
        <div class="approval-item-copy">
          <strong>${escapeHtml(request.project_name || `Request #${request.id}`)}</strong>
          <small>${escapeHtml(request.resource_name || 'Resource')} · ${escapeHtml(String(request.requested_date || '').slice(0,10))} · ${escapeHtml(String(request.start_time || '').slice(0,5))}–${escapeHtml(String(request.end_time || '').slice(0,5))}</small>
          <span class="approval-item-meta"><b>${escapeHtml(request.priority_level || 'Medium')}</b> priority · ${escapeHtml(request.status || 'Pending')}</span>
        </div>
        <div class="approval-actions">
          ${canDecide && !isConflict ? `<button class="action-btn action-approve" data-action="decide-request" data-decision="Approved" data-id="${request.id}">Approve</button>` : ''}
          ${canDecide ? `<button class="action-btn action-reject" data-action="decide-request" data-decision="Rejected" data-id="${request.id}">Reject</button>` : '<span class="approval-readonly">Review only</span>'}
        </div>
      </div>`;
  }).join('');
}

function renderMaintenance() {
  const open = state.maintenance.filter((item) => !['Completed', 'Cancelled'].includes(item.status)).length;
  const critical = state.maintenance.filter((item) => String(item.priority || '').toLowerCase() === 'critical' && !['Completed', 'Cancelled'].includes(item.status)).length;
  const due = state.resources.filter((item) => item.next_maintenance_at && new Date(item.next_maintenance_at) <= new Date()).length;
  const completed = state.maintenance.filter((item) => item.status === 'Completed').length;
  const strip = document.getElementById('maintenanceSummaryStrip');
  if (strip) strip.innerHTML = [
    ['OPEN TICKETS', open, 'Maintenance work in progress', 'violet'],
    ['CRITICAL', critical, 'Needs immediate attention', 'red'],
    ['MAINTENANCE DUE', due, 'Resources past service date', 'amber'],
    ['COMPLETED', completed, 'Completed maintenance records', 'green'],
  ].map(([label,value,note,tone]) => `<div class="operation-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');

  const body = document.getElementById('maintenanceTableBody');
  if (!body) return;
  body.innerHTML = state.maintenance.map((ticket) => {
    const statusClass = ticket.status === 'Completed' ? 'green' : ticket.status === 'Cancelled' ? 'red' : 'orange';
    const action = state.authority.canDecideRequests && !['Completed','Cancelled'].includes(ticket.status)
      ? `<div class="action-group"><button class="action-btn action-approve" data-action="complete-maintenance" data-id="${ticket.id}">Complete</button><button class="action-btn" data-action="progress-maintenance" data-id="${ticket.id}">In Progress</button></div>`
      : '—';
    return `<tr>
      <td><strong>${escapeHtml(ticket.resource_name || 'Resource')}</strong><br><small>${escapeHtml(ticket.resource_code || '')}</small></td>
      <td><strong>${escapeHtml(ticket.title)}</strong><br><small>#${ticket.id} · ${escapeHtml(ticket.description || '')}</small></td>
      <td>${escapeHtml(ticket.ticket_type || 'Preventive')}</td>
      <td><span class="tag blue">${escapeHtml(ticket.priority || 'Medium')}</span></td>
      <td><span class="tag ${statusClass}">${escapeHtml(ticket.status || 'Open')}</span></td>
      <td>${escapeHtml(String(ticket.scheduled_date || '—').slice(0,10))}</td>
      <td>${escapeHtml(ticket.assigned_to_name || 'Unassigned')}</td>
      <td>${action}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8">No maintenance tickets yet.</td></tr>';
}

function renderConflicts() {
  const conflictSummary = document.getElementById('conflictSummaryStrip');
  if (conflictSummary) {
    const open = state.conflicts.filter((c) => ['Open', 'Under Review'].includes(c.status)).length;
    const critical = state.conflicts.filter((c) => String(c.severity || '').toLowerCase() === 'critical').length;
    const high = state.conflicts.filter((c) => String(c.severity || '').toLowerCase() === 'high').length;
    const resolved = state.conflicts.filter((c) => String(c.status || '').toLowerCase() === 'resolved').length;
    conflictSummary.innerHTML = [
      ['OPEN', open, 'Conflicts needing attention', 'red'],
      ['CRITICAL', critical, 'Immediate operational risk', 'critical'],
      ['HIGH', high, 'High-priority collisions', 'amber'],
      ['RESOLVED', resolved, 'Already handled', 'green'],
    ].map(([label, value, note, tone]) => `<div class="operation-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  }
  const rows = state.conflicts.map((conflict) => {
    const canAct = state.authority.canDecideRequests && ['Open', 'Under Review'].includes(conflict.status);
    const actions = canAct
      ? `<div class="action-group"><button class="action-btn action-approve" data-action="resolve-conflict" data-status="Resolved" data-id="${conflict.id}">Resolve</button><button class="action-btn action-reject" data-action="resolve-conflict" data-status="Rejected" data-id="${conflict.id}">Reject Request</button></div>`
      : '';
    return `
      <tr>
        <td>${conflict.resource_name || 'N/A'}</td>
        <td>${conflict.conflict_type || 'Overlap'}</td>
        <td>${conflict.severity || 'High'}</td>
        <td>${conflict.status || 'Open'}</td>
        <td>${conflict.description || 'Conflict detected'}${conflict.conflicting_project ? `<br><small>${conflict.conflicting_project}</small>` : ''}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('conflictsTableBody').innerHTML = rows || '<tr><td colspan="6">No conflicts found.</td></tr>';
}

function renderMembers() {
  const rows = state.members.map((member) => `
    <tr>
      <td>${member.full_name}</td>
      <td>${member.member_code}</td>
      <td>${member.email}</td>
      <td>${member.role}</td>
      <td>${member.status}</td>
    </tr>
  `).join('');
  document.getElementById('membersTableBody').innerHTML = rows || '<tr><td colspan="5">No members found.</td></tr>';
}

function renderDepartments() {
  const rows = state.departments.map((department) => `
    <tr>
      <td>${department.name}</td>
      <td>${department.code || 'N/A'}</td>
      <td>${department.status || 'Active'}</td>
    </tr>
  `).join('');
  document.getElementById('departmentsTableBody').innerHTML = rows || '<tr><td colspan="3">No departments found.</td></tr>';
}

function renderPriorities() {
  const rows = state.priorities.map((priority) => `
    <tr>
      <td>${priority.priority_name}</td>
      <td>${priority.priority_level}</td>
      <td>${priority.description || 'No description'}</td>
    </tr>
  `).join('');
  document.getElementById('prioritiesTableBody').innerHTML = rows || '<tr><td colspan="3">No priorities found.</td></tr>';
}

function renderTrends() {
  const rows = state.trends.map((trend) => `
    <tr>
      <td>${trend.sector}</td>
      <td>${trend.period}</td>
      <td>${trend.trend_direction}</td>
      <td>${trend.trend_value}</td>
    </tr>
  `).join('');
  document.getElementById('trendsTableBody').innerHTML = rows || '<tr><td colspan="4">No strategic trends found.</td></tr>';
}

function renderReports() {
  const total = state.summary.total_resources || 0;
  const conflicts = state.summary.conflicts || 0;
  const requests = state.summary.pending_requests || 0;
  document.getElementById('reportSummary').innerHTML = `
    <p><strong>Resource utilization summary:</strong> ${state.summary.resource_utilization_percentage || 0}%</p>
    <p><strong>Total resources:</strong> ${total}</p>
    <p><strong>Open conflicts:</strong> ${conflicts}</p>
    <p><strong>Pending requests:</strong> ${requests}</p>
  `;
}

async function handleDeleteResource(id) {
  if (!state.authority.canManageResources) return showToast('You do not have permission to manage resources.', 'error');
  if (!confirm('Deactivate this resource?')) return;
  try {
    await apiFetch(`/api/resources/${id}`, { method: 'DELETE' });
    await loadProtectedData();
    showToast('Resource deactivated successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Unable to deactivate resource.', 'error');
  }
}

async function handleEditResource(id) {
  if (!state.authority.canManageResources) return showToast('You do not have permission to manage resources.', 'error');
  try {
    const response = await apiFetch(`/api/resources/${id}`);
    const resource = response.data;
    document.getElementById('resourceId').value = resource.id;
    document.getElementById('resourceCode').value = resource.code || '';
    document.getElementById('resourceName').value = resource.name || '';
    document.getElementById('resourceType').value = resource.resource_type_name || 'Equipment';
    document.getElementById('resourceDescription').value = resource.description || '';
    document.getElementById('resourceLocation').value = resource.location || '';
    document.getElementById('resourceCapacity').value = resource.capacity || 1;
    document.getElementById('resourceQuantity').value = resource.quantity || 1;
    document.getElementById('resourceDepartment').value = resource.department_id || '';
    document.getElementById('resourceResponsiblePerson').value = resource.responsible_person || '';
    document.getElementById('resourceAssetTag').value = resource.asset_tag || '';
    document.getElementById('resourceSerialNumber').value = resource.serial_number || '';
    document.getElementById('resourceVendorName').value = resource.vendor_name || '';
    document.getElementById('resourcePurchaseDate').value = String(resource.purchase_date || '').slice(0,10);
    document.getElementById('resourceWarrantyUntil').value = String(resource.warranty_until || '').slice(0,10);
    document.getElementById('resourceLifecycleStatus').value = resource.lifecycle_status || 'Active';
    document.getElementById('resourceNextMaintenance').value = resource.next_maintenance_at ? String(resource.next_maintenance_at).replace(' ', 'T').slice(0,16) : '';
    document.getElementById('resourceStatus').value = resource.status || 'Available';
    const imageName = resource.image_name || '';
    const imagePath = imageName && !String(imageName).startsWith('/') ? `/images/${encodeURIComponent(imageName)}` : imageName;
    clearImagePicker('resourceImageFile', 'resourceImagePreview', 'resourceImageName', 'resourceImageData', imagePath);
    document.getElementById('resourceForm').classList.remove('hidden');
    document.getElementById('resourceForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showToast(error.message || 'Unable to load resource details.', 'error');
  }
}

async function handleViewResource(id) {
  try {
    const response = await apiFetch(`/api/resources/${id}`);
    const resource = response.data;
    state.detailResourceId = Number(resource.id);
    document.getElementById('resourceDetailTitle').textContent = resource.name || 'Resource details';
    document.getElementById('resourceDetailContent').innerHTML = `
      <div class="resource-detail-layout">
        ${renderResourceImage(resource.image_name, resource.name, resource.resource_type_name)}
        <dl class="resource-detail-grid">
          <div><dt>Code</dt><dd>${escapeHtml(resource.code)}</dd></div>
          <div><dt>Category</dt><dd>${escapeHtml(resource.resource_type_name || 'General')}</dd></div>
          <div><dt>Department</dt><dd>${escapeHtml(resource.department_name || 'Unassigned')}</dd></div>
          <div><dt>Location</dt><dd>${escapeHtml(resource.location || 'Not specified')}</dd></div>
          <div><dt>Quantity</dt><dd>${Number(resource.quantity) || 0}</dd></div>
          <div><dt>Capacity</dt><dd>${Number(resource.capacity) || 0}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(resource.status || 'Unknown')}</dd></div>
          <div><dt>Responsible person</dt><dd>${escapeHtml(resource.responsible_person || 'Not assigned')}</dd></div>
          <div class="detail-description"><dt>Description</dt><dd>${escapeHtml(resource.description || 'No description provided.')}</dd></div>
        </dl>
      </div>`;
    document.getElementById('resourceDetailDialog').showModal();
  } catch (error) {
    showToast(error.message || 'Unable to load resource details.', 'error');
  }
}

async function handleRequestDecision(id, decision) {
  if (!state.authority.canDecideRequests) return showToast('You do not have authority to decide resource requests.', 'error');
  if (decision === 'Approved' && !confirm('Approve this resource request?')) return;
  const reason = decision === 'Rejected' ? window.prompt('Reason for rejection:') : `Approved by ${state.user?.full_name || 'Manager'}`;
  if (decision === 'Rejected' && !reason?.trim()) return showToast('Enter a reason to reject this request.', 'error');
  try {
    await apiFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ request_id: Number(id), decision, reason: reason.trim() }),
    });
    await loadProtectedData();
    showToast(`Request ${decision.toLowerCase()}.`, 'success');
  } catch (error) {
    showToast(error.message || `Unable to ${decision.toLowerCase()} request.`, 'error');
  }
}

async function handleConflictDecision(id, status) {
  if (!state.authority.canDecideRequests) return showToast('Only Managers and senior leaders can resolve or reject conflicts.', 'error');
  const resolutionNotes = status === 'Rejected'
    ? 'Request rejected by Manager due to the reported conflict.'
    : 'Conflict reviewed and resolved by Manager.';
  try {
    await apiFetch(`/api/conflicts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
    });
    await loadProtectedData();
    showToast(`Conflict ${status.toLowerCase()}.`, 'success');
  } catch (error) {
    showToast(error.message || 'Unable to update conflict.', 'error');
  }
}

function addGlobalEventHandlers() {
  document.querySelectorAll('[data-icon]').forEach((element) => {
    const markup = iconMarkup(element.dataset.icon);
    if (element.classList.contains('button-icon')) element.innerHTML = markup;
    else element.insertAdjacentHTML('afterbegin', markup);
  });

  sectionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.section) setSection(button.dataset.section);
      closeNavigation();
    });
  });

  menuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = sidebarNav.classList.toggle('hidden') === false;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  document.addEventListener('click', (event) => {
    if (sidebarNav && menuToggle && !sidebarNav.contains(event.target) && !menuToggle.contains(event.target)) {
      closeNavigation();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation();
  });

  profileTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    profileDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!profileDropdown || !profileTrigger) return;
    if (!profileDropdown.contains(event.target) && !profileTrigger.contains(event.target)) {
      profileDropdown.classList.add('hidden');
    }
  });

  const globalSearch = document.getElementById('globalSearch');
  const globalSearchResults = document.getElementById('globalSearchResults');
  const globalSearchClear = document.getElementById('globalSearchClear');

  globalSearch?.addEventListener('focus', () => renderGlobalSearchResults(globalSearch.value));
  globalSearch?.addEventListener('input', (event) => renderGlobalSearchResults(event.target.value));

  globalSearch?.addEventListener('keydown', (event) => {
    const options = [...(globalSearchResults?.querySelectorAll('.search-result') || [])];
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGlobalSearch(true);
      event.target.blur();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!options.length) return;
      event.preventDefault();
      globalSearchActiveIndex = event.key === 'ArrowDown'
        ? (globalSearchActiveIndex + 1) % options.length
        : (globalSearchActiveIndex - 1 + options.length) % options.length;
      options.forEach((option, index) => option.classList.toggle('active', index === globalSearchActiveIndex));
      options[globalSearchActiveIndex]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = options[globalSearchActiveIndex] || options[0];
      if (target) chooseGlobalSearchResult(target.dataset.searchSection, target.dataset.searchId);
    }
  });

  globalSearchClear?.addEventListener('click', () => {
    if (!globalSearch) return;
    globalSearch.value = '';
    globalSearch.focus();
    renderGlobalSearchResults('');
  });

  globalSearchResults?.addEventListener('click', (event) => {
    const target = event.target.closest('.search-result');
    if (!target) return;
    chooseGlobalSearchResult(target.dataset.searchSection, target.dataset.searchId);
  });

  document.addEventListener('click', (event) => {
    if (globalSearch?.closest('.global-search-wrap') && !globalSearch.closest('.global-search-wrap').contains(event.target)) {
      closeGlobalSearch();
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      globalSearch?.focus();
    }
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => selectAuthTab(button.dataset.target));
  });

  document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    state.token = '';
    state.user = null;
    setAuthView(false);
    showToast('You have been logged out.', 'info');
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  resourceForm.addEventListener('submit', handleResourceSubmit);
  requestForm.addEventListener('submit', handleRequestSubmit);
  resourceProposalForm.addEventListener('submit', handleResourceProposalSubmit);
  bindImagePicker('resourceImageFile', 'resourceImagePreview', 'resourceImageName', 'resourceImageData');
  bindImagePicker('proposalImageFile', 'proposalImagePreview', 'proposalImageName', 'proposalImageData');

  document.getElementById('addResourceBtn').addEventListener('click', () => {
    if (!state.authority.canManageResources) return;
    resourceForm.reset();
    clearImagePicker('resourceImageFile', 'resourceImagePreview', 'resourceImageName', 'resourceImageData');
    document.getElementById('resourceId').value = '';
    document.getElementById('resourceForm').classList.remove('hidden');
  });

  document.getElementById('cancelResourceForm').addEventListener('click', () => resourceForm.classList.add('hidden'));
  document.getElementById('resourceSearch').addEventListener('input', renderResources);

  ['requestResource', 'requestDate', 'requestStart', 'requestEnd'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderRequestAvailability);
    document.getElementById(id)?.addEventListener('change', renderRequestAvailability);
  });
  ['resourceCategoryFilter', 'resourceDepartmentFilter', 'resourceStatusFilter', 'resourceAvailabilityFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderResources);
  });
  document.getElementById('clearResourceFilters').addEventListener('click', () => {
    document.getElementById('resourceSearch').value = '';
    ['resourceCategoryFilter', 'resourceDepartmentFilter', 'resourceStatusFilter', 'resourceAvailabilityFilter'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    renderResources();
  });

  const resourceDetailDialog = document.getElementById('resourceDetailDialog');
  document.getElementById('closeResourceDetail').addEventListener('click', () => resourceDetailDialog.close());
  document.getElementById('closeResourceDetailFooter').addEventListener('click', () => resourceDetailDialog.close());
  resourceDetailDialog.addEventListener('click', (event) => {
    if (event.target === resourceDetailDialog) resourceDetailDialog.close();
  });
  document.getElementById('requestResourceFromDetail').addEventListener('click', () => {
    if (!state.detailResourceId) return;
    resourceDetailDialog.close();
    setSection('requests');
    requestForm.reset();
    document.getElementById('requestResource').value = String(state.detailResourceId);
    requestForm.classList.remove('hidden');
    requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('resourceProposalBtn').addEventListener('click', () => {
    resourceProposalForm.reset();
    clearImagePicker('proposalImageFile', 'proposalImagePreview', 'proposalImageName', 'proposalImageData');
    document.getElementById('proposalQuantity').value = '1';
    resourceProposalForm.classList.remove('hidden');
    resourceProposalForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('cancelResourceProposal').addEventListener('click', () => resourceProposalForm.classList.add('hidden'));

  document.getElementById('addRequestBtn').addEventListener('click', () => {
    requestForm.reset();
    document.getElementById('requestForm').classList.remove('hidden');
    setSection('requests');
    renderRequestAvailability();
  });

  document.getElementById('calendarPrev')?.addEventListener('click', () => { calendarWeekOffset -= 1; renderCalendar(); });
  document.getElementById('calendarNext')?.addEventListener('click', () => { calendarWeekOffset += 1; renderCalendar(); });
  document.getElementById('calendarToday')?.addEventListener('click', () => { calendarWeekOffset = 0; renderCalendar(); });
  document.getElementById('createMaintenanceBtn')?.addEventListener('click', () => {
    setSection('maintenance');
    const form = document.getElementById('maintenanceForm');
    form.classList.remove('hidden');
    populateSelect('maintenanceResource', state.resources.filter((r) => !['Inactive','Retired'].includes(r.status)).map((r) => ({ value: r.id, label: `${r.name} · ${r.code}` })));
  });
  document.getElementById('cancelMaintenanceForm')?.addEventListener('click', () => document.getElementById('maintenanceForm').classList.add('hidden'));
  document.getElementById('maintenanceForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await apiFetch('/api/maintenance', { method: 'POST', body: JSON.stringify({
        resource_id: Number(document.getElementById('maintenanceResource').value),
        ticket_type: document.getElementById('maintenanceType').value,
        priority: document.getElementById('maintenancePriority').value,
        title: document.getElementById('maintenanceTitle').value.trim(),
        scheduled_date: document.getElementById('maintenanceScheduledDate').value || null,
        estimated_cost: Number(document.getElementById('maintenanceEstimatedCost').value) || 0,
        description: document.getElementById('maintenanceDescription').value.trim(),
      })});
      event.target.reset();
      event.target.classList.add('hidden');
      await loadProtectedData();
      showToast('Maintenance ticket created and resource lifecycle updated.', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to create maintenance ticket.', 'error');
    }
  });

  document.getElementById('calendarCreateRequest')?.addEventListener('click', () => {
    setSection('requests');
    requestForm.reset();
    requestForm.classList.remove('hidden');
    renderRequestAvailability();
    requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('cancelRequestForm').addEventListener('click', () => requestForm.classList.add('hidden'));

  document.body.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    const decision = target.dataset.decision;
    const status = target.dataset.status;
    if (action === 'view-resource') handleViewResource(id);
    if (action === 'edit-resource') handleEditResource(id);
    if (action === 'delete-resource') handleDeleteResource(id);
    if (action === 'decide-request') handleRequestDecision(id, decision);
    if (action === 'resolve-conflict') handleConflictDecision(id, status);
    if (action === 'complete-maintenance') handleMaintenanceDecision(id, 'Completed');
    if (action === 'progress-maintenance') handleMaintenanceDecision(id, 'In Progress');
    if (action === 'review-resource-addition') handleResourceAdditionReview(id, decision);
  });
}

async function handleMaintenanceDecision(id, status) {
  if (!state.authority.canDecideRequests) return showToast('Only managers can update maintenance work.', 'error');
  try {
    await apiFetch(`/api/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadProtectedData();
    showToast(`Maintenance ticket marked ${status.toLowerCase()}.`, 'success');
  } catch (error) {
    showToast(error.message || 'Unable to update maintenance ticket.', 'error');
  }
}

async function handleResourceAdditionReview(id, decision) {
  if (!state.authority.canReviewResourceProposals) return showToast('You do not have authority to review resource-addition requests.', 'error');
  if (decision === 'Approved' && !confirm('Approve this resource proposal and create the resource?')) return;
  const reviewNote = decision === 'Rejected' ? window.prompt('Reason for rejection:') : '';
  if (decision === 'Rejected' && !reviewNote?.trim()) return showToast('Enter a reason to reject this proposal.', 'error');
  try {
    await apiFetch(`/api/resource-addition-requests/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, review_note: reviewNote?.trim() || '' }),
    });
    await loadProtectedData();
    showToast(`Resource proposal ${decision.toLowerCase()}.`, 'success');
  } catch (error) {
    showToast(error.message || 'Unable to review resource-addition request.', 'error');
  }
}

function closeNavigation() {
  sidebarNav?.classList.add('hidden');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
}

async function bootstrap() {
  const dateNode = document.getElementById('dashboardDate');
  if (dateNode) dateNode.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  setAuthView(Boolean(state.token));
  addGlobalEventHandlers();
  await loadOrganizationTypes();

  if (state.token) {
    try {
      await loadProtectedData();
    } catch (error) {
      console.error(error);
      localStorage.removeItem('token');
      state.token = '';
      setAuthView(false);
    }
  }
}

bootstrap();
