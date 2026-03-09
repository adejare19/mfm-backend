/**
 * MFM IFESOWAPO — church.js (Updated)
 * ─────────────────────────────────────────────────────────────
 * Changes from original:
 *  1. Admin auth now uses the secure backend API (JWT + httpOnly cookie)
 *     instead of localStorage password check
 *  2. Upload modal now sends files to the backend API
 *  3. Sermons, Events, Resources are fetched dynamically from the database
 *  4. Contact form now submits to the backend API
 * ─────────────────────────────────────────────────────────────
 */

// ── CONFIG — change this to your deployed backend URL ──────────
const API_BASE = 'https://your-backend-url.onrender.com/api';
// e.g. 'https://mfm-backend.onrender.com/api'

// ── STATE ────────────────────────────────────────────────────
let isAdminLoggedIn = false;

// ── UTILITY ──────────────────────────────────────────────────
const showNotification = (message, type = 'success') => {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 15px 25px; border-radius: 8px; font-weight: 600;
    background: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
};

// ── AUTH ──────────────────────────────────────────────────────

/**
 * Check on page load if the user is already logged in (valid cookie session)
 */
const checkSession = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      credentials: 'include', // Send httpOnly cookie
    });
    if (res.ok) {
      isAdminLoggedIn = true;
      showAdminUI();
    }
  } catch (e) {
    // Not logged in — silent fail
  }
};

/**
 * Admin Login — replaces the old localStorage password check
 */
const adminLogin = async (password) => {
  const email = 'admin@mfmifesowapo.org'; // or add an email field to the modal

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      isAdminLoggedIn = true;
      showAdminUI();
      closeLoginModal();
      showNotification('Welcome back! You are now logged in.');
    } else {
      showLoginError(data.message || 'Invalid credentials.');
    }
  } catch (err) {
    showLoginError('Unable to connect to the server. Please try again.');
  }
};

/**
 * Admin Logout
 */
const adminLogout = async () => {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) { /* ignore */ }

  isAdminLoggedIn = false;
  hideAdminUI();
  showNotification('You have been logged out.');
};

// ── UI HELPERS ────────────────────────────────────────────────

const showAdminUI = () => {
  const uploadBtn = document.querySelector('.upload-btn');
  const logoutBtn = document.querySelector('.logout-btn');
  if (uploadBtn) uploadBtn.style.display = 'inline-flex';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
};

const hideAdminUI = () => {
  const uploadBtn = document.querySelector('.upload-btn');
  const logoutBtn = document.querySelector('.logout-btn');
  if (uploadBtn) uploadBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';
};

const closeLoginModal = () => {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
};

const showLoginError = (message) => {
  const errorEl = document.querySelector('#loginModal .error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
};

// ── UPLOAD ────────────────────────────────────────────────────

/**
 * Handle content upload — replaces the fake upload that went nowhere
 */
const handleUpload = async (formData, type) => {
  const endpointMap = {
    'Sermon': 'sermons',
    'Event/Flyer': 'events',
    'Prayer Booklet': 'resources',
    'Activity': 'resources',
  };

  const endpoint = endpointMap[type] || 'resources';

  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData, // FormData — do NOT set Content-Type header (browser sets it with boundary)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showNotification('Content uploaded successfully!');
      // Refresh the relevant section
      if (endpoint === 'sermons') loadSermons();
      else if (endpoint === 'events') loadEvents();
      else loadResources();
      return true;
    } else if (res.status === 401) {
      showNotification('Session expired. Please log in again.', 'error');
      isAdminLoggedIn = false;
      hideAdminUI();
      return false;
    } else {
      showNotification(data.message || 'Upload failed. Please try again.', 'error');
      return false;
    }
  } catch (err) {
    showNotification('Network error. Please check your connection.', 'error');
    return false;
  }
};

// ── FETCH & RENDER CONTENT ────────────────────────────────────

/**
 * Load and render sermons from the API
 */
const loadSermons = async () => {
  const container = document.querySelector('.sermons-grid') || document.getElementById('sermons-container');
  const countEl = document.querySelector('.stat-sermons');

  try {
    const res = await fetch(`${API_BASE}/sermons`);
    const data = await res.json();

    if (!data.success || !data.data.length) {
      if (container) container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📖</span>
          <h3>No Sermons Found</h3>
          <p>Check back soon for inspiring messages</p>
        </div>`;
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = data.data.length;

    if (container) {
      container.innerHTML = data.data.map(sermon => {
        const date = new Date(sermon.sermon_date).toLocaleDateString('en-NG', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

        const mediaHtml = sermon.files && sermon.files.length > 0
          ? sermon.files.map(f => {
              if (f.type && f.type.startsWith('audio/')) {
                return `<audio controls style="width:100%;margin-top:10px"><source src="${f.url}" type="${f.type}">Your browser does not support audio.</audio>`;
              }
              if (f.type && f.type.startsWith('video/')) {
                return `<video controls style="width:100%;margin-top:10px;border-radius:8px"><source src="${f.url}" type="${f.type}">Your browser does not support video.</video>`;
              }
              if (f.type === 'application/pdf') {
                return `<a href="${f.url}" target="_blank" class="resource-link">📄 ${f.name}</a>`;
              }
              return `<img src="${f.url}" alt="${sermon.title}" style="width:100%;border-radius:8px;margin-top:10px">`;
            }).join('')
          : '';

        const deleteBtn = isAdminLoggedIn
          ? `<button class="delete-btn" onclick="deleteContent('sermons','${sermon.id}',this)">🗑 Delete</button>`
          : '';

        return `
          <div class="sermon-card" data-id="${sermon.id}">
            <div class="sermon-date">${date}</div>
            <h3 class="sermon-title">${sermon.title}</h3>
            ${sermon.preacher ? `<p class="sermon-preacher">By ${sermon.preacher}</p>` : ''}
            ${sermon.series ? `<span class="sermon-series">Series: ${sermon.series}</span>` : ''}
            ${sermon.description ? `<p class="sermon-description">${sermon.description}</p>` : ''}
            ${mediaHtml}
            ${deleteBtn}
          </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('[loadSermons] Error:', err);
  }
};

/**
 * Load and render events from the API
 */
const loadEvents = async () => {
  const container = document.querySelector('.events-grid') || document.getElementById('events-container');
  const countEl = document.querySelector('.stat-events');

  try {
    const res = await fetch(`${API_BASE}/events`);
    const data = await res.json();

    if (!data.success || !data.data.length) {
      if (container) container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📅</span>
          <h3>No Upcoming Events</h3>
          <p>Check back soon for new activities and programs</p>
        </div>`;
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = data.data.length;

    if (container) {
      container.innerHTML = data.data.map(event => {
        const date = new Date(event.event_date).toLocaleDateString('en-NG', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const deleteBtn = isAdminLoggedIn
          ? `<button class="delete-btn" onclick="deleteContent('events','${event.id}',this)">🗑 Delete</button>`
          : '';

        return `
          <div class="event-card" data-id="${event.id}">
            ${event.flyer_url ? `<img src="${event.flyer_url}" alt="${event.title}" class="event-flyer">` : ''}
            <div class="event-content">
              <div class="event-date">${date}</div>
              ${event.time ? `<div class="event-time">⏰ ${event.time}</div>` : ''}
              <h3 class="event-title">${event.title}</h3>
              ${event.location ? `<p class="event-location">📍 ${event.location}</p>` : ''}
              ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            </div>
            ${deleteBtn}
          </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('[loadEvents] Error:', err);
  }
};

/**
 * Load and render resources from the API
 */
const loadResources = async () => {
  const container = document.querySelector('.resources-grid') || document.getElementById('resources-container');
  const countEl = document.querySelector('.stat-resources');

  try {
    const res = await fetch(`${API_BASE}/resources`);
    const data = await res.json();

    if (!data.success || !data.data.length) {
      if (container) container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📚</span>
          <h3>No Resources Available</h3>
          <p>Check back soon for prayer booklets and study materials</p>
        </div>`;
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = data.data.length;

    if (container) {
      container.innerHTML = data.data.map(resource => {
        const deleteBtn = isAdminLoggedIn
          ? `<button class="delete-btn" onclick="deleteContent('resources','${resource.id}',this)">🗑 Delete</button>`
          : '';

        const filesHtml = resource.files && resource.files.length > 0
          ? resource.files.map(f =>
              `<a href="${f.url}" target="_blank" class="resource-link" download>
                📄 ${f.name || 'Download'}
              </a>`
            ).join('')
          : '';

        return `
          <div class="resource-card" data-id="${resource.id}">
            <span class="resource-category">${resource.category}</span>
            <h3 class="resource-title">${resource.title}</h3>
            ${resource.description ? `<p class="resource-description">${resource.description}</p>` : ''}
            ${filesHtml}
            ${deleteBtn}
          </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('[loadResources] Error:', err);
  }
};

/**
 * Delete content (admin only)
 */
const deleteContent = async (type, id, btn) => {
  if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;

  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE}/${type}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const card = btn.closest('[data-id]');
      if (card) card.remove();
      showNotification('Item deleted successfully.');
    } else {
      showNotification(data.message || 'Failed to delete.', 'error');
      btn.disabled = false;
      btn.textContent = '🗑 Delete';
    }
  } catch (err) {
    showNotification('Network error. Could not delete.', 'error');
    btn.disabled = false;
    btn.textContent = '🗑 Delete';
  }
};

// ── CONTACT FORM ──────────────────────────────────────────────

const initContactForm = () => {
  const form = document.querySelector('.contact-form') || document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

    const name    = form.querySelector('[name="name"], #name')?.value.trim();
    const email   = form.querySelector('[name="email"], #email')?.value.trim();
    const subject = form.querySelector('[name="subject"], #subject')?.value.trim();
    const message = form.querySelector('[name="message"], #message')?.value.trim();

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showNotification('Message sent! We will get back to you soon. 🙏');
        form.reset();
      } else {
        showNotification(data.message || 'Failed to send. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Network error. Please try again.', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  });
};

// ── UPLOAD MODAL INTEGRATION ──────────────────────────────────

const initUploadModal = () => {
  const uploadForm = document.getElementById('uploadForm') || document.querySelector('.upload-form');
  if (!uploadForm) return;

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const typeSelect = uploadForm.querySelector('[name="type"], #contentType, select');
    const titleInput = uploadForm.querySelector('[name="title"], #uploadTitle');
    const descInput  = uploadForm.querySelector('[name="description"], #uploadDescription');
    const filesInput = uploadForm.querySelector('input[type="file"]');

    const type        = typeSelect?.value;
    const title       = titleInput?.value.trim();
    const description = descInput?.value.trim();
    const files       = filesInput?.files;

    if (!title) { showNotification('Please enter a title.', 'error'); return; }
    if (!files || files.length === 0) { showNotification('Please select at least one file.', 'error'); return; }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    if (description) formData.append('description', description);
    for (const file of files) { formData.append('files', file); }

    // Add content-type-specific fields
    const dateInput = uploadForm.querySelector('[name="date"], #sermonDate, #eventDate');
    if (dateInput?.value) {
      if (type === 'Sermon') formData.append('sermon_date', dateInput.value);
      else if (type === 'Event/Flyer') formData.append('event_date', dateInput.value);
    }

    const submitBtn = uploadForm.querySelector('button[type="submit"]') || uploadForm.querySelector('.upload-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading...'; }

    const success = await handleUpload(formData, type);

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Upload'; }

    if (success) {
      uploadForm.reset();
      const modal = document.getElementById('uploadModal');
      if (modal) modal.style.display = 'none';
    }
  });
};

// ── LOGIN MODAL INTEGRATION ───────────────────────────────────

const initLoginModal = () => {
  const loginForm = document.getElementById('loginForm') || document.querySelector('.login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = loginForm.querySelector('input[type="password"]');
    if (passwordInput?.value) {
      await adminLogin(passwordInput.value);
      passwordInput.value = '';
    }
  });
};

// Wire logout button
const initLogoutButton = () => {
  const logoutBtn = document.querySelector('.logout-btn, #logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', adminLogout);
  }
};

// ── INIT ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load all dynamic content
  await Promise.all([loadSermons(), loadEvents(), loadResources()]);

  // Check if admin session exists from a previous visit
  await checkSession();

  // Wire up forms and buttons
  initContactForm();
  initUploadModal();
  initLoginModal();
  initLogoutButton();
});
