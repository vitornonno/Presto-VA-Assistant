(function extractorModule(global) {
  'use strict';

  const KNOWN_BUSINESS_NAMES = {
    BnI3aSQTdRlX1YGUuPfAiA: 'Jhey’s Cleaning Services',
    FAHbiW72jLTiNDvcOptrfg: 'KACS Cleaning Services',
    NKYK8RrTUSDhdbaI848bjg: 'Da Silva Cleaning Services'
  };

  function cleanYelpDomText() {
    const main = document.querySelector?.('main');
    if (main) return main.innerText || '';
    const body = document.body;
    if (!body) return '';
    if (body.children?.length) {
      const childTexts = Array.from(body.children)
        .filter((element) => element.id !== 'cleaning-quote-assistant' && element.id !== 'cleaning-update-reload-notice')
        .map((element) => element.innerText || '')
        .filter(Boolean);
      if (childTexts.length) return childTexts.join('\n');
    }
    const raw = body.innerText || '';
    const assistantText = document.getElementById?.('cleaning-quote-assistant')?.innerText || '';
    return assistantText ? raw.replace(assistantText, '') : raw;
  }

  const text = () => cleanYelpDomText();
  const firstMatch = (patterns, source = text()) => {
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  };

  function platform() {
    if (location.hostname.includes('thumbtack.com')) return 'thumbtack';
    if (location.hostname.includes('yelp.com')) return 'yelp';
    if (/(^|\.)(quo|openphone)\.com$/i.test(location.hostname)) return 'quo';
    return 'unknown';
  }

  function jsonObjectAt(source, start) {
    const open = source.indexOf('{', start);
    if (open < 0) return null;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = open; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') quoted = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(open, index + 1);
      }
    }
    return null;
  }

  function yelpApolloStateFromScripts(scripts) {
    const marker = 'window.yelp.react_apollo_state =';
    const source = Array.from(scripts).map((script) => script.textContent || '').find((value) => value.includes(marker));
    if (!source) return null;
    const json = jsonObjectAt(source, source.indexOf(marker) + marker.length);
    try { return json ? JSON.parse(json) : null; } catch { return null; }
  }

  function numberFromDescription(description, kind, allowBareNumber = false) {
    const source = String(description || '');
    const expression = kind === 'bedrooms'
      ? /(\d+(?:\.\d+)?)(?:\s+or\s+more|\s*\+)?\s*(?:bed(?:room)?s?\b|br\b|quartos?\b)/i
      : /(\d+(?:\.\d+)?)(?:\s+or\s+more|\s*\+)?\s*(?:bath(?:room)?s?\b|ba\b|banheiros?\b)/i;
    const match = source.match(expression)?.[1];
    if (match) return match;
    if (allowBareNumber) return source.match(/^\s*(\d+(?:\.\d+)?)(?:\s+or\s+more|\s*\+)?\s*$/i)?.[1] || null;
    return null;
  }

  function squareFeetFromText(value) {
    // Never treat size-band labels ("up to 1,600 sq. ft.") as client-reported square footage.
    const cleaned = String(value || '').replace(/\bup\s+to\s+[\d,]+[\s\-]*(?:square\s*(?:feet|foot|footage)|sq\.?\s*ft\.?)/gi, '');
    return firstMatch([
      /(?:square\s*(?:feet|foot|footage)|sq\.?\s*ft\.?)\s*[:\-]?\s*([\d,]+)/i,
      /([\d,]+)[\s\-]*(?:square\s*(?:feet|foot|footage)|sq\.?\s*ft\.?)/i
    ], cleaned);
  }

  function isSurveyBoundaryLine(line) {
    if (!line) return true;
    if (/^(?:what|how|do you|are there|when|where|which|in what|can you|would you)\b.*\?$/i.test(line)) return true;
    return /^(?:what kind of|how often|do you need|do you require|how many bedrooms|how many bathrooms|when do you require|are there any other details|any details you'd like|in what location|que tipo de|com que frequ[êe]ncia|voc[êe] precisa|voc[êe] exige|quantos quartos|quantos banheiros|quando voc[êe] precisa|em que local|outros detalhes|job requested$|postal code$|lead created:|lead criado:|date\(s\) requested:|see details$|ver detalhes$|hide details$|ocultar detalhes$|message$|mensagem$|this lead reached out|como voc[êe] gostaria de responder|how would you like to respond|prefer[êe]ncias de cookies|cookie preferences|project archived|responded|marked as replied|schedule call|schedule visit)/i.test(line);
  }

  function answersAfterLabel(source, labelPatterns, { multiLine = false } = {}) {
    const patterns = (Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns])
      .map((pattern) => pattern instanceof RegExp ? pattern : new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const lines = String(source || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const matches = lines
      .map((line, index) => patterns.some((pattern) => pattern.test(line)) ? index : -1)
      .filter((index) => index >= 0);
    const startIndex = matches.at(-1);
    if (startIndex === undefined) return null;
    const answers = [];
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (isSurveyBoundaryLine(line)) break;
      if (answers.length > 0 && /^(?:regular home cleaning|deep cleaning|move-in or move-out cleaning|move-in cleaning|move-out cleaning|post-construction cleaning|limpeza residencial regular|limpeza profunda)$/i.test(line)) break;
      answers.push(line);
      if (!multiLine) break;
    }
    return answers.length ? answers.join(', ') : null;
  }

  function leadDetailsSection(source) {
    const lines = String(source || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const createdIndex = lines.findIndex((line) => /^(?:lead created|lead criado)\s*:/i.test(line));
    const questionIndex = lines.findIndex((line) => /^(?:what kind of|how often|do you need|do you require|how many bedrooms|how many bathrooms|when do you require|are there any other details|any details you'd like|in what location)/i.test(line));
    const headerIndex = lines.findIndex((line) => /^(?:contacted lead details|new lead details|lead details|detalhes do lead)/i.test(line));
    const startIndex = createdIndex >= 0
      ? Math.max(0, createdIndex - 5)
      : questionIndex >= 0
        ? Math.max(0, questionIndex - 6)
        : headerIndex >= 0
          ? headerIndex
          : 0;
    const tail = lines.slice(startIndex);
    const endIndex = tail.findIndex((line) => /^(?:prefer[êe]ncias de cookies|cookie preferences|this lead reached out|como voc[êe] gostaria de responder|how would you like to respond|project archived by)/i.test(line));
    return (endIndex >= 0 ? tail.slice(0, endIndex) : tail).join('\n');
  }

  function leadPhoneFromDetails(detailsSection) {
    const lines = String(detailsSection || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const createdIndex = lines.findIndex((line) => /^(?:lead created|lead criado)\s*:/i.test(line));
    const questionIndex = lines.findIndex((line) => isSurveyBoundaryLine(line) && !/^(?:lead created|lead criado|date\(s\) requested|message|mensagem)\b/i.test(line));
    const headerLines = createdIndex >= 0
      ? lines.slice(createdIndex + 1, questionIndex > createdIndex ? questionIndex : createdIndex + 6)
      : [];
    for (const line of headerLines) {
      const match = line.match(/^(\+?1?[-.\s]*\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\+?1?[-.\s]*\d{3}[-.\s]\d{3}[-.\s]\d{4})$/);
      if (match) return match[1].trim();
    }
    return null;
  }

  function surveyAnswer(project, questionPattern) {
    const answer = (project.surveyQuestionAnswers || []).find((item) => questionPattern.test(item.question || ''));
    return answer?.answers?.filter(Boolean).join(', ') || null;
  }
  function firstName(value) {
    return String(value || '').trim().split(/\s+/)[0] || null;
  }
  function isCustomerName(value) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!/^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]*(?:\s+(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*|[A-ZÀ-Ý]\.)){0,3}$/.test(normalized)) return false;
    return !/^(contacted lead details|new lead details|lead details|detalhes do lead|my leads|nearby jobs|deep cleaning|regular home cleaning|first cleaning|move-in cleaning|move-out cleaning|post-construction cleaning|cookie preferences|prefer[êe]ncias de cookies)$/i.test(normalized);
  }
  function visibleCustomerName() {
    // A generic bold heading can belong to a different lead or a page section.
    // Accept only a visible customer region whose profile link confirms its label.
    const candidates = Array.from(document.querySelectorAll?.('[role="region"][aria-label]') || [])
      .filter((region) => {
        if (region.closest('#cleaning-quote-assistant')) return false;
        const rect = region.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((region) => {
        const label = String(region.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        const links = Array.from(region.querySelectorAll('a[href*="/user_details?"]'));
        return isCustomerName(label) && links.some((link) => String(link.innerText || '').replace(/\s+/g, ' ').trim() === label) ? label : null;
      }).filter(Boolean);
    const uniqueCandidates = [...new Set(candidates)];
    if (uniqueCandidates.length === 1) return firstName(uniqueCandidates[0]);
    if (uniqueCandidates.length > 1) return null;
    const linkCandidates = Array.from(document.querySelectorAll?.('a[href*="/user_details?"]') || [])
      .filter((link) => {
        if (link.closest?.('#cleaning-quote-assistant, nav, [role="navigation"]')) return false;
        const rect = link.getBoundingClientRect?.() || { width: 0, height: 0 };
        return rect.width > 0 && rect.height > 0;
      })
      .map((link) => String(link.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(isCustomerName);
    const uniqueLinks = [...new Set(linkCandidates)];
    return uniqueLinks.length === 1 ? firstName(uniqueLinks[0]) : null;
  }
  function leadLocation(value) {
    const source = String(value || '');
    return source.match(/\b([A-Za-z][A-Za-z .'-]+,\s*CA\s*\d{5})\b/)?.[1]
      || source.match(/\b(\d{5}(?:-\d{4})?)\b/)?.[1]
      || null;
  }
  function yelpBusinessNameFromText(value) {
    const source = String(value || '');
    if (/jhey['’]s\s+cleaning(?:\s+services)?/i.test(source)) return 'Jhey’s Cleaning Services';
    if (/\bkacs\s+cleaning(?:\s+services)?|\bjuliana\s+(?:dos\s+santos\s+)?paix[aã]o\b/i.test(source)) return 'KACS Cleaning Services';
    if (/\bda\s*silva\s+cleaning(?:\s+services)?\b/i.test(source)) return 'Da Silva Cleaning Services';
    if (/\bu\.?\s*t\.?\s*cleans?\b/i.test(source)) return 'UT Cleans';
    if (/\bmary['’]?s\s+house\s+cleaning\b/i.test(source)) return "Mary's House Cleaning";
    if (/\bgleam\s+team(?:\s+housecleaning)?\b/i.test(source)) return 'Gleam Team Housecleaning';
    if (/express\s+house\s+cleaning/i.test(source)) return 'Express House Cleaning';
    return null;
  }
  function yelpBusinessNameFromSidebar() {
    // The business label lives in Yelp's left navigation. Unlike the lead
    // conversation, it represents the active account and does not change
    // when old messages mention another company.
    const candidates = Array.from(document.querySelectorAll('nav *, [role="navigation"] *'))
      .filter((element) => element.id !== 'cleaning-quote-assistant' && !element.closest('#cleaning-quote-assistant'))
      .map((element) => ({ element, value: String(element.innerText || '').trim() }))
      .filter(({ value }) => value && value.length <= 90 && yelpBusinessNameFromText(value))
      .map((candidate) => ({ ...candidate, rect: candidate.element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth * 0.45 && rect.top < window.innerHeight * 0.65)
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left || a.value.length - b.value.length);
    const names = [...new Set(candidates.map(({ value }) => yelpBusinessNameFromText(value)))];
    return names.length === 1 ? names[0] : null;
  }

  function extractYelpLeadFromState(state, pathname) {
    const leadId = pathname.match(/\/leads\/([^/?#]+)/)?.[1];
    if (!leadId) return null;
    const lead = Object.values(state).find((record) => record?.__typename === 'Lead' && record.encid === leadId);
    const project = lead?.project?.__ref ? state[lead.project.__ref] : null;
    if (!project) return null;
    // The Apollo cache can contain several businesses. Read the one linked to
    // this lead instead of accepting whichever Business record appears first.
    const businessId = pathname.match(/^\/leads_center\/([^/]+)/)?.[1];
    const linkedBusiness = lead?.business?.__ref ? state[lead.business.__ref] : null;
    const business = (businessId && state[`Business:${businessId}`])
      || (linkedBusiness?.__typename === 'Business' && linkedBusiness.encid === businessId ? linkedBusiness : null);
    const description = project.description || '';
    const bedroomAnswer = surveyAnswer(project, /how many bedrooms/i) || answersAfterLabel(description, [/how many bedrooms/i, /quantos quartos/i]);
    const bathroomAnswer = surveyAnswer(project, /how many bathrooms/i) || answersAfterLabel(description, [/how many bathrooms/i, /quantos banheiros/i]);
    const products = surveyAnswer(project, /cleaning product types/i) || answersAfterLabel(description, [/cleaning product types/i], { multiLine: true });
    const extraServices = surveyAnswer(project, /other services/i) || answersAfterLabel(description, [/other services/i], { multiLine: true });
    const additionalDetails = surveyAnswer(project, /other details|details you'd like to add/i)
      || answersAfterLabel(description, [/other details you'd like to share/i, /details you'd like to add/i], { multiLine: true })
      || project.unstructuredDetails
      || description;
    const serviceFromDescription = answersAfterLabel(description, [/what kind of cleaning service/i, /what kind of work would you like/i, /^job requested$/i]);
    const locationAnswer = surveyAnswer(project, /what location|postal code/i) || answersAfterLabel(description, [/in what location do you need the service/i, /^postal code$/i]);
    const customer = project.user?.__ref ? state[project.user.__ref] : null;
    return {
      id: `yelp:${leadId}`,
      platform: 'yelp',
      url: global.location?.href || null,
      companyName: yelpBusinessNameFromText(business?.name) || business?.name || KNOWN_BUSINESS_NAMES[businessId] || null,
      customerName: firstName(customer?.displayName),
      phoneNumber: lead.phoneNumberConnectionInfo?.consumerPhoneNumber || null,
      squareFeet: squareFeetFromText(additionalDetails),
      bedrooms: numberFromDescription(bedroomAnswer || description, 'bedrooms', Boolean(bedroomAnswer)),
      bathrooms: numberFromDescription(bathroomAnswer || description, 'bathrooms', Boolean(bathroomAnswer)),
      serviceType: project.jobSummaryTitle || serviceFromDescription || project.name || null,
      frequency: project.frequency || surveyAnswer(project, /how often.*home cleaned/i) || answersAfterLabel(description, [/how often.*home cleaned/i]) || null,
      cleaningProducts: products,
      extraServices,
      location: leadLocation(`${locationAnswer || ''} ${project.description || ''} ${(project.surveyQuestionAnswers || []).flatMap((item) => item.answers || []).join(' ')}`) || project.zip || null,
      extractedAt: new Date().toISOString(),
      captureSource: 'yelp_apollo'
    };
  }

  function isCompatibleDomLead(apolloLead, visibleLead) {
    if (!apolloLead || !visibleLead) return false;
    if (apolloLead.customerName && visibleLead.customerName && apolloLead.customerName !== visibleLead.customerName) return false;
    if (apolloLead.bedrooms && visibleLead.bedrooms && apolloLead.bedrooms !== visibleLead.bedrooms) return false;
    if (apolloLead.bathrooms && visibleLead.bathrooms && apolloLead.bathrooms !== visibleLead.bathrooms) return false;
    const apolloZip = String(apolloLead.location || '').match(/\b\d{5}\b/)?.[0];
    const visibleZip = String(visibleLead.location || '').match(/\b\d{5}\b/)?.[0];
    if (apolloZip && visibleZip && apolloZip !== visibleZip) return false;
    return true;
  }

  function meaningfulSurveyValue(primary, fallback) {
    if (primary && !/^(?:not sure|n[ãa]o tenho certeza)$/i.test(String(primary).trim())) return primary;
    return fallback || primary || null;
  }

  function extractYelpLead() {
    const state = yelpApolloStateFromScripts(document.scripts);
    const apolloLead = state ? extractYelpLeadFromState(state, location.pathname) : null;
    const visibleLead = extractVisibleYelpLead();
    if (!apolloLead) return visibleLead;
    if (!visibleLead || !isCompatibleDomLead(apolloLead, visibleLead)) return apolloLead;
    const currentAnswers = {
      companyName: apolloLead.companyName || visibleLead.companyName,
      customerName: apolloLead.customerName || visibleLead.customerName,
      phoneNumber: apolloLead.phoneNumber || visibleLead.phoneNumber,
      serviceType: apolloLead.serviceType || visibleLead.serviceType,
      squareFeet: apolloLead.squareFeet || visibleLead.squareFeet,
      bedrooms: apolloLead.bedrooms || visibleLead.bedrooms,
      bathrooms: apolloLead.bathrooms || visibleLead.bathrooms,
      frequency: meaningfulSurveyValue(apolloLead.frequency, visibleLead.frequency),
      cleaningProducts: meaningfulSurveyValue(apolloLead.cleaningProducts, visibleLead.cleaningProducts),
      extraServices: meaningfulSurveyValue(apolloLead.extraServices, visibleLead.extraServices),
      location: apolloLead.location || visibleLead.location
    };
    return {
      ...apolloLead,
      ...currentAnswers,
      captureSource: apolloLead.captureSource
    };
  }

  function answerAfterLabel(source, label) {
    return answersAfterLabel(source, [label]);
  }
  function answerAfterLastLabel(source, label) {
    return answersAfterLabel(source, [label]);
  }

  function extractVisibleYelpLead() {
    const pageContent = cleanYelpDomText();
    const detailsContent = leadDetailsSection(pageContent);
    const headings = Array.from(document.querySelectorAll?.('h1, h2, h3') || [])
      .filter((element) => !element.closest?.('#cleaning-quote-assistant, nav, [role="navigation"]'))
      .map((element) => String(element.innerText || '').trim())
      .filter(Boolean);
    const servicePattern = /regular home cleaning|regular cleaning|deep cleaning|move[ -]?in|move[ -]?out|post[ -]?construction|limpeza residencial regular|limpeza profunda|limpeza de mudan[çc]a|limpeza p[óo]s[ -]?obra/i;
    const serviceFromDetailsLines = detailsContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^(?:regular home cleaning|deep cleaning|move-in or move-out cleaning|move-in cleaning|move-out cleaning|post-construction cleaning|limpeza residencial regular|limpeza profunda)$/i.test(line));
    const serviceFromQuestions = answersAfterLabel(detailsContent, [/what kind of cleaning service/i, /what kind of work would you like/i, /^job requested$/i, /que tipo de servi[çc]o/i]);
    const serviceType = serviceFromDetailsLines
      || headings.find((heading) => servicePattern.test(heading))
      || serviceFromQuestions
      || null;
    const bedroomAnswer = answersAfterLabel(detailsContent, [/how many bedrooms are in your home/i, /quantos quartos/i]);
    const bathroomAnswer = answersAfterLabel(detailsContent, [/how many bathrooms are in your home/i, /quantos banheiros/i]);
    const additionalDetails = answersAfterLabel(detailsContent, [/are there any other details you'd like to share/i, /any details you'd like to add/i, /outros detalhes/i], { multiLine: true });
    const bedrooms = numberFromDescription(bedroomAnswer || additionalDetails, 'bedrooms', Boolean(bedroomAnswer));
    const bathrooms = numberFromDescription(bathroomAnswer || additionalDetails, 'bathrooms', Boolean(bathroomAnswer));
    const customerName = visibleCustomerName();
    const businessId = location.pathname.match(/^\/leads_center\/([^/]+)/)?.[1] || null;
    // Route account ID is authoritative. Do not search the conversation
    // before it: follow-ups often name another company and caused KACS pages
    // to be misidentified as Jhey's.
    const companyName = KNOWN_BUSINESS_NAMES[businessId]
      || yelpBusinessNameFromSidebar()
      || null;
    if (!serviceType && !bedrooms && !bathrooms) return null;
    const locationAnswer = answersAfterLabel(detailsContent, [/in what location do you need the service/i, /^postal code$/i, /em que local/i]);
    return {
      id: `yelp:${location.pathname.match(/\/leads\/([^/?#]+)/)?.[1] || location.pathname}`,
      platform: 'yelp',
      url: location.href,
      companyName,
      customerName: firstName(customerName),
      phoneNumber: leadPhoneFromDetails(detailsContent),
      squareFeet: squareFeetFromText(additionalDetails),
      bedrooms,
      bathrooms,
      serviceType,
      frequency: answersAfterLabel(detailsContent, [/how often do you want your home cleaned/i, /com que frequ[êe]ncia/i]),
      cleaningProducts: answersAfterLabel(detailsContent, [/do you require any of these cleaning product types/i, /produtos de limpeza/i], { multiLine: true }),
      extraServices: answersAfterLabel(detailsContent, [/do you need any of these other services/i, /outros servi[çc]os/i], { multiLine: true }),
      location: leadLocation(detailsContent) || leadLocation(locationAnswer) || null,
      extractedAt: new Date().toISOString(),
      captureSource: 'yelp_dom'
    };
  }

  const KNOWN_QUO_INBOX_COMPANIES = {
    PNA47i0whf: 'KACS Cleaning Services',
    PNvXYYijCo: 'Jhey’s Cleaning Services'
  };

  function cleanQuoContactName(raw) {
    const cleaned = String(raw || '')
      .replace(/^(?:yelp(?:\s+lead)?|thumbtack)\s*[-:–—]?\s*/i, '')
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || /^(?:infos?\s+thumbtack|presto\s+llc|you)$/i.test(cleaned)) return null;
    return isCustomerName(cleaned) ? firstName(cleaned) : null;
  }

  function extractQuoLead() {
    const inboxId = String(location.pathname || '').match(/\/inbox\/(PN[A-Za-z0-9]+)/)?.[1] || null;
    const titleText = String(document.title || '').replace(/\s*\|\s*Quo\s*$/i, '').trim();
    const sideMenuText = document.querySelector?.('#sideMenu ._89youg5')?.innerText?.trim() || '';
    const companyName = KNOWN_QUO_INBOX_COMPANIES[inboxId]
      || yelpBusinessNameFromText(titleText)
      || yelpBusinessNameFromText(sideMenuText)
      || null;
    let customerName = null;
    const activeLink = document.querySelector?.(`a[href="${location.pathname}"]`)
      || document.querySelector?.('a[aria-current="page"][href*="/inbox/"]');
    const labelId = activeLink?.getAttribute?.('aria-labelledby');
    if (labelId) {
      const labelEl = document.getElementById?.(labelId);
      const primary = labelEl?.querySelector?.('[color="textPrimary"]')?.innerText?.trim();
      customerName = cleanQuoContactName(primary);
    }
    if (!customerName) {
      const sectionLabel = document.querySelector?.('section[aria-label^="Conversation with "]')?.getAttribute?.('aria-label') || '';
      const fromSection = sectionLabel.replace(/^Conversation with\s+/i, '').trim();
      customerName = cleanQuoContactName(fromSection);
    }
    if (!customerName) {
      const headerName = document.querySelector?.('.amkpg00')?.innerText?.trim();
      customerName = cleanQuoContactName(headerName);
    }
    if (!customerName) {
      const avatars = Array.from(document.querySelectorAll?.('[role="img"][aria-label$="\'s avatar"]') || [])
        .map((el) => String(el.getAttribute('aria-label') || '').replace(/'s avatar$/i, '').trim())
        .filter((name) => name && !/^(?:presto\s+llc|juliana\s+paix[aã]o)$/i.test(name))
        .map(cleanQuoContactName)
        .filter(Boolean);
      const uniqueAvatars = [...new Set(avatars)];
      if (uniqueAvatars.length === 1) customerName = uniqueAvatars[0];
    }
    const bodyText = text();
    const phoneMatch = document.querySelector?.('button._3d2pn1')?.innerText?.match(/(\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\+?1?[-.\s]*\d{3}[-.\s]\d{3}[-.\s]\d{4})/)?.[1] || null;
    return {
      id: `quo:${location.pathname}`,
      platform: 'quo',
      url: location.href,
      companyName,
      customerName,
      phoneNumber: phoneMatch,
      squareFeet: squareFeetFromText(bodyText),
      bedrooms: firstMatch([/(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?\b|br\b)/i], bodyText),
      bathrooms: firstMatch([/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?\b|ba\b)/i], bodyText),
      serviceType: firstMatch([/(?:service|cleaning type|type of cleaning)\s*[:\-]\s*([^\n]+)/i], bodyText)
        || ['post construction', 'move-in', 'move-out', 'deep cleaning', 'first cleaning', 'bi-weekly', 'monthly']
          .find((service) => bodyText.toLowerCase().includes(service)) || null,
      extractedAt: new Date().toISOString(),
      captureSource: 'quo_dom'
    };
  }

  function extractLead() {
    const currentPlatform = platform();
    const yelpLead = currentPlatform === 'yelp' ? extractYelpLead() : null;
    if (yelpLead) return yelpLead;
    // Never infer a Yelp business from arbitrary conversation text.
    if (currentPlatform === 'yelp') return {
      id: `yelp:${location.pathname.match(/\/leads\/([^/?#]+)/)?.[1] || location.pathname}`,
      platform: 'yelp', url: location.href, companyName: null, customerName: null,
      extractedAt: new Date().toISOString(), captureSource: 'yelp_unresolved'
    };
    if (currentPlatform === 'quo') return extractQuoLead();
    const bodyText = text();
    const companyName = firstMatch([/(?:company|business)\s*(?:name)?\s*[:\-]\s*([^\n]+)/i], bodyText)
      || yelpBusinessNameFromText(document.title)
      || yelpBusinessNameFromText(bodyText);
    const squareFeet = squareFeetFromText(bodyText);
    const bedrooms = firstMatch([/(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?\b|br\b)/i], bodyText);
    const bathrooms = firstMatch([/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?\b|ba\b)/i], bodyText);
    const serviceType = firstMatch([/(?:service|cleaning type|type of cleaning)\s*[:\-]\s*([^\n]+)/i], bodyText)
      || ['post construction', 'move-in', 'move-out', 'deep cleaning', 'first cleaning', 'bi-weekly', 'monthly']
        .find((service) => bodyText.toLowerCase().includes(service));
    return {
      id: `${currentPlatform}:${location.pathname}:${location.search}`,
      platform: currentPlatform,
      url: location.href,
      companyName,
      squareFeet,
      bedrooms,
      bathrooms,
      serviceType,
      extractedAt: new Date().toISOString(),
      captureSource: 'generic_text'
    };
  }

  global.CleaningLeadExtractor = { extractLead, extractQuoLead, yelpApolloStateFromScripts, extractYelpLeadFromState, firstName, isCustomerName, visibleCustomerName, yelpBusinessNameFromText, surveyAnswer, answersAfterLabel, leadDetailsSection, leadPhoneFromDetails, squareFeetFromText };
  if (typeof module !== 'undefined') module.exports = global.CleaningLeadExtractor;
})(globalThis);
