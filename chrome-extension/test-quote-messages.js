/**
 * Comprehensive E2E Verification Suite for Company Communication Scripts & Brand Voices
 *
 * Validates all 7 configured cleaning companies:
 *   - kacs: KACS Cleaning Services LLC (Frank)
 *   - jheys: Jhey’s Cleaning (Frank)
 *   - dasilva: Da Silva Cleaning Services (Andie)
 *   - utcleans: UT Cleans (Andie / Team)
 *   - marys: Mary's House Cleaning (Oliver)
 *   - gleam: Gleam Team Housecleaning (Andie)
 *   - express: Express House Cleaning (Andie)
 *
 * Test Tiers:
 *   - Tier 1: Feature Coverage & Completeness (quick replies, follow-ups, quotes, archiving, details)
 *   - Tier 2: Boundary, Corner Cases & Missing Data Fallbacks
 *   - Tier 3: Cross-Company Uniqueness & Normalized Body De-duplication
 *   - Tier 4: Attendant Persona & Profile Accuracy (names, phones, payments, signatures)
 *   - Tier 5: Adversarial, Escaping, and Integrity Verification
 */

const fs = require('fs');
const path = require('path');
const engine = require('./pricing.js');
const messages = require('./quote-messages.js');

// --- Test Harness & Reporting Infrastructure ---

const isReportOnly = process.argv.includes('--report-only') || process.argv.includes('--audit');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function recordCheck(passed, tier, description, details = null) {
  totalChecks++;
  if (passed) {
    passedChecks++;
  } else {
    failures.push({ tier, description, details });
  }
}

function assertCheck(condition, tier, description, details = null) {
  recordCheck(Boolean(condition), tier, description, details);
}

// --- Authoritative Profiles & Specification Oracle ---

const COMPANIES = ['kacs', 'jheys', 'dasilva', 'utcleans', 'marys', 'gleam', 'express'];

const COMPANY_PROFILES = {
  kacs: {
    fullName: 'KACS Cleaning Services LLC',
    shortNames: ['KACS Cleaning Services', 'KACS Cleaning', 'KACS'],
    attendant: 'Frank',
    allowedAttendants: ['Frank'],
    forbiddenAttendants: ['Andie', 'Oliver', 'Helen'],
    phone: '(925) 438-0657',
    cleanPhone: '9254380657',
    website: 'www.kacscleaning.com',
    googleLink: 'https://g.co/kgs/df1X25U',
    paymentRecipient: 'Juliana dos Santos Paixao',
    venmoSnippet: '2802683257815040106',
    venmoPin: '0949',
    zelle: '5049200949',
    followUpType: 'linear',
    linearCount: 4
  },
  jheys: {
    fullName: "Jhey’s Cleaning",
    shortNames: ["Jhey's Cleaning", 'Jheys'],
    attendant: 'Frank',
    allowedAttendants: ['Frank'],
    forbiddenAttendants: ['Andie', 'Oliver', 'Helen'],
    phone: '(925) 515-5090',
    cleanPhone: '9255155090',
    cancellationPhone: '(925) 317-4027',
    paymentRecipient: 'Jheyce Souza Barcelo',
    venmoHandle: 'Jheyce-Barcelo',
    zelle: '925 3174027',
    followUpType: 'linear',
    linearCount: 4
  },
  dasilva: {
    fullName: 'Da Silva Cleaning Services',
    shortNames: ['Da Silva Cleaning', 'Da Silva'],
    attendant: 'Andie',
    allowedAttendants: ['Andie'],
    forbiddenAttendants: ['Frank', 'Oliver', 'Helen'],
    phone: '(925) 515-3121',
    cleanPhone: '9255153121',
    paymentMethods: ['Cash', 'Zelle', 'Venmo'],
    followUpType: 'situational',
    situationsCount: 4,
    messagesPerSituation: 3
  },
  utcleans: {
    fullName: 'UT Cleans',
    shortNames: ['UT Cleans'],
    attendant: 'Andie',
    allowedAttendants: ['Andie'],
    forbiddenAttendants: ['Frank', 'Oliver', 'Helen'],
    phone: '(925) 202-0504',
    cleanPhone: '9252020504',
    paymentRecipient: 'Victor Teles Netto',
    venmoHandle: 'victornetto',
    venmoPin: '0275',
    zelle: '925-497-0275',
    mandatorySignature: 'Best regards',
    followUpType: 'situational',
    situationsCount: 4,
    messagesPerSituation: 3
  },
  marys: {
    fullName: "Mary's House Cleaning",
    shortNames: ["Mary’s House Cleaning", "Mary's"],
    attendant: 'Oliver',
    allowedAttendants: ['Oliver'],
    forbiddenAttendants: ['Frank', 'Andie', 'Helen'],
    phone: '(925) 905-8387',
    cleanPhone: '9259058387',
    paymentMethods: ['Cash', 'Zelle', 'Venmo'],
    mandatorySignature: 'Warm regards',
    followUpType: 'situational',
    situationsCount: 4,
    messagesPerSituation: 3
  },
  gleam: {
    fullName: 'Gleam Team Housecleaning',
    shortNames: ['Gleam Team'],
    attendant: 'Andie',
    allowedAttendants: ['Andie'],
    forbiddenAttendants: ['Frank', 'Oliver', 'Helen'],
    phone: '(925) 515-5461',
    cleanPhone: '9255155461',
    paymentMethods: ['Cash', 'Zelle', 'Venmo'],
    signatureClosing: '💛',
    followUpType: 'situational',
    situationsCount: 4,
    messagesPerSituation: 3
  },
  express: {
    fullName: 'Express House Cleaning',
    shortNames: ['Express'],
    attendant: 'Andie',
    allowedAttendants: ['Andie'],
    forbiddenAttendants: ['Frank', 'Oliver', 'Helen'],
    phone: '(510) 757-9573',
    cleanPhone: '5107579573',
    cancellationPhone: '(415) 724-7516',
    paymentRecipient: 'Marilda Neves',
    venmoHandle: 'Marilda-Neves',
    zelle: '(415) 724-7516',
    followUpType: 'situational',
    situationsCount: 4,
    messagesPerSituation: 3
  }
};

const ALL_QUICK_REPLY_IDS = [
  // Explanations & FAQs
  'deep_vs_regular',
  'why_sqft',
  'yelp_masked_phone',
  'move_out_pitch',
  'checklist_intro',
  // Objections & Lost Leads
  'budget_objection',
  'upfront_deposit',
  'needs_time',
  'found_better_price',
  'chose_another',
  'no_longer_needed',
  // Booking, Payment & Post-Cleaning
  'missed_call',
  'booking_confirmation',
  'payment_info',
  'payment_reminder',
  'post_cleaning_thanks',
  'recurring_offer',
  'cleaner_job_offer'
];

// --- Normalization Engine ---

function normalizeMessageBody(text) {
  if (typeof text !== 'string') return '';
  return text
    // Strip company full names and short variations
    .replace(/KACS Cleaning Services LLC|KACS Cleaning Services|KACS Cleaning|KACS/gi, '')
    .replace(/Jhey[’']s Cleaning Services|Jhey[’']s Cleaning|Jheys/gi, '')
    .replace(/Da Silva Cleaning Services|Da Silva Cleaning|Da Silva/gi, '')
    .replace(/UT Cleans/gi, '')
    .replace(/Mary['’]s House Cleaning|Mary['’]s/gi, '')
    .replace(/Gleam Team Housecleaning|Gleam Team/gi, '')
    .replace(/Express House Cleaning|Express/gi, '')
    // Strip attendant names
    .replace(/\b(Frank|Andie|Oliver|Helen)\b/gi, '')
    // Strip phone numbers in various formats
    .replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
    .replace(/\b\d{10}\b/g, '')
    // Strip URLs and domains
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    // Strip greetings
    .replace(/^Hi\s+[^\n,!]+[,!]?/i, '')
    .replace(/\bHi\s+[^\n,!]+[,!]?/gi, '')
    // Strip standard closings
    .replace(/(Warm|Best)\s+regards,?/gi, '')
    .replace(/Take care!?\s*💛?/gi, '')
    // Collapse punctuation, emojis, whitespace to canonical form
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ============================================================================
// TIER 1: Feature Coverage & Completeness
// ============================================================================
console.log('Running Tier 1: Feature Coverage & Completeness checks...');

const sampleLead = {
  customerName: 'Marvin',
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1600,
  location: 'Pleasanton',
  serviceType: 'Deep Cleaning'
};
const sampleQuote = {
  amount: 325,
  priceRange: { minimum: 325, maximum: 425 },
  serviceLabel: 'Deep Cleaning',
  estimatedHours: { minimum: 3.5, maximum: 5 }
};

// 1.1 Quick Replies completeness across all 3 categories and 18 items
for (const company of COMPANIES) {
  const groups = messages.quickReplies(company, sampleLead, sampleQuote);
  assertCheck(
    Array.isArray(groups) && groups.length === 3,
    'Tier 1',
    `${company}: quickReplies() must return exactly 3 categories`,
    { returnedCount: groups ? groups.length : 0 }
  );

  const foundIds = [];
  if (Array.isArray(groups)) {
    for (const group of groups) {
      assertCheck(
        typeof group.category === 'string' && group.items && group.items.length > 0,
        'Tier 1',
        `${company}: category "${group.category}" must contain items`
      );
      for (const item of group.items) {
        foundIds.push(item.id);
        const hasValidText = typeof item.message === 'string' && item.message.trim().length >= 20;
        assertCheck(
          hasValidText,
          'Tier 1',
          `${company}/${item.id}: message must be non-empty string (>20 chars)`,
          { length: item.message ? item.message.length : 0 }
        );
      }
    }
  }

  for (const expectedId of ALL_QUICK_REPLY_IDS) {
    assertCheck(
      foundIds.includes(expectedId),
      'Tier 1',
      `${company}: missing quick reply item "${expectedId}" in quickReplies()`
    );
  }
}

// 1.2 detailsRequestMessage completeness
for (const company of COMPANIES) {
  const singleDetail = messages.detailsRequestMessage(sampleLead, company, ['squareFeet']);
  assertCheck(
    typeof singleDetail === 'string' && singleDetail.trim().length > 30,
    'Tier 1',
    `${company}: detailsRequestMessage(single field) must return a formatted non-empty string`
  );

  const multiDetail = messages.detailsRequestMessage(sampleLead, company, ['squareFeet', 'bedrooms', 'bathrooms', 'photos']);
  assertCheck(
    typeof multiDetail === 'string' && multiDetail.trim().length > 50,
    'Tier 1',
    `${company}: detailsRequestMessage(multi fields) must return a formatted non-empty string`
  );
}

// 1.3 approvedMessage completeness (standard and missing-size)
for (const company of COMPANIES) {
  const standardCalc = engine.calculateQuote(
    { ...sampleLead, companyName: COMPANY_PROFILES[company].fullName },
    { companyOverride: company }
  );
  const approved = messages.approvedMessage({ lead: sampleLead, quote: standardCalc });
  assertCheck(
    typeof approved === 'string' && approved.trim().length > 50,
    'Tier 1',
    `${company}: approvedMessage(standard quote) must return a formatted non-empty string`
  );

  const missingSizeReview = {
    lead: { customerName: 'Marvin', serviceType: 'Deep Cleaning' },
    quote: { company, status: 'missing_size', serviceLabel: 'Deep Cleaning' }
  };
  const missingMsg = messages.approvedMessage(missingSizeReview);
  assertCheck(
    typeof missingMsg === 'string' && missingMsg.trim().length > 40,
    'Tier 1',
    `${company}: approvedMessage(missing_size) must return a formatted non-empty string`
  );
}

// 1.4 followUpStatus completeness
for (const company of COMPANIES) {
  const profile = COMPANY_PROFILES[company];
  const followUps = messages.followUpStatus(company, sampleLead, '');
  assertCheck(
    followUps !== null && followUps !== undefined,
    'Tier 1',
    `${company}: followUpStatus() must return non-null status`
  );

  if (profile.followUpType === 'linear') {
    assertCheck(
      Array.isArray(followUps) && followUps.length === profile.linearCount,
      'Tier 1',
      `${company}: linear follow-ups must return array of ${profile.linearCount} items`,
      { returned: Array.isArray(followUps) ? followUps.length : typeof followUps }
    );
    if (Array.isArray(followUps)) {
      followUps.forEach((fu, idx) => {
        assertCheck(
          fu && typeof fu.message === 'string' && fu.message.trim().length > 25,
          'Tier 1',
          `${company}: linear follow-up #${idx + 1} message must be valid non-empty string`
        );
      });
    }
  } else if (profile.followUpType === 'situational') {
    assertCheck(
      followUps && Array.isArray(followUps.situations) && followUps.situations.length === profile.situationsCount,
      'Tier 1',
      `${company}: situational follow-ups must have ${profile.situationsCount} situations`
    );
    if (followUps && Array.isArray(followUps.situations)) {
      followUps.situations.forEach((sit, sIdx) => {
        assertCheck(
          sit && Array.isArray(sit.messages) && sit.messages.length === profile.messagesPerSituation,
          'Tier 1',
          `${company}: situation #${sIdx + 1} must contain ${profile.messagesPerSituation} messages`
        );
        if (sit && Array.isArray(sit.messages)) {
          sit.messages.forEach((msg, mIdx) => {
            const raw = typeof msg === 'string' ? msg : msg?.message;
            assertCheck(
              typeof raw === 'string' && raw.trim().length > 25,
              'Tier 1',
              `${company}: situation #${sIdx + 1} message #${mIdx + 1} must be non-empty string`
            );
          });
        }
      });
    }
  }
}

// 1.5 archivingMessage completeness
for (const company of COMPANIES) {
  const archiveMsg = messages.archivingMessage(company, sampleLead);
  assertCheck(
    typeof archiveMsg === 'string' && archiveMsg.trim().length > 30,
    'Tier 1',
    `${company}: archivingMessage() must return a formatted non-empty string`
  );
}

// ============================================================================
// TIER 2: Boundary, Corner Cases & Missing Data Fallbacks
// ============================================================================
console.log('Running Tier 2: Boundary, Corner Cases & Missing Data checks...');

// 2.1 Missing customer name fallback across all message APIs
const leadNoName = { bedrooms: 3, bathrooms: 2, location: 'Pleasanton', serviceType: 'Deep Cleaning' };
for (const company of COMPANIES) {
  // Quick replies
  for (const id of ALL_QUICK_REPLY_IDS) {
    const rendered = messages.quickReplyMessage(id, company, leadNoName, sampleQuote);
    assertCheck(
      typeof rendered === 'string' && !rendered.includes('undefined') && !rendered.includes('null'),
      'Tier 2',
      `${company}/${id}: missing customerName must not render "undefined" or "null"`,
      { snippet: rendered ? rendered.slice(0, 50) : '' }
    );
  }

  // detailsRequestMessage
  const dReq = messages.detailsRequestMessage(leadNoName, company, ['squareFeet']);
  assertCheck(
    typeof dReq === 'string' && !dReq.includes('undefined') && !dReq.includes('null'),
    'Tier 2',
    `${company}: detailsRequestMessage must handle missing customerName without "undefined"`
  );

  // approvedMessage
  const appMsg = messages.approvedMessage({ lead: leadNoName, quote: { company, amount: 250, serviceLabel: 'Deep Cleaning' } });
  assertCheck(
    typeof appMsg === 'string' && !appMsg.includes('undefined') && !appMsg.includes('null'),
    'Tier 2',
    `${company}: approvedMessage must handle missing customerName without "undefined"`
  );

  // archivingMessage
  const archMsg = messages.archivingMessage(company, leadNoName);
  assertCheck(
    typeof archMsg === 'string' && !archMsg.includes('undefined') && !archMsg.includes('null'),
    'Tier 2',
    `${company}: archivingMessage must handle missing customerName without "undefined"`
  );
}

// 2.2 Missing location fallback
const leadNoLocation = { customerName: 'Alex', bedrooms: 2, bathrooms: 1, serviceType: 'Move-in Cleaning' };
for (const company of COMPANIES) {
  const bookingMsg = messages.quickReplyMessage('booking_confirmation', company, leadNoLocation, sampleQuote);
  assertCheck(
    typeof bookingMsg === 'string' && !bookingMsg.includes('undefined'),
    'Tier 2',
    `${company}: booking_confirmation must handle missing location gracefully`
  );

  const cleanerMsg = messages.quickReplyMessage('cleaner_job_offer', company, leadNoLocation, sampleQuote);
  assertCheck(
    typeof cleanerMsg === 'string' && !cleanerMsg.includes('undefined'),
    'Tier 2',
    `${company}: cleaner_job_offer must handle missing location gracefully`
  );
}

// 2.3 Missing quote / price amount fallback
const emptyQuote = {};
for (const company of COMPANIES) {
  const budgetMsg = messages.quickReplyMessage('budget_objection', company, sampleLead, emptyQuote);
  assertCheck(
    typeof budgetMsg === 'string' && !budgetMsg.includes('undefined'),
    'Tier 2',
    `${company}: budget_objection must handle missing quote amounts gracefully`
  );
}

// 2.4 Empty requestedDetails array in detailsRequestMessage must return null
for (const company of COMPANIES) {
  const emptyReq = messages.detailsRequestMessage(sampleLead, company, []);
  assertCheck(
    emptyReq === null,
    'Tier 2',
    `${company}: detailsRequestMessage with empty fields must return null`,
    { returned: emptyReq }
  );
}

// 2.5 Direct dictionary completeness (no fallback to default/kacs)
// Verify that quote-messages.js defines an explicit entry for every company in byCompany variants
function extractByCompanyObject(source, startIdx) {
  const callIdx = source.indexOf('byCompany(', startIdx);
  if (callIdx === -1) return null;
  const openBrace = source.indexOf('{', callIdx);
  let depth = 1;
  let i = openBrace + 1;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.substring(openBrace, i);
}

const quoteMessagesSource = fs.readFileSync(path.join(__dirname, 'quote-messages.js'), 'utf8');
ALL_QUICK_REPLY_IDS.forEach((replyId) => {
  if (replyId === 'cleaner_job_offer') return; // verified in Tier 3
  const idToken = `'${replyId}'`;
  const doubleToken = `"${replyId}"`;
  let idx = quoteMessagesSource.indexOf(idToken);
  if (idx === -1) idx = quoteMessagesSource.indexOf(doubleToken);
  if (idx !== -1) {
    const block = extractByCompanyObject(quoteMessagesSource, idx);
    if (block) {
      for (const comp of COMPANIES) {
        const hasKey = new RegExp(`\\b${comp}\\s*:`).test(block);
        assertCheck(
          hasKey,
          'Tier 2',
          `${replyId}: byCompany dictionary must explicitly define key "${comp}" without falling back to KACS`,
          { replyId, missingKey: comp }
        );
      }
    }
  }
});

// --- Similarity & Distance Helpers for Hardened Tier 3 ---

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let v0 = new Int32Array(n + 1);
  let v1 = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) v0[j] = j;
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1;
    const aChar = a.charCodeAt(i);
    for (let j = 0; j < n; j++) {
      const cost = aChar === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    const temp = v0; v0 = v1; v1 = temp;
  }
  return v0[n];
}

function levenshteinSimilarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1.0 : 1.0 - (levenshteinDistance(a, b) / maxLen);
}

function tokenize(text) {
  return new Set(text.split(' ').filter((w) => w.length > 2));
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

const COMMON_BOILERPLATE_SENTENCES = new Set([
  'let me know if there is anything i can help you with',
  'let us know if you have any questions',
  'please let us know if you have any questions',
  'thank you so much for reaching out',
  'thank you for getting back to us',
  'thank you for letting us know',
  'we truly appreciate you considering',
  'wishing you all the best',
  'thank you again for considering'
]);

function extractSubstantiveSentences(rawText) {
  if (typeof rawText !== 'string') return [];
  return rawText
    .split(/[\r\n.!?]+/)
    .map((s) => normalizeMessageBody(s))
    .filter((s) => {
      const words = s.split(' ').filter((w) => w.length > 1);
      if (words.length < 6 || s.length < 25) return false;
      if (COMMON_BOILERPLATE_SENTENCES.has(s)) return false;
      return true;
    });
}

// ============================================================================
// TIER 3: Cross-Company Uniqueness & Normalized De-duplication
// ============================================================================
console.log('Running Tier 3: Cross-Company Uniqueness & De-duplication checks...');

// 3.1 All 18 quick replies must have 7/7 unique raw AND normalized message bodies
for (const replyId of ALL_QUICK_REPLY_IDS) {
  const rawRendered = COMPANIES.map((c) => messages.quickReplyMessage(replyId, c, sampleLead, sampleQuote));
  const rawUnique = new Set(rawRendered).size;
  assertCheck(
    rawUnique === COMPANIES.length,
    'Tier 3',
    `${replyId}: raw message must be unique across all 7 companies (got ${rawUnique}/7)`,
    { replyId, rawUnique }
  );

  const normalizedBodies = rawRendered.map(normalizeMessageBody);
  const normUnique = new Set(normalizedBodies).size;
  if (normUnique < COMPANIES.length) {
    // Find collisions
    const collisions = [];
    for (let i = 0; i < COMPANIES.length; i++) {
      for (let j = i + 1; j < COMPANIES.length; j++) {
        if (normalizedBodies[i] === normalizedBodies[j]) {
          collisions.push(`${COMPANIES[i]} vs ${COMPANIES[j]}`);
        }
      }
    }
    assertCheck(
      false,
      'Tier 3',
      `${replyId}: normalized message body must be unique across all 7 companies (got ${normUnique}/7, collisions: ${collisions.join(', ')})`,
      { replyId, normUnique, collisions }
    );
  } else {
    assertCheck(true, 'Tier 3', `${replyId}: normalized message body is 100% unique across all 7 companies`);
  }
}

// 3.1.b Cross-company substantive sentence-level non-duplication check
for (const replyId of ALL_QUICK_REPLY_IDS) {
  const sentenceToCompany = new Map();
  const collisions = [];

  for (const c of COMPANIES) {
    const raw = messages.quickReplyMessage(replyId, c, sampleLead, sampleQuote);
    const sentences = extractSubstantiveSentences(raw);
    for (const sentence of sentences) {
      if (sentenceToCompany.has(sentence)) {
        const prior = sentenceToCompany.get(sentence);
        if (prior !== c) {
          collisions.push({ c1: prior, c2: c, sentence: sentence.slice(0, 80) });
        }
      } else {
        sentenceToCompany.set(sentence, c);
      }
    }
  }

  assertCheck(
    collisions.length === 0,
    'Tier 3',
    `${replyId}: zero substantive sentence collisions across companies (found ${collisions.length})`,
    { replyId, collisions }
  );
}

// 3.1.c Cross-company normalized similarity thresholds (Levenshtein < 85%, Jaccard < 80%)
const LEVENSHTEIN_THRESHOLD = 0.85;
const JACCARD_THRESHOLD = 0.80;

for (const replyId of ALL_QUICK_REPLY_IDS) {
  for (let i = 0; i < COMPANIES.length; i++) {
    for (let j = i + 1; j < COMPANIES.length; j++) {
      const c1 = COMPANIES[i];
      const c2 = COMPANIES[j];
      const norm1 = normalizeMessageBody(messages.quickReplyMessage(replyId, c1, sampleLead, sampleQuote));
      const norm2 = normalizeMessageBody(messages.quickReplyMessage(replyId, c2, sampleLead, sampleQuote));
      const levSim = levenshteinSimilarity(norm1, norm2);
      const jacSim = jaccardSimilarity(tokenize(norm1), tokenize(norm2));

      assertCheck(
        levSim < LEVENSHTEIN_THRESHOLD,
        'Tier 3',
        `${replyId} between ${c1} and ${c2}: Levenshtein similarity (${(levSim * 100).toFixed(1)}%) must be < ${(LEVENSHTEIN_THRESHOLD * 100)}%`,
        { replyId, c1, c2, levSim }
      );
      assertCheck(
        jacSim < JACCARD_THRESHOLD,
        'Tier 3',
        `${replyId} between ${c1} and ${c2}: Jaccard token similarity (${(jacSim * 100).toFixed(1)}%) must be < ${(JACCARD_THRESHOLD * 100)}%`,
        { replyId, c1, c2, jacSim }
      );
    }
  }
}

// 3.2 Follow-up de-duplication: KACS Follow-up #4 vs Jhey's Follow-up #4
const kacsFollowUps = messages.followUpStatus('kacs', sampleLead, '');
const jheysFollowUps = messages.followUpStatus('jheys', sampleLead, '');
assertCheck(
  Array.isArray(kacsFollowUps) && kacsFollowUps.length >= 4 && Array.isArray(jheysFollowUps) && jheysFollowUps.length >= 4,
  'Tier 3',
  'KACS and Jheys must both provide at least 4 follow-ups'
);
if (kacsFollowUps && jheysFollowUps && kacsFollowUps[3] && jheysFollowUps[3]) {
  const kacsBody4 = normalizeMessageBody(kacsFollowUps[3].message);
  const jheysBody4 = normalizeMessageBody(jheysFollowUps[3].message);
  const isDuplicate = kacsBody4 === jheysBody4;
  assertCheck(
    !isDuplicate,
    'Tier 3',
    'Follow-up #4 de-duplication: Jhey’s follow-up #4 body must NOT duplicate KACS follow-up #4 body',
    { kacsBody: kacsBody4.slice(0, 100), jheysBody: jheysBody4.slice(0, 100) }
  );
}

// 3.3 Follow-up global cross-company uniqueness
const followUpNormalizedSeen = new Map();
for (const company of COMPANIES) {
  const status = messages.followUpStatus(company, sampleLead, '');
  const items = Array.isArray(status) ? status : status.situations.flatMap((s) => s.messages);
  items.forEach((item, idx) => {
    const raw = typeof item === 'string' ? item : item.message;
    const norm = normalizeMessageBody(raw);
    const identifier = `${company} #${idx + 1}`;
    if (followUpNormalizedSeen.has(norm)) {
      const prior = followUpNormalizedSeen.get(norm);
      assertCheck(
        false,
        'Tier 3',
        `Follow-up body collision: ${identifier} duplicates ${prior}`,
        { duplicateSnippet: norm.slice(0, 80) }
      );
    } else {
      followUpNormalizedSeen.set(norm, identifier);
      assertCheck(true, 'Tier 3', `${identifier} follow-up body is unique`);
    }
  });
}

// 3.4 detailsRequestMessage cross-company uniqueness
const detailsRequests = COMPANIES.map((c) => messages.detailsRequestMessage(sampleLead, c, ['squareFeet']));
const normalizedDetailsRequests = detailsRequests.map(normalizeMessageBody);
const normDetailsUnique = new Set(normalizedDetailsRequests).size;
assertCheck(
  normDetailsUnique === COMPANIES.length,
  'Tier 3',
  `detailsRequestMessage: normalized bodies must be unique across all 7 companies (got ${normDetailsUnique}/7)`,
  { uniqueCount: normDetailsUnique }
);

// 3.5 Missing-size quotes cross-company uniqueness
const missingSizeQuotes = COMPANIES.map((c) =>
  messages.approvedMessage({
    lead: { customerName: 'Marvin', serviceType: 'Deep Cleaning' },
    quote: { company: c, status: 'missing_size', serviceLabel: 'Deep Cleaning' }
  })
);
const normalizedMissingSize = missingSizeQuotes.map(normalizeMessageBody);
const normMissingSizeUnique = new Set(normalizedMissingSize).size;
assertCheck(
  normMissingSizeUnique === COMPANIES.length,
  'Tier 3',
  `Missing-size quotes: normalized bodies must be unique across all 7 companies (got ${normMissingSizeUnique}/7)`,
  { uniqueCount: normMissingSizeUnique }
);

// 3.6 cleaner_job_offer cross-company uniqueness
const cleanerOffers = COMPANIES.map((c) => messages.quickReplyMessage('cleaner_job_offer', c, sampleLead, sampleQuote));
const cleanerRawUnique = new Set(cleanerOffers).size;
assertCheck(
  cleanerRawUnique === COMPANIES.length,
  'Tier 3',
  `cleaner_job_offer: must provide tailored, unique templates for every company (got ${cleanerRawUnique}/7)`,
  { uniqueCount: cleanerRawUnique }
);

// 3.7 archivingMessage cross-company uniqueness
const archiveMessages = COMPANIES.map((c) => messages.archivingMessage(c, sampleLead));
const normalizedArchives = archiveMessages.map(normalizeMessageBody);
const normArchiveUnique = new Set(normalizedArchives).size;
assertCheck(
  normArchiveUnique === COMPANIES.length,
  'Tier 3',
  `archivingMessage: normalized bodies must be unique across all 7 companies (got ${normArchiveUnique}/7)`,
  { uniqueCount: normArchiveUnique }
);

// 3.8 Situational Classification Signals across all 5 Situational Companies
const situationalCompanies = ['dasilva', 'gleam', 'express', 'utcleans', 'marys'];

for (const sc of situationalCompanies) {
  // 3.8.1 Empty conversation -> suggestedSituation === null
  const emptyRes = messages.followUpStatus(sc, sampleLead, 'Customer: Hello, do you have availability this Friday?');
  assertCheck(
    emptyRes.suggestedSituation === null,
    'Tier 3',
    `${sc}: conversation with neither quote nor details request must yield suggestedSituation === null`,
    { got: emptyRes.suggestedSituation }
  );

  // 3.8.2 Details requested -> suggestedSituation === 2
  const detailsMsg = messages.detailsRequestMessage(sampleLead, sc, ['squareFeet', 'bedrooms']);
  const detailsRes = messages.followUpStatus(sc, sampleLead, `Customer: Hello!\nAttendant: ${detailsMsg}`);
  assertCheck(
    detailsRes.suggestedSituation === 2,
    'Tier 3',
    `${sc}: conversation with detailsRequestMessage must yield suggestedSituation === 2`,
    { got: detailsRes.suggestedSituation }
  );

  // 3.8.3 Missing-size quote -> suggestedSituation === 2
  const missingMsg = messages.approvedMessage({
    lead: sampleLead,
    quote: { company: sc, status: 'missing_size', serviceLabel: 'Deep Cleaning' }
  });
  const missingRes = messages.followUpStatus(sc, sampleLead, `Customer: Hello!\nAttendant: ${missingMsg}`);
  assertCheck(
    missingRes.suggestedSituation === 2,
    'Tier 3',
    `${sc}: conversation with missing_size approvedMessage must yield suggestedSituation === 2`,
    { got: missingRes.suggestedSituation }
  );

  // 3.8.4 Approved quote alone -> suggestedSituation === 1 (Verifies UT Cleans and Mary's)
  const approvedMsg = messages.approvedMessage({
    lead: sampleLead,
    quote: {
      company: sc,
      service: 'deep_cleaning',
      serviceLabel: 'Deep Cleaning',
      amount: 280,
      estimatedHours: { minimum: 3, maximum: 4 }
    }
  });
  const approvedRes = messages.followUpStatus(sc, sampleLead, `Customer: Hi!\nAttendant: ${approvedMsg}`);
  assertCheck(
    approvedRes.suggestedSituation === 1,
    'Tier 3',
    `${sc}: conversation with approvedMessage must yield suggestedSituation === 1`,
    { got: approvedRes.suggestedSituation }
  );

  // 3.8.5 Details request + Customer reply + Approved quote -> suggestedSituation === 4
  const bothConvo = `Attendant: ${detailsMsg}\nCustomer: It is 1800 sq ft, 3 beds.\nAttendant: ${approvedMsg}`;
  const bothRes = messages.followUpStatus(sc, sampleLead, bothConvo);
  assertCheck(
    bothRes.suggestedSituation === 4,
    'Tier 3',
    `${sc}: conversation with details request AND quote must yield suggestedSituation === 4`,
    { got: bothRes.suggestedSituation }
  );
}

// ============================================================================
// TIER 4: Attendant Persona & Profile Accuracy
// ============================================================================
console.log('Running Tier 4: Attendant Persona & Profile Accuracy checks...');

for (const company of COMPANIES) {
  const profile = COMPANY_PROFILES[company];
  const allRendered = [];

  // Collect all quick replies
  for (const id of ALL_QUICK_REPLY_IDS) {
    allRendered.push({ source: `quickReply:${id}`, text: messages.quickReplyMessage(id, company, sampleLead, sampleQuote) });
  }

  // Collect details request
  allRendered.push({ source: 'detailsRequest', text: messages.detailsRequestMessage(sampleLead, company, ['squareFeet', 'bedrooms']) });

  // Collect approved quote
  const quoteCalc = engine.calculateQuote({ ...sampleLead, companyName: profile.fullName }, { companyOverride: company });
  allRendered.push({ source: 'approvedMessage', text: messages.approvedMessage({ lead: sampleLead, quote: quoteCalc }) });

  // Collect follow-ups
  const fuStatus = messages.followUpStatus(company, sampleLead, '');
  const fuItems = Array.isArray(fuStatus) ? fuStatus : fuStatus.situations.flatMap((s) => s.messages);
  fuItems.forEach((item, idx) => {
    allRendered.push({ source: `followUp:#${idx + 1}`, text: typeof item === 'string' ? item : item.message });
  });

  // Collect archiving message
  allRendered.push({ source: 'archivingMessage', text: messages.archivingMessage(company, sampleLead) });

  // 4.1 Strict Attendant Persona Isolation (No Cross-Pollination)
  for (const msgObj of allRendered) {
    for (const forbidden of profile.forbiddenAttendants) {
      const containsForbidden = new RegExp(`\\b${forbidden}\\b`, 'i').test(msgObj.text);
      assertCheck(
        !containsForbidden,
        'Tier 4',
        `${company}/${msgObj.source}: must NEVER mention forbidden attendant "${forbidden}"`,
        { snippet: msgObj.text.slice(0, 100) }
      );
    }
  }

  // 4.2 Phone Number Accuracy (Never include another company's phone number)
  const allOtherPhones = COMPANIES
    .filter((c) => c !== company)
    .flatMap((c) => [COMPANY_PROFILES[c].phone, COMPANY_PROFILES[c].cleanPhone]);

  for (const msgObj of allRendered) {
    for (const wrongPhone of allOtherPhones) {
      assertCheck(
        !msgObj.text.includes(wrongPhone),
        'Tier 4',
        `${company}/${msgObj.source}: must NOT include another company's phone "${wrongPhone}"`,
        { source: msgObj.source }
      );
    }
  }

  // 4.3 Mandatory signature and contact details in signature blocks
  if (profile.mandatorySignature) {
    const arch = messages.archivingMessage(company, sampleLead);
    assertCheck(
      arch.includes(profile.mandatorySignature),
      'Tier 4',
      `${company}: archivingMessage must contain mandatory signature "${profile.mandatorySignature}"`
    );
  }
}

// 4.4 Payment Information Accuracy
const kacsPayment = messages.quickReplyMessage('payment_info', 'kacs', sampleLead, sampleQuote);
assertCheck(kacsPayment.includes('Juliana dos Santos Paixao'), 'Tier 4', 'KACS payment_info must include "Juliana dos Santos Paixao"');
assertCheck(kacsPayment.includes('0949'), 'Tier 4', 'KACS payment_info must include Venmo PIN "0949"');
assertCheck(kacsPayment.includes('5049200949') || kacsPayment.includes('504 9200949'), 'Tier 4', 'KACS payment_info must include Zelle "5049200949"');

const jheysPayment = messages.quickReplyMessage('payment_info', 'jheys', sampleLead, sampleQuote);
assertCheck(jheysPayment.includes('Jheyce Souza Barcelo'), 'Tier 4', 'Jhey’s payment_info must include "Jheyce Souza Barcelo"');
assertCheck(jheysPayment.includes('Jheyce-Barcelo'), 'Tier 4', 'Jhey’s payment_info must include Venmo "Jheyce-Barcelo"');

const expressPayment = messages.quickReplyMessage('payment_info', 'express', sampleLead, sampleQuote);
assertCheck(expressPayment.includes('Marilda Neves'), 'Tier 4', 'Express payment_info must include "Marilda Neves"');
assertCheck(expressPayment.includes('(415) 724-7516') || expressPayment.includes('415-724-7516'), 'Tier 4', 'Express payment_info must include Zelle "(415) 724-7516"');

const utPayment = messages.quickReplyMessage('payment_info', 'utcleans', sampleLead, sampleQuote);
assertCheck(utPayment.includes('Victor Teles Netto'), 'Tier 4', 'UT Cleans payment_info must include "Victor Teles Netto"');
assertCheck(utPayment.includes('victornetto'), 'Tier 4', 'UT Cleans payment_info must include Venmo "victornetto"');
assertCheck(utPayment.includes('0275'), 'Tier 4', 'UT Cleans payment_info must include verification "0275"');

// ============================================================================
// TIER 5: Adversarial, Escaping, and Integrity Verification
// ============================================================================
console.log('Running Tier 5: Adversarial & Escaping checks...');

// 5.1 Special characters and escaping integrity
const adversarialNames = [
  'O\'Connor & "Sons"',
  'José & Maria <script>alert(1)</script>',
  'Jane Doe (Special & Urgent!)',
  'Customer #100% Satisfied'
];

for (const advName of adversarialNames) {
  const advLead = { ...sampleLead, customerName: advName };
  for (const company of COMPANIES) {
    const rendered = messages.quickReplyMessage('missed_call', company, advLead, sampleQuote);
    assertCheck(
      typeof rendered === 'string' && rendered.length > 20,
      'Tier 5',
      `${company}: must handle adversarial customerName "${advName}" without crash or NaN`
    );
  }
}

// 5.2 Source Line Ending Integrity (CRLF)
const quoteMessagesBuffer = fs.readFileSync(path.join(__dirname, 'quote-messages.js'));
const hasCRLF = quoteMessagesBuffer.includes(Buffer.from('\r\n'));
assertCheck(
  hasCRLF,
  'Tier 5',
  'quote-messages.js must maintain CRLF line endings per system constraints'
);

// 5.3 VA Name Selector Override & Quo Extractor Integrity
const expectedVas = ['Frank', 'Mary', 'Andie', 'Luiza', 'Carol', 'Oliver'];
assertCheck(
  Array.isArray(messages.VA_NAMES) && expectedVas.every((va) => messages.VA_NAMES.includes(va)) && messages.VA_NAMES.length === expectedVas.length,
  'Tier 5',
  'VA_NAMES must contain Frank, Mary, Andie, Luiza, Carol, and Oliver'
);

for (const vaName of expectedVas) {
  const qr = messages.quickReplyMessage('missed_call', 'kacs', sampleLead, sampleQuote, { vaName });
  assertCheck(qr.includes(`This is ${vaName}.`) && qr.includes(`${vaName} - KACS Cleaning Services LLC`), 'Tier 5', `KACS missed_call must use selected VA "${vaName}"`);
  const fu = messages.followUpStatus('jheys', sampleLead, '', { vaName });
  assertCheck(Array.isArray(fu) && fu[0].message.includes(`this is ${vaName} following up`), 'Tier 5', `Jhey's follow-up 1 must use selected VA "${vaName}"`);
  const sfu = messages.followUpStatus('marys', sampleLead, '', { vaName });
  assertCheck(sfu.situations[0].messages[0].message.includes(`This is ${vaName} from Mary's House Cleaning`), 'Tier 5', `Mary's situational follow-up must use selected VA "${vaName}"`);
  const arch = messages.archivingMessage('kacs', sampleLead, { vaName });
  assertCheck(arch.includes(`— ${vaName} | KACS Cleaning Services LLC`), 'Tier 5', `KACS archivingMessage must use selected VA "${vaName}"`);
  const details = messages.detailsRequestMessage(sampleLead, 'marys', ['squareFeet'], { vaName });
  assertCheck(Boolean(details && details.includes(`Once you share these details, ${vaName} will prepare`)), 'Tier 5', `Mary's detailsRequestMessage must use selected VA "${vaName}"`);
}

const extractor = require('./extractors.js');
assertCheck(
  typeof extractor.extractQuoLead === 'function',
  'Tier 5',
  'CleaningLeadExtractor must export extractQuoLead for Quo / OpenPhone support'
);
assertCheck(
  extractor.yelpBusinessNameFromText('🧼 Juliana Paixao | Quo') === 'KACS Cleaning Services'
    && engine.resolveCompany('Juliana Paixao') === 'kacs',
  'Tier 5',
  'Quo title "Juliana Paixao" must resolve to KACS Cleaning Services (kacs)'
);

// ============================================================================
// SUMMARY & SCORECARD REPORTING
// ============================================================================

console.log('\n======================================================');
console.log('           E2E TEST SUITE SCORECARD REPORT             ');
console.log('======================================================');
console.log(`Total Assertions Evaluated : ${totalChecks}`);
console.log(`Passed Assertions         : ${passedChecks}`);
console.log(`Failed Assertions         : ${failures.length}`);
console.log('======================================================\n');

if (failures.length > 0) {
  console.log(`FAILURES / DISCOVERED DEFECTS (${failures.length}):\n`);
  failures.forEach((fail, idx) => {
    console.log(`[${idx + 1}] [${fail.tier}] ${fail.description}`);
    if (fail.details) {
      console.log(`    Details: ${JSON.stringify(fail.details)}`);
    }
  });
  console.log('\n======================================================');
  if (!isReportOnly) {
    console.error(`\nTest suite failed with ${failures.length} implementation defects.`);
    process.exit(1);
  } else {
    console.log(`\nAudit mode (--report-only): exiting with code 0.`);
    process.exit(0);
  }
} else {
  console.log('All quote-messages checks passed successfully (100% GREEN)!');
  process.exit(0);
}
