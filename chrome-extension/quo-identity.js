/* Identifies a Quo conversation from already-authorized API responses. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrestoQuoIdentity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseRoute(pathname) {
    const match = String(pathname || '').match(/^\/inbox\/(PN[A-Za-z0-9]+)\/c\/(CN[A-Za-z0-9]+)\/?$/);
    return match ? { phoneNumberId: match[1], conversationId: match[2] } : null;
  }

  function resolveIdentity(route, companyByNumber, conversations, contacts) {
    if (!route || !companyByNumber || !Array.isArray(conversations) || !Array.isArray(contacts)) return { status: 'invalid_input' };
    const company = companyByNumber[route.phoneNumberId];
    if (typeof company !== 'string' || !company) return { status: 'company_unmapped' };
    const matches = conversations.filter((item) => item?.id === route.conversationId && item?.phoneNumberId === route.phoneNumberId);
    if (matches.length !== 1) return { status: 'conversation_unresolved' };
    const participants = matches[0].participants;
    if (!Array.isArray(participants) || participants.length !== 1 || !/^\+[1-9]\d{7,14}$/.test(participants[0])) return { status: 'participant_unresolved' };
    const found = contacts.filter((contact) => Array.isArray(contact?.defaultFields?.phoneNumbers) && contact.defaultFields.phoneNumbers.some((number) => number?.value === participants[0]));
    if (found.length !== 1) return { status: found.length ? 'contact_ambiguous' : 'contact_not_found' };
    const name = found[0]?.defaultFields?.firstName;
    if (typeof name !== 'string' || !name.trim()) return { status: 'name_missing' };
    return { status: 'resolved', company, customerName: name.trim() };
  }

  return { parseRoute, resolveIdentity };
});
