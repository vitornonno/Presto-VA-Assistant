'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CleaningQuoteMessages = require('./quote-messages.js');

const html = fs.readFileSync(`${__dirname}/popup.html`, 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const elements = Object.fromEntries(ids.map((id) => [id, {
  value: '', textContent: '', innerHTML: '', hidden: false, dataset: {},
  classList: { toggle() {} }, addEventListener(type, fn) { this[type] = fn; }
}]));
elements['quick-reply-company'].value = 'kacs';
const saved = {
  'lead:test': { id: 'test', lead: { customerName: 'Test' }, quote: { quoteType: 'fixed_price', amount: 0 }, state: 'pending_human_approval', savedAt: 'invalid' },
  selectedVaName: 'Luiza'
};
let lastCopiedText = '';
const context = {
  document: { querySelector(selector) { return elements[selector.slice(1)] || null; }, querySelectorAll() { return []; } },
  chrome: { runtime: { getManifest: () => ({ version: 'test' }), sendMessage: async () => ({ ok: true }) }, storage: {
    local: {
      get: async (key) => {
        if (key == null) return saved;
        if (Array.isArray(key)) return Object.fromEntries(key.map((k) => [k, saved[k]]));
        return { [key]: saved[key] };
      },
      set: async (patch) => Object.assign(saved, patch),
      remove: async () => {}
    }, onChanged: { addListener() {} }
  } },
  CleaningQuoteEngine: { COMPANIES: { kacs: { name: 'KACS Cleaning Services' } }, SERVICES: {}, calculateQuote: () => ({ status: 'missing_size', company: 'kacs' }) },
  CleaningCleanerAvailability: { storageKey: () => 'availability' },
  CleaningQuoteMessages,
  navigator: { clipboard: { writeText: async (text) => { lastCopiedText = text; } } }, window: { confirm: () => true },
  console, Intl, Date, Number, Object, String, Set, Map, JSON, Promise, setTimeout, crypto: { randomUUID: () => 'test' }
};
vm.runInNewContext(fs.readFileSync(`${__dirname}/popup.js`, 'utf8'), context);
setTimeout(async () => {
  assert.match(elements.reviews.innerHTML, /Copy message/);
  assert.match(elements.reviews.innerHTML, /\$0/);
  assert.doesNotMatch(elements.reviews.innerHTML, /\$0–\$0/);
  assert.match(elements.reviews.innerHTML, /Unknown date/);
  assert.doesNotMatch(html, /active-lead-service/);
  assert.equal(elements['va-select'].value, 'Luiza');
  assert.match(elements['popup-quick-reply-groups'].innerHTML, /data-quick-reply-id="missed_call"/);
  await elements['popup-quick-reply-groups'].click({
    target: { dataset: { quickReplyId: 'missed_call' }, textContent: 'Missed call' }
  });
  assert.match(lastCopiedText, /This is Luiza/);
  console.log('Popup initialization and saved quote checks passed.');
}, 20);
