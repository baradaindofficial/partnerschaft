/**
 * EMAIL SETUP — READ BEFORE DEPLOYING
 * =====================================
 * Emails send FROM your Google account but show "Barada Academy" as sender name.
 * To send FROM academy@barada.in:
 * 1. Go to Gmail Settings → Accounts → "Add another email address"
 * 2. Add academy@barada.in (requires domain MX pointing to Google Workspace)
 * 3. Change SEND_AS below to 'academy@barada.in'
 */
const SEND_AS = 'academy@barada.in'; // Set this once Gmail alias is configured
/**
 * BARADA ACADEMY — Google Apps Script Backend
 * ============================================
 * HOW TO DEPLOY:
 * 1. Go to sheets.google.com → create a new Google Sheet
 * 2. Name it: "Barada Academy Registry"
 * 3. Create two tabs: "Learners" and "Certificates"
 * 4. Go to Extensions → Apps Script
 * 5. Paste this entire file, save it
 * 6. Click Deploy → New deployment → Web app
 * 7. Execute as: Me | Who has access: Anyone
 * 8. Copy the Web App URL
 * 9. Paste the URL in:
 *    - academy.html  → const GAS_ENDPOINT = 'YOUR_URL_HERE'
 *    - verify.html   → const GAS_URL = 'YOUR_URL_HERE'
 *
 * SHEET STRUCTURE:
 * Tab "Learners":   Timestamp | Name | Email | Learner ID | Domain | Organisation | IP (blank)
 * Tab "Certificates": Timestamp | Cert ID | Name | Email | Course | Score | Date | Attempts | Time Spent
 */

// ── CONFIGURATION ──────────────────────────────────────────
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const LEARNERS_SHEET   = 'Learners';
const CERTS_SHEET      = 'Certificates';
const NOTIFY_EMAIL     = 'info@barada.in'; // Admin notification email
const SEND_LEARNER_EMAIL = true;  // Set false to disable learner welcome email
const SEND_CERT_EMAIL    = true;  // Set false to disable certificate email

// Allowed course codes (add new ones as you launch courses)
const VALID_COURSES = new Set([
  'AI001', 'PR001', 'PR002', 'PR003', 'PR004',
  'DA001', 'DA002', 'DA003', 'DA004',
  'FI001', 'FI002', 'FI003', 'FI004',
  'MK001', 'MK002', 'MK003', 'MK004',
  'AC001', 'AC002', 'AC003',
  'OP001', 'OP002', 'OP003', 'OP004'
]);

// ── MAIN ROUTER ───────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'verify') return handleVerify(e);
    if (action === 'stats')  return handleStats(e);
    return jsonResponse({ status: 'Barada Academy API running', version: '1.0' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const type = body.type || '';
    if (type === 'register')    return handleRegister(body);
    if (type === 'certificate') return handleCertificate(body);
    return jsonResponse({ error: 'Unknown type' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── REGISTRATION HANDLER ──────────────────────────────────
function handleRegister(data) {
  const name  = sanitise(data.name,  60);
  const email = sanitise(data.email, 120).toLowerCase();
  const org   = sanitise(data.org,   100);
  const domain = sanitise(data.domain, 30);
  const learnerId = data.id || generateId('BA-L');

  if (!name || !email) return jsonResponse({ error: 'Name and email required' }, 400);
  if (!isValidEmail(email)) return jsonResponse({ error: 'Invalid email format' }, 400);

  // Check for duplicate email
  const sheet = getSheet(LEARNERS_SHEET);
  const existing = findRow(sheet, 3, email); // column 3 = email
  if (existing) {
    // Return existing learner ID
    return jsonResponse({ success: true, learnerId: sheet.getRange(existing, 4).getValue(), existing: true });
  }

  // Record new learner
  sheet.appendRow([
    new Date().toISOString(),
    name,
    email,
    learnerId,
    domain,
    org,
    '' // IP placeholder — not captured for privacy
  ]);

  // Send welcome email to learner
  if (SEND_LEARNER_EMAIL) {
    try {
      GmailApp.sendEmail(email,
        '[Barada Academy] Welcome — Your Learning Journey Begins',
        'Hi ' + name + ',\n\n' +
        'You are now registered with Barada Academy.\n\n' +
        'Your Learner ID: ' + learnerId + '\n\n' +
        'Start learning at: https://barada.in/academy\n\n' +
        'All courses are free. Good luck!\n\n' +
        '— Barada Academy\nbarada.in/academy'
      );
    } catch(e) { /* Email sending is non-critical */ }
  }

  return jsonResponse({ success: true, learnerId });
}

// ── CERTIFICATE RECORDING HANDLER ────────────────────────
function handleCertificate(data) {
  const certId   = sanitise(data.certId,  80);
  const name     = sanitise(data.name,    60);
  const email    = sanitise(data.email,   120).toLowerCase();
  const course   = sanitise(data.course,  100);
  const courseCode = sanitise(data.courseCode, 10).toUpperCase();
  const score    = parseInt(data.score)  || 0;
  const total    = parseInt(data.total)  || 10;
  const attempts = parseInt(data.attempts) || 1;
  const timeSec  = parseInt(data.timeSec) || 0;

  if (!certId || !name || !email) return jsonResponse({ error: 'Missing required fields' }, 400);
  if (!isValidEmail(email)) return jsonResponse({ error: 'Invalid email' }, 400);

  // Check for rate limit: max 3 certificates per email per 24h for same course
  const sheet = getSheet(CERTS_SHEET);
  const dayAgo = new Date(Date.now() - 86400000);
  const allRows = sheet.getDataRange().getValues();
  let recentAttempts = 0;
  for (const row of allRows) {
    if (String(row[3]).toLowerCase() === email &&
        String(row[4]) === (courseCode || 'AI001') &&
        new Date(row[0]) > dayAgo) {
      recentAttempts++;
    }
  }
  if (recentAttempts >= 3) {
    return jsonResponse({ error: 'Rate limit: max 3 certificates per course per 24 hours', rateLimit: true }, 429);
  }

  // Verify score meets pass mark
  if (score < 7) return jsonResponse({ error: 'Score below pass mark (7/10)' }, 400);

  // Verify minimum time spent (anti-cheat: must have spent at least 600 seconds = 10 minutes)
  if (timeSec < 600) {
    // Log the attempt but don't issue certificate
    Logger.log('Suspicious: ' + email + ' completed in ' + timeSec + 's');
    // Still issue cert but flag it
  }

  // Check for duplicate cert ID
  const dupRow = findRow(sheet, 2, certId);
  if (dupRow) {
    return jsonResponse({ success: true, certId, duplicate: true, message: 'Certificate already recorded' });
  }

  const issuedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Record certificate
  sheet.appendRow([
    new Date().toISOString(),
    certId,
    name,
    email,
    courseCode || 'AI001',
    score + '/' + total,
    issuedDate,
    attempts,
    timeSec,
    course,
    timeSec < 600 ? 'FLAGGED' : 'OK' // Internal flag
  ]);

  // Send certificate confirmation email to learner
  if (SEND_CERT_EMAIL) {
    try {
      GmailApp.sendEmail(email,
        '🎓 [Barada Academy] Your Certificate — ' + course,
        'Congratulations ' + name + '!\n\n' +
        'You have successfully completed: ' + course + '\n\n' +
        'Score: ' + score + '/' + total + '\n' +
        'Certificate ID: ' + certId + '\n' +
        'Date: ' + issuedDate + '\n\n' +
        'Verify your certificate: https://barada.in/verify\n\n' +
        'To add to LinkedIn:\n' +
        '1. Go to your LinkedIn profile\n' +
        '2. Click "Add section" → Licenses & Certifications\n' +
        '3. Issuing organisation: Barada Academy\n' +
        '4. Credential ID: ' + certId + '\n' +
        '5. Credential URL: https://barada.in/verify\n\n' +
        '— Barada Academy\nhttps://barada.in/academy\info@barada.in'
      );
    } catch(e) { /* Non-critical */ }
  }

  // Admin notification
  try {
    GmailApp.sendEmail(NOTIFY_EMAIL,
      '[BA] New Certificate — ' + name + ' · ' + course,
      'New certificate issued:\n\nName: ' + name + '\nEmail: ' + email + '\nCourse: ' + course + '\nScore: ' + score + '/10\nCert ID: ' + certId + '\nDate: ' + issuedDate + '\nTime spent: ' + Math.round(timeSec/60) + ' min\nAttempts: ' + attempts
    );
  } catch(e) { /* Non-critical */ }

  return jsonResponse({ success: true, certId, issuedDate });
}

// ── VERIFICATION HANDLER ─────────────────────────────────
function handleVerify(e) {
  const certId = sanitise((e.parameter && e.parameter.id) || '', 80).toUpperCase();
  if (!certId) return jsonResponse({ found: false, error: 'No cert ID provided' });

  const sheet = getSheet(CERTS_SHEET);
  const allRows = sheet.getDataRange().getValues();

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (String(row[1]).toUpperCase() === certId) {
      return jsonResponse({
        found: true,
        certId: row[1],
        name: row[2],
        course: row[9] || row[4],
        score: row[5],
        date: row[6],
        issuedAt: row[0]
      });
    }
  }

  return jsonResponse({ found: false });
}

// ── STATS HANDLER (admin only) ────────────────────────────
function handleStats(e) {
  const key = e.parameter && e.parameter.key;
  if (key !== 'barada2024admin') return jsonResponse({ error: 'Unauthorised' }, 403);

  const learners = getSheet(LEARNERS_SHEET).getLastRow() - 1;
  const certs    = getSheet(CERTS_SHEET).getLastRow() - 1;

  return jsonResponse({
    totalLearners: Math.max(0, learners),
    totalCertificates: Math.max(0, certs),
    timestamp: new Date().toISOString()
  });
}

// ── UTILITIES ─────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Add headers
    if (name === LEARNERS_SHEET) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Learner ID', 'Domain', 'Organisation', 'IP']);
    } else if (name === CERTS_SHEET) {
      sheet.appendRow(['Timestamp', 'Cert ID', 'Name', 'Email', 'Course Code', 'Score', 'Date', 'Attempts', 'Time (s)', 'Course Name', 'Flag']);
    }
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col - 1]).toLowerCase() === String(value).toLowerCase()) return i + 1;
  }
  return null;
}

function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

function sanitise(val, max) {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>"'&]/g, '').slice(0, max).trim();
}

function isValidEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(email);
}

function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── MANUAL ADMIN FUNCTIONS (run from Apps Script editor) ──
function setupSheets() {
  getSheet(LEARNERS_SHEET);
  getSheet(CERTS_SHEET);
  Logger.log('Sheets created successfully.');
}

function listAllCertificates() {
  const sheet = getSheet(CERTS_SHEET);
  const data = sheet.getDataRange().getValues();
  Logger.log('Total certificates: ' + (data.length - 1));
  data.slice(1, 11).forEach(row => Logger.log(row.join(' | ')));
}

function searchByEmail(email) {
  const sheet = getSheet(CERTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const results = data.filter(row => String(row[3]).toLowerCase() === email.toLowerCase());
  Logger.log('Found: ' + results.length + ' certificate(s)');
  results.forEach(r => Logger.log(r.join(' | ')));
}
