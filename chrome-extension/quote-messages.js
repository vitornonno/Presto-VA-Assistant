(function messageModule(global) {
  'use strict';

  function hours(value) { return Number.isInteger(value) ? String(value) : Number(value).toFixed(1); }
  function greeting(name) { return name ? `Hi ${name},` : 'Hi,'; }
  function countLabel(value, singular, plural) {
    return `${value || '?'} ${Number(value) === 1 ? singular : plural}`;
  }
  const UNSUPPORTED_EXTRA_SERVICE_PATTERN = /carpet|\brugs?\b|tapetes?|upholster|sofa|sof[áa]|couch|estofad|pet\s*odor|odor.*pet|odor.*anima/i;
  function supportedExtraServices(extraServices) {
    if (!extraServices) return '';
    return String(extraServices)
      .split(/\s*(?:,|\n|;)\s*/)
      .map((item) => item.trim())
      .filter((item) => item && !/^(?:not sure|none|n\/a|n[ãa]o tenho certeza|nenhum)$/i.test(item) && !UNSUPPORTED_EXTRA_SERVICE_PATTERN.test(item))
      .join(', ');
  }
  function homeDetails(lead) {
    const items = [];
    if (lead.bedrooms || lead.bathrooms) items.push(`🏠 Home: ${countLabel(lead.bedrooms, 'Bedroom', 'Bedrooms')} / ${countLabel(lead.bathrooms, 'Bathroom', 'Bathrooms')}`);
    if (lead.squareFeet) items.push(`📐 Approximate Size: ${lead.squareFeet} sq. ft.`);
    if (lead.cleaningProducts) items.push(`🍃 Cleaning Products: ${lead.cleaningProducts}`);
    const extraServices = supportedExtraServices(lead.extraServices);
    if (extraServices) items.push(`🧽 Additional Services Requested: ${extraServices}`);
    return items;
  }
  function hourlyEstimate(quote) {
    return [
      'For this service, we recommend hourly pricing because the amount of time needed can vary depending on the home’s condition and the level of detail required.',
      '',
      '💲 Rate: $50 per cleaner, per hour',
      '',
      `⏱️ Estimated time: Approximately ${hours(quote.estimatedHours.minimum)} – ${hours(quote.estimatedHours.maximum)} hours`,
      '👥 Team: 2 professional cleaners',
      '',
      'The actual time may vary depending on the home’s condition and the level of detail required.',
      '',
      'Upon arrival, our team will perform a brief walkthrough of the property and provide a more accurate estimate of the expected cleaning time before work begins.'
    ];
  }
  function recurringCleaningSection(quote) {
    const recurring = quote?.recurringCleaning;
    if (!recurring) return [];
    const cadence = recurring.label || 'Recurring';
    const cadenceTitle = /^regular$/i.test(cadence) ? 'REGULAR CLEANING' : `${cadence.toUpperCase()} REGULAR CLEANING`;
    const initialVisit = quote.service === 'deep_cleaning' ? 'Deep Cleaning' : 'First Cleaning';
    const section = [
      `🔄 AFTER THE ${initialVisit.toUpperCase()} — ${cadenceTitle}`,
      '',
      `Once the ${initialVisit} has been completed, we can transition to a fixed recurring rate for ${cadence.toLowerCase()} service.`
    ];
    if (recurring.priceRange) {
      section.push('', `💲 ${cadence} Regular Cleaning: approximately $${recurring.priceRange.minimum} - $${recurring.priceRange.maximum} per visit`);
    }
    if (recurring.discount?.percentage) {
      section.push(`✨ ${recurring.discount.percentage}% regular-cleaning discount applied`);
    }
    if (recurring.firstRecurringDiscount?.priceRange) {
      const discount = recurring.firstRecurringDiscount;
      section.push('', `✨ ${discount.percentage}% new customer discount on your first ${cadence.toLowerCase()} regular cleaning: approximately $${discount.priceRange.minimum} - $${discount.priceRange.maximum} per visit. Future regular cleanings return to $${discount.standardPriceRange.minimum} - $${discount.standardPriceRange.maximum} per visit.`);
    } else if (recurring.firstRecurringDiscount?.percentage) {
      section.push('', `✨ ${recurring.firstRecurringDiscount.percentage}% new customer discount on your first ${cadence.toLowerCase()} regular cleaning. Future regular cleanings return to the regular rate confirmed after the ${initialVisit}.`);
    }
    section.push('', `The exact recurring rate will be confirmed after the ${initialVisit}.`);
    return section;
  }
  function serviceLimitations(lead) {
    const requested = String(lead?.extraServices || '').toLowerCase();
    const notes = [];
    const requestsCarpet = /carpet/.test(requested);
    const requestsRug = /\brugs?\b|tapetes?/.test(requested);
    if (requestsCarpet && requestsRug) {
      notes.push('⚠️ Please note that we do not provide professional carpet or rug shampoo/extraction cleaning, but we can vacuum carpeted areas and rugs as part of the service.');
    } else if (requestsCarpet) {
      notes.push('⚠️ Please note that we do not provide professional carpet shampoo/extraction cleaning, but we can vacuum carpeted areas as part of the service.');
    } else if (requestsRug) {
      notes.push('⚠️ Please note that we do not provide professional rug shampoo/extraction cleaning, but we can vacuum rugs as part of the service.');
    }
    if (/upholster|sofa|sof[áa]|couch|estofad/.test(requested)) {
      notes.push('⚠️ Please note that we do not provide professional upholstery cleaning.');
    }
    if (/pet\s*odor|odor.*pet|odor.*anima/.test(requested)) {
      notes.push('⚠️ Please note that we do not provide specialized pet odor treatment or guaranteed odor removal, but we can thoroughly clean the affected areas and help reduce odors as part of the service.');
    }
    if (notes.length < 2) return notes;
    const groupedNote = (note) => {
      if (/carpet or rug shampoo/i.test(note)) return '• Professional carpet or rug shampoo/extraction cleaning is not included; carpeted areas and rugs can still be vacuumed as part of the service.';
      if (/carpet shampoo/i.test(note)) return '• Professional carpet shampoo/extraction cleaning is not included; carpeted areas can still be vacuumed as part of the service.';
      if (/rug shampoo/i.test(note)) return '• Professional rug shampoo/extraction cleaning is not included; rugs can still be vacuumed as part of the service.';
      if (/upholstery cleaning/i.test(note)) return '• Professional upholstery cleaning is not included.';
      if (/pet odor treatment/i.test(note)) return '• Specialized pet odor treatment and guaranteed odor removal are not included; affected areas can still be thoroughly cleaned to help reduce odors.';
      return note;
    };
    return [
      [
        '🧼 A quick note about the additional services requested:',
        '',
        ...notes.map(groupedNote)
      ].join('\n')
    ];
  }
  function separatedParagraphs(items) {
    return items.flatMap((item, index) => index ? ['', item] : [item]);
  }
  function selectedAvailability(review) {
    const slots = Array.isArray(review?.availability) ? review.availability : [];
    if (!slots.length) return [];
    const date = (value) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
    const time = (minutes) => {
      const hour = Math.floor(minutes / 60); const minute = minutes % 60;
      const suffix = hour >= 12 ? 'PM' : 'AM'; const twelveHour = hour % 12 || 12;
      return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
    };
    return ['📅 Current availability:', '', ...slots.map((slot) => `• ${date(slot.day)} | Arrival window: ${time(slot.start)}–${time(slot.start + 30)}`)];
  }
  function noAvailabilityFollowUp(review) {
    if (review?.availabilitySearch?.compatibleTotal !== 0) return [];
    const details = [
      'To help us find the best opening for you, please let us know:',
      '',
      '📅 Which day of the week works best',
      '⏰ Whether you prefer morning or afternoon',
      '📍 Your service address'
    ];
    if (review?.lead?.phoneNumber) details.push('📞 And please confirm if this is the best phone number to use for your appointment');
    details.push(
      '',
      'Once we have that information, we’ll check our schedule and send you the closest available options.'
    );
    return details;
  }
  function companySignatureLines(company) {
    const signatures = {
      kacs: ['KACS Cleaning Services LLC', '🌐 www.kacscleaning.com', '📞 (925) 438-0657'],
      jheys: ['Best regards,', 'Jhey’s Cleaning', '📞 (925) 515-5090'],
      dasilva: ['Da Silva Cleaning Services', '📞 (925) 515-3121'],
      utcleans: ['Best regards,', 'UT Cleans', '📞 (925) 202-0504'],
      marys: ['Warm regards,', "Mary's House Cleaning", '📞 (925) 905-8387'],
      gleam: ['Gleam Team Housecleaning', '📞 (925) 515-5461'],
      express: ['Express House Cleaning', '📞 (510) 757-9573']
    };
    return signatures[company] || signatures.kacs;
  }
  const VA_NAMES = ['Frank', 'Mary', 'Andie', 'Luiza', 'Carol', 'Oliver', 'Jonas'];
  function resolveAttendant(company, ...sources) {
    for (const source of sources) {
      const candidate = typeof source === 'string' ? source.trim() : String(source?.vaName || '').trim();
      if (candidate) return candidate;
    }
    return companyContactMeta(company).attendant;
  }
  function detailsRequestMessage(lead, company, requestedDetails, options) {
    const requested = new Set(requestedDetails || []);
    const items = [];
    if (requested.has('squareFeet')) items.push('• Approximate square footage');
    if (requested.has('bedrooms')) items.push('• Number of bedrooms');
    if (requested.has('bathrooms')) items.push('• Number of bathrooms');
    if (requested.has('photos')) items.push('• A few photos of the main areas (optional)');
    if (!items.length) return null;
    const name = lead?.customerName;
    const resolvedCompany = company || 'kacs';
    const attendant = resolveAttendant(resolvedCompany, options, lead);

    const builders = {
      kacs: [
        greeting(name),
        '',
        'Thank you for reaching out to KACS Cleaning Services LLC!',
        '',
        'To calculate an accurate time estimate and confirm our team availability, could you please share a few quick details about your home:',
        '',
        ...items,
        '',
        'Once we have these details, we’ll put together your personalized estimate and estimated hours right away.',
        '',
        ...companySignatureLines('kacs')
      ],
      jheys: [
        greeting(name),
        '',
        'Thank you for reaching out to Jhey’s Cleaning!',
        '',
        'To help us prepare the most accurate investment range for your home, could you kindly share the following details:',
        '',
        ...items,
        '',
        'As soon as you send these over, we will gladly prepare a personalized cleaning plan for you.',
        '',
        ...companySignatureLines('jheys')
      ],
      dasilva: [
        greeting(name),
        '',
        'Thank you for reaching out to Da Silva Cleaning Services! 😊',
        '',
        'To prepare an accurate estimate tailored to your home, could you please let us know:',
        '',
        ...items,
        '',
        'Once we have this information, our team will be happy to prepare your quote and go over the next steps.',
        '',
        ...companySignatureLines('dasilva')
      ],
      utcleans: [
        greeting(name),
        '',
        'Thank you for reaching out to UT Cleans! We’d love to help get your home feeling fresh and clean. 😊',
        '',
        'To put together the most accurate quote for you, could you please share a couple quick details:',
        '',
        ...items,
        '',
        'As soon as you send those over, we’ll get your estimate right back to you!',
        '',
        ...companySignatureLines('utcleans')
      ],
      marys: [
        greeting(name),
        '',
        "Thank you for reaching out to Mary's House Cleaning! ✨",
        '',
        'To prepare an accurate estimate and ensure your home receives the care and attention it deserves, could you please share:',
        '',
        ...items,
        '',
        `Once you share these details, ${attendant} will prepare your personalized quote and review the next steps with you.`,
        '',
        ...companySignatureLines('marys')
      ],
      gleam: [
        greeting(name),
        '',
        'Thanks for reaching out to Gleam Team Housecleaning.',
        '',
        "Before I put a quote together, I just need a few details about the home so we're not giving you a number based on guesswork:",
        '',
        ...items,
        '',
        "If it's easier, you can also send a few pictures or a short walkthrough video. Sometimes that's the easiest way for us to get a good feel for the home.",
        '',
        ...companySignatureLines('gleam')
      ],
      express: [
        greeting(name),
        '',
        'Thank you for reaching out to Express House Cleaning! 👋',
        '',
        "You’re in great hands with our team. To help us prepare an accurate and reliable quote for your home, could you please share:",
        '',
        ...items,
        '',
        'Once we receive these details, we’ll send over your customized quote so you know exactly what to expect.',
        '',
        ...companySignatureLines('express')
      ]
    };

    const lines = builders[resolvedCompany] || builders.kacs;
    return lines.join('\n');
  }
  const followUpDefinitions = {
    kacs: [
      {
        signatures: [
          "i tried giving you a quick call to follow up in case you're still looking for help with your home cleaning",
          "i just wanted to follow up in case you're still looking for help with your home cleaning"
        ],
        message: (name, lead) => {
          const va = resolveAttendant('kacs', lead);
          return lead?.phoneNumber ? [
            `Hi ${name}, this is ${va} just checking in!`,
            '',
            "I tried giving you a quick call to follow up in case you're still looking for help with your home cleaning.",
            '',
            'At KACS Cleaning, we specialize in making your life easier — delivering a spotless home without you lifting a finger.',
            'Our cleanings are fully customized to your priorities, so you get exactly what you need, effortlessly.',
            '',
            'Looking forward to your reply!'
          ].join('\n') : [
            `Hi ${name}, this is ${va} from KACS Cleaning.`,
            '',
            "I just wanted to follow up in case you're still looking for help with your home cleaning.",
            '',
            'At KACS Cleaning, we specialize in making your life easier — delivering a spotless home without you lifting a finger.',
            'Our cleanings are fully customized to your priorities, so you get exactly what you need, effortlessly.',
            '',
            'Let me know if you have any questions or special requests, we’d love to provide a personalized quote that fits exactly what you’re looking for.'
          ].join('\n');
        }
      },
      {
        signature: "i noticed you saw our last message and wanted to follow up in case you're still looking for help with your home cleaning",
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('kacs', lead)} from KACS Cleaning again, just checking in!`,
          '',
          "I noticed you saw our last message and wanted to follow up in case you're still looking for help with your home cleaning.",
          '',
          'Let me know if you have any questions or special requests, we’d love to provide a personalized quote that fits exactly what you’re looking for.'
        ].join('\n')
      },
      {
        signature: "checking in to follow up on the cleaning service quote we've shared with you",
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('kacs', lead)}! I hope everything is okay!`,
          '',
          "I'm just checking in to follow up on the cleaning service quote we've shared with you.",
          '',
          'Let me know if you need more time, something not included in the checklist, or if you have any questions. Also, if you could let me know your budget, we can try to work within that.',
          '',
          'Feel free to contact me if you have any questions or would like to discuss adjustments.'
        ].join('\n')
      },
      {
        signature: "i wanted to check in to see if you're still interested in scheduling a home cleaning",
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('kacs', lead)} from KACS Cleaning Services -- just reaching out again!`,
          '',
          "I wanted to check in to see if you're still interested in scheduling a home cleaning. Our goal is to make things simple for you, with a sparkling clean home tailored exactly to your needs.",
          '',
          "Please feel free to share any details or questions -- we'd be glad to prepare a personalized quote that works perfectly for you."
        ].join('\n')
      }
    ],
    jheys: [
      {
        signature: 'whether you are still considering options for your home cleaning',
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('jheys', lead)} following up.`,
          '',
          'I wanted to check whether you are still considering options for your home cleaning.',
          '',
          'At Jhey’s Cleaning, our aim is to make the process simple and worry-free, with each service tailored to your home’s specific needs.',
          '',
          'Please let me know your thoughts whenever convenient.',
          '',
          'Best regards,',
          'Jhey’s Cleaning'
        ].join('\n')
      },
      {
        signature: 'follow up in case this message was previously overlooked',
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('jheys', lead)} from Jhey’s Cleaning once again.`,
          '',
          'I wanted to follow up in case this message was previously overlooked. There is no pressure at all — I simply wanted to remain available should you still be deciding.',
          '',
          'If any part of the estimate needs adjustment, I would be glad to review it with you.',
          '',
          'Best regards,',
          'Jhey’s Cleaning'
        ].join('\n')
      },
      {
        signature: 'follow up once more regarding the estimate we shared with you',
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('jheys', lead)} from Jhey’s Cleaning.`,
          '',
          'I wanted to follow up once more regarding the estimate we shared with you. I understand if timing may not be right just yet.',
          '',
          'If there is a specific budget you are working with, or an item in the checklist you would prefer to adjust, please let me know and we can review the options together.',
          '',
          'I remain available whenever you are ready to proceed or if you have any questions.',
          '',
          'Best regards,',
          'Jhey’s Cleaning'
        ].join('\n')
      },
      {
        signature: 'wanted to touch base before closing out our notes in case you still need assistance',
        message: (name, lead) => [
          `Hi ${name}, this is ${resolveAttendant('jheys', lead)} from Jhey's Cleaning reaching out one last time.`,
          '',
          'I wanted to touch base before closing out our notes in case you still need assistance with your home cleaning.',
          '',
          'We truly appreciate your time and there is absolutely no pressure. If your schedule opens up or you’d like to revisit your cleaning plan in the future, we would be honored to assist you.',
          '',
          'Wishing you all the best,',
          '',
          'Best regards,',
          'Jhey’s Cleaning',
          '📞 (925) 515-5090'
        ].join('\n')
      }
    ],
    dasilva: [],
    gleam: [],
    express: []
  };
  function followUp(signature, message) { return { signature, message: (name, lead) => message(name, lead).join('\n') }; }
  function signed(lines, company, phone) { return [...lines, '', company, `📞 ${phone}`]; }
  const situationalFollowUps = {
    dasilva: [
      { title: 'Quote sent — no reply', signals: 'The quote is in the chat and the client has not replied.', messages: [
        followUp('questions about the service or would like to go over the details', (name) => signed([`Hi ${name},`, '', 'I just wanted to follow up and make sure you had a chance to review the estimate we sent over.', '', "If you have any questions about the service or would like to go over the details, we'll be happy to help."], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp("still considering cleaning services for your home", (name) => signed([`Hi ${name},`, '', "Just checking in to see if you're still considering cleaning services for your home.", '', "If you'd like to move forward or if there's anything you'd like us to adjust or clarify in the estimate, just let us know. We'd be happy to help."], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp('cleaning your home is still on your list', (name) => signed([`Hi ${name},`, '', 'I just wanted to follow up one last time regarding the estimate we sent.', '', "If cleaning your home is still on your list, we'd be happy to assist whenever you're ready. And if you've already made other arrangements, no worries at all.", '', 'Thank you for considering Da Silva Cleaning Services!'], 'Da Silva Cleaning Services', '(925) 515-3121'))
      ] },
      { title: 'Details requested — no reply', signals: 'Information was requested and no quote appears in the chat.', messages: [
        followUp('review everything and prepare the best option for your home', (name) => signed([`Hi ${name},`, '', 'I just wanted to follow up regarding the information we requested for your cleaning estimate.', '', "Once we have those details, we'll be happy to review everything and prepare the best option for your home.", '', 'Whenever you have a chance, just send us the information here.'], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp("make sure the quote is as accurate as possible", (name) => signed([`Hi ${name},`, '', "Just checking in to see if you're still looking for cleaning services.", '', "We're still happy to prepare your estimate. We just need the remaining details about your home so we can make sure the quote is as accurate as possible.", '', 'Feel free to send them whenever it’s convenient for you.'], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp("won't be able to prepare the estimate just yet", (name) => signed([`Hi ${name},`, '', 'I just wanted to follow up one last time regarding your cleaning request.', '', "Since we haven't received the remaining information, we won't be able to prepare the estimate just yet. If you'd still like a quote in the future, simply reach out and we'll be happy to help.", '', 'Thank you for considering Da Silva Cleaning Services!'], 'Da Silva Cleaning Services', '(925) 515-3121'))
      ] },
      { title: 'Quote sent, client replied, then stopped', signals: 'A quote is in the chat and the client replied after it.', messages: [
        followUp('we had previously been in touch', (name) => signed([`Hi ${name},`, '', 'I just wanted to check back in with you regarding your cleaning service.', '', 'We had previously been in touch, and I wanted to see if you had any questions about the estimate or if there’s anything else you’d like to discuss.', '', "We're happy to help whenever you're ready."], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp("plans have changed, that's completely understandable", (name) => signed([`Hi ${name},`, '', 'Just touching base with you again to see if you’re still considering the cleaning service we discussed.', '', "If your plans have changed, that's completely understandable. And if you're still looking, we'd be happy to answer any questions or help with the next step."], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp('continue with the service we discussed, simply send us a message', (name) => signed([`Hi ${name},`, '', 'I just wanted to reach out one last time in case you’re still looking for help with your home cleaning.', '', 'If you’d like to continue with the service we discussed, simply send us a message and we’ll be happy to assist with scheduling.', '', 'Wishing you all the best, and thank you again for considering us!'], 'Da Silva Cleaning Services', '(925) 515-3121'))
      ] },
      { title: 'Details received, quote sent, then stopped', signals: 'The client sent requested details and a quote was then sent.', messages: [
        followUp('sending us the information we needed for your home', (name) => signed([`Hi ${name},`, '', 'Thank you again for sending us the information we needed for your home.', '', 'I just wanted to follow up and make sure you had a chance to review the estimate we sent over.', '', "If you have any questions or would like to go over the details, we're happy to help."], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp('help you decide on the best option', (name) => signed([`Hi ${name},`, '', 'Just checking in regarding the estimate we prepared for your home.', '', "If you're still considering the service, we'd be happy to answer any questions or help you decide on the best option.", '', 'Whenever you’re ready, just send us a message.'], 'Da Silva Cleaning Services', '(925) 515-3121')),
        followUp('giving us the opportunity to assist you', (name) => signed([`Hi ${name},`, '', 'I just wanted to follow up one last time regarding the estimate we sent after receiving the information about your home.', '', "If you're still looking for a cleaning service, we'd be happy to help whenever you're ready. And if you've already made other arrangements, we completely understand.", '', 'Thank you for giving us the opportunity to assist you!'], 'Da Silva Cleaning Services', '(925) 515-3121'))
      ] }
    ],
    gleam: [
      { title: 'Quote sent — no reply', signals: 'The quote is in the chat and the client has not replied.', messages: [
        followUp('has the timing changed on your end', (name) => signed([`Hi ${name}! Just wanted to check back in and see if you had a chance to look over the quote.`, '', 'Has the timing changed on your end, or are you still thinking about getting the cleaning scheduled?', "Either way, no worries. If you have any questions, I'm here."], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp("quote didn't get lost in the shuffle", (name) => signed([`Hi ${name}, just checking in again on the cleaning.`, '', "I know things get busy, so I wanted to make sure the quote didn't get lost in the shuffle. If there's anything you'd like to change or talk through, just send it my way."], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp('one last check-in from us about the cleaning', (name) => signed([`Hi ${name}! Just one last check-in from us about the cleaning.`, '', "If you'd still like to schedule, just let me know and we'll pick things back up. And if the timing isn't right anymore, that's completely okay too.", '', "Whenever you're ready, we're here."], 'Gleam Team Housecleaning', '(925) 515-5461'))
      ] },
      { title: 'Details requested — no reply', signals: 'Information was requested and no quote appears in the chat.', messages: [
        followUp('information we were still missing for your cleaning quote', (name) => signed([`Hi ${name}! Just wanted to check back in about the information we were still missing for your cleaning quote.`, '', "If it's easier, you can just send us a few pictures or a short walkthrough video. We don't need anything fancy — it just helps us get a better idea of the home and price it properly.", '', "Whenever you get a chance, send it over and I'll take it from there."], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp("we haven't been able to put the estimate together yet", (name) => signed([`Hi ${name}, just checking in on the quote.`, '', "We haven't been able to put the estimate together yet because we're still missing a few details about the home.", '', 'Whenever you have a moment, send over the information or a few pictures and we’ll take care of the rest.'], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp("we haven't received the remaining details we need for the quote", (name) => signed([`Hi ${name}! Just one last check-in from Gleam Team Housecleaning.`, '', "We haven't received the remaining details we need for the quote, so we'll leave things here for now.", '', "If you'd still like an estimate later, just message us whenever you're ready and we'll pick it right back up."], 'Gleam Team Housecleaning', '(925) 515-5461'))
      ] },
      { title: 'Quote sent, client replied, then stopped', signals: 'A quote is in the chat and the client replied after it.', messages: [
        followUp('circle back on our conversation about the cleaning', (name) => signed([`Hi ${name}! Just wanted to circle back on our conversation about the cleaning.`, '', "We'd talked about [SERVICE / DATE / DETAIL], and I wanted to see if you were still thinking about moving forward or if something changed on your end.", '', 'No worries either way — just let me know when you get a chance.'], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp("not sure if you're still figuring out the timing", (name) => signed([`Hi ${name}, just checking back in with you.`, '', "I'm not sure if you're still figuring out the timing or if the cleaning ended up going in a different direction. If you want to revisit the quote or change anything about the service, I'm happy to take another look."], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp('one last message from us for now', (name) => signed([`Hi ${name}! Just one last message from us for now.`, '', "If the cleaning isn't something you need right now, no worries at all. And if you'd like to pick things back up later, just send us a message and we'll be happy to continue where we left off.", '', 'Take care!'], 'Gleam Team Housecleaning', '(925) 515-5461'))
      ] },
      { title: 'Details received, quote sent, then stopped', signals: 'The client sent requested details and a quote was then sent.', messages: [
        followUp('quote we put together from the details you sent', (name) => signed([`Hi ${name}! Just wanted to check in now that you've had a chance to look over the quote we put together from the details you sent.`, '', "Does everything look good on your end, or is there anything you'd like us to change?"], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp('adjust the scope a little', (name) => signed([`Hi ${name}, just checking back in on the estimate we sent over.`, '', "If you're still thinking about it and have any questions, feel free to ask. And if you'd like us to adjust the scope a little, we can take another look at that too."], 'Gleam Team Housecleaning', '(925) 515-5461')),
        followUp('one last check-in from gleam team housecleaning about the quote', (name) => signed([`Hi ${name}! Just one last check-in from Gleam Team Housecleaning about the quote.`, '', "If you'd still like to get the cleaning scheduled, just let me know and we'll take it from there. If the timing changed, that's completely okay too.", '', "Whenever you need us, we're here."], 'Gleam Team Housecleaning', '(925) 515-5461'))
      ] }
    ],
    express: [
      { title: 'Quote sent — no reply', signals: 'The quote is in the chat and the client has not replied.', messages: [
        followUp("about the cleaning or what's included", (name, lead) => signed([`Hi ${name}! This is ${resolveAttendant('express', lead)} with Express House Cleaning.`, '', 'I just wanted to follow up and make sure you had a chance to review the estimate we sent over.', '', "If you have any questions about the cleaning or what's included, I'd be happy to help."], 'Express House Cleaning', '(510) 757-9573')),
        followUp('like to go over any of the details or make any adjustments to the service', (name) => signed([`Hi ${name}! Just checking in regarding the cleaning estimate we sent you.`, '', 'If you’re still looking for a cleaning service, feel free to let me know if you’d like to go over any of the details or make any adjustments to the service.', '', 'I’ll be happy to help.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp('one last time regarding your cleaning estimate', (name) => signed([`Hi ${name}! I wanted to follow up one last time regarding your cleaning estimate.`, '', "If you’re still interested, just let me know and we can continue from here. If your plans have changed, that's completely fine as well.", '', 'Thank you for considering Express House Cleaning!'], 'Express House Cleaning', '(510) 757-9573'))
      ] },
      { title: 'Details requested — no reply', signals: 'Information was requested and no quote appears in the chat.', messages: [
        followUp('missing the remaining information before we can prepare your estimate', (name, lead) => signed([`Hi ${name}! This is ${resolveAttendant('express', lead)} with Express House Cleaning.`, '', 'I’m following up on your cleaning request. We’re still missing the remaining information before we can prepare your estimate.', '', "Whenever you have a chance, just send that information over and I’ll be happy to continue with the quote."], 'Express House Cleaning', '(510) 757-9573')),
        followUp('estimating the service correctly', (name) => signed([`Hi ${name}! Just checking in regarding your cleaning request.`, '', "We’d still be happy to prepare an estimate for you. We just need the remaining information to make sure we’re estimating the service correctly.", '', 'Feel free to send it whenever you have a chance.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp("haven't been able to prepare the estimate yet because we're still missing", (name) => signed([`Hi ${name}! I wanted to check in one last time regarding your cleaning request.`, '', "We haven’t been able to prepare the estimate yet because we’re still missing the remaining information.", '', 'If you’re still interested, just send that over and we can continue from there.', '', 'Thank you!'], 'Express House Cleaning', '(510) 757-9573'))
      ] },
      { title: 'Quote sent, client replied, then stopped', signals: 'A quote is in the chat and the client replied after it.', messages: [
        followUp('regarding our conversation and the cleaning estimate', (name, lead) => signed([`Hi ${name}! This is ${resolveAttendant('express', lead)} with Express House Cleaning.`, '', 'I just wanted to check back in regarding our conversation and the cleaning estimate.', '', 'I wasn’t sure if you were still considering the service, so I wanted to see if you had any questions or if there was anything else you needed from us.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp('make any adjustments based on what you’re looking for', (name) => signed([`Hi ${name}! Just checking in with you regarding the cleaning.`, '', "If you’re still interested, I’d be happy to go over the estimate again or make any adjustments based on what you’re looking for.", '', 'Just let me know what works for you.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp('pick things back up from where we left off', (name) => signed([`Hi ${name}! I wanted to check in one last time regarding your cleaning request.`, '', 'I know plans can change, so I just wanted to see if you’re still looking for a cleaning service.', '', 'If you’d like to continue with the estimate, just send me a message and we can pick things back up from where we left off.', '', 'Thank you!'], 'Express House Cleaning', '(510) 757-9573'))
      ] },
      { title: 'Details received, quote sent, then stopped', signals: 'The client sent requested details and a quote was then sent.', messages: [
        followUp('review the estimate we sent afterward', (name, lead) => signed([`Hi ${name}! This is ${resolveAttendant('express', lead)} with Express House Cleaning.`, '', 'Thank you again for sending over the information we needed.', '', 'I just wanted to check in and make sure you had a chance to review the estimate we sent afterward.', '', 'If you have any questions about the quote or the service, I’d be happy to help.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp('estimate we sent based on the details you provided', (name) => signed([`Hi ${name}! Just following up on the estimate we sent based on the details you provided.`, '', 'If you’re still considering the cleaning, feel free to let me know if there’s anything you’d like to clarify or adjust.', '', 'I’m happy to go over it with you.'], 'Express House Cleaning', '(510) 757-9573')),
        followUp('plans have changed, no problem at all', (name) => signed([`Hi ${name}! I wanted to check in one last time regarding the estimate we sent you.`, '', 'If you’re still looking for cleaning services, just let me know and we can continue from here.', '', 'If your plans have changed, no problem at all.', '', 'Thank you again for considering Express House Cleaning!'], 'Express House Cleaning', '(510) 757-9573'))
      ] }
    ],
    utcleans: [
      { title: 'Quote sent — no reply', signals: 'The quote is in the chat and the client has not replied.', messages: [
        followUp('what you thought about the cleaning estimate', (name) => [...[`Hi ${name}! 😊 Just checking in to see what you thought about the cleaning estimate. If you have any questions, I’m happy to help!`], '', ...companySignatureLines('utcleans')]),
        followUp('in case you’re still considering the cleaning', (name) => [...[`Hi ${name}! 😊 I wanted to follow up in case you’re still considering the cleaning. We’d be happy to help whenever the timing works best for you!`], '', ...companySignatureLines('utcleans')]),
        followUp('one last check-in about your cleaning estimate', (name) => [...[`Hi ${name}! 😊 Just one last check-in about your cleaning estimate. No pressure at all—feel free to reach out whenever you’re ready. We’d be happy to help!`], '', ...companySignatureLines('utcleans')])
      ] },
      { title: 'Details requested — no reply', signals: 'Information was requested and no quote appears in the chat.', messages: [
        followUp('check the details we needed for your quote', (name) => [...[`Hi ${name}! 😊 Just following up to see if you had a chance to check the details we needed for your quote. Whenever you’re ready, send those over and we’ll put together your estimate!`], '', ...companySignatureLines('utcleans')]),
        followUp('share those remaining details, we’ll get your quote ready right away', (name) => [...[`Hi ${name}! 😊 Just checking in again! We’d still love to help get your home feeling fresh and clean. Whenever you have a moment to share those remaining details, we’ll get your quote ready right away.`], '', ...companySignatureLines('utcleans')]),
        followUp('since we haven’t received those details yet, we’ll hold off for now', (name) => [...[`Hi ${name}! 😊 Just one last note regarding your cleaning request. Since we haven’t received those details yet, we’ll hold off for now. Feel free to message us anytime if you’d still like an estimate!`], '', ...companySignatureLines('utcleans')])
      ] },
      { title: 'Quote sent, client replied, then stopped', signals: 'A quote is in the chat and the client replied after it.', messages: [
        followUp('checking back in after our earlier conversation', (name) => [...[`Hi ${name}! 😊 Just checking back in after our earlier conversation. Did you have any questions about the estimate, or would you like to look at a day that works best for your cleaning?`], '', ...companySignatureLines('utcleans')]),
        followUp('touching base once more to see if you’re still considering scheduling with us', (name) => [...[`Hi ${name}! 😊 Touching base once more to see if you’re still considering scheduling with us. If your schedule or plans changed, no worries at all—we’re here whenever you’re ready!`], '', ...companySignatureLines('utcleans')]),
        followUp('reaching out one last time in case you’d still like to get your cleaning scheduled', (name) => [...[`Hi ${name}! 😊 Just reaching out one last time in case you’d still like to get your cleaning scheduled. If now isn’t the right time, that’s completely okay. We’d love to help whenever you need us!`], '', ...companySignatureLines('utcleans')])
      ] },
      { title: 'Details received, quote sent, then stopped', signals: 'The client sent requested details and a quote was then sent.', messages: [
        followUp('just wanted to make sure our estimate came through okay', (name) => [...[`Hi ${name}! 😊 Thank you again for sharing those details about your home! Just wanted to make sure our estimate came through okay. Let me know what you think whenever you have a chance!`], '', ...companySignatureLines('utcleans')]),
        followUp('following up on the estimate we sent for your home', (name) => [...[`Hi ${name}! 😊 Following up on the estimate we sent for your home. If there’s anything you’d like to adjust or if you have any questions at all, I’m happy to help!`], '', ...companySignatureLines('utcleans')]),
        followUp('reaching out one last time regarding the estimate we put together for you', (name) => [...[`Hi ${name}! 😊 Reaching out one last time regarding the estimate we put together for you. There’s no pressure at all—whenever you’re ready to get your home cleaned, just send us a message!`], '', ...companySignatureLines('utcleans')])
      ] }
    ],
    marys: [
      { title: 'Quote sent — no reply', signals: 'The quote is in the chat and the client has not replied.', messages: [
        followUp('chance to review the cleaning estimate we sent over', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning. I just wanted to follow up and see if you had a chance to review the cleaning estimate we sent over.`, '', "We'd be happy to answer any questions you may have or help you find a cleaning option that works best for your home and schedule.", '', "Whenever you're ready, just let us know. We're happy to help!"], '', ...companySignatureLines('marys')]),
        followUp('checking in regarding your cleaning estimate', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning, checking in regarding your cleaning estimate.`, '', "If you have any questions about the recommended service or would like to explore options that better fit your needs and budget, we'd be happy to help!", '', 'We want to make sure you have all the information you need to make the best decision for your home.', '', "Please feel free to reply whenever it's convenient for you."], '', ...companySignatureLines('marys')]),
        followUp('reaching out one last time regarding the cleaning estimate we sent you', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} reaching out one last time regarding the cleaning estimate we sent you.`, '', "We understand that plans and priorities can change, so there's absolutely no pressure. If you're still considering our cleaning services, we'd love the opportunity to assist you.", '', "If now isn't the right time, that's completely okay! We'll be here whenever you're ready."], '', ...companySignatureLines('marys')])
      ] },
      { title: 'Details requested — no reply', signals: 'Information was requested and no quote appears in the chat.', messages: [
        followUp('follow up on our previous message regarding your cleaning request', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning. I just wanted to follow up on our previous message regarding your cleaning request.`, '', "We'd love to prepare an estimate for your home! We just need the remaining details to help us provide accurate pricing.", '', "Whenever you have a moment, please send us the information we requested. If you aren't sure of the square footage, a few photos or a quick video walkthrough can also be helpful.", '', 'We look forward to hearing from you!'], '', ...companySignatureLines('marys')]),
        followUp("checking in to see if you're still interested in receiving your cleaning estimate", (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning, checking in to see if you're still interested in receiving your cleaning estimate.`, '', "We understand that life gets busy, and we're happy to make the process as easy as possible! You can simply reply with the missing details or send us a few photos or a short video walkthrough if that's more convenient.", '', "Once we have the necessary information, we'll be happy to prepare your estimate."], '', ...companySignatureLines('marys')]),
        followUp('reaching out one last time regarding your cleaning request', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} reaching out one last time regarding your cleaning request.`, '', "We'd still be happy to prepare an estimate for you, but we'll need the remaining information about your home before we can move forward.", '', "If you're still interested, simply reply to this message with the details we requested, and we'll take it from there!", '', "If your plans have changed, no worries at all. You're always welcome to contact us again in the future."], '', ...companySignatureLines('marys')])
      ] },
      { title: 'Quote sent, client replied, then stopped', signals: 'A quote is in the chat and the client replied after it.', messages: [
        followUp('follow up on our previous conversation about your cleaning service', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning. I just wanted to follow up on our previous conversation about your cleaning service.`, '', "We'd love to help you get everything arranged whenever you're ready! If you have any questions or need clarification about the estimate or the service we discussed, please don't hesitate to let us know.", '', "We're happy to help make the process as easy as possible for you!"], '', ...companySignatureLines('marys')]),
        followUp('still considering scheduling your cleaning with us', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning, checking in to see if you're still considering scheduling your cleaning with us.`, '', "If you have any questions or concerns about the service, timing, or estimate, we'd be happy to talk through the options with you.", '', 'Our goal is to find a solution that works well for your home and your needs.', '', "Just let us know what works best for you, and we'll be glad to assist!"], '', ...companySignatureLines('marys')]),
        followUp('reaching out one last time regarding our previous conversation about your cleaning service', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} reaching out one last time regarding our previous conversation about your cleaning service.`, '', "It was a pleasure connecting with you, and we'd still love the opportunity to take care of your home.", '', "We completely understand if your plans have changed or if you need more time to decide. If you'd like to move forward in the future, simply reach out to us, and we'll be happy to help!", '', "Thank you again for considering Mary's House Cleaning."], '', ...companySignatureLines('marys')])
      ] },
      { title: 'Details received, quote sent, then stopped', signals: 'The client sent requested details and a quote was then sent.', messages: [
        followUp('providing the additional details about your home', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning. Thank you again for providing the additional details about your home!`, '', 'I just wanted to follow up and see if you had a chance to review the estimate we prepared for you.', '', "We'd be happy to answer any questions you may have or provide further clarification about the recommended service.", '', "Whenever you have a moment, please let us know what you think. We're happy to help!"], '', ...companySignatureLines('marys')]),
        followUp('checking in regarding the estimate we sent after receiving your home details', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning, checking in regarding the estimate we sent after receiving your home details.`, '', 'If you have any questions about the pricing or would like to explore a service option that better fits your needs and budget, please feel free to let us know.', '', "We'd be happy to discuss the possibilities and help you find the best option for your home!"], '', ...companySignatureLines('marys')]),
        followUp('reaching out one last time regarding the estimate we prepared for your home', (name, lead) => [...[`Hi ${name}! 😊 This is ${resolveAttendant('marys', lead)} from Mary's House Cleaning, reaching out one last time regarding the estimate we prepared for your home.`, '', 'We appreciate you taking the time to share the details we needed to put everything together!', '', "We understand that schedules and priorities can change, so there's absolutely no pressure. If you're still interested in our services, we'd love to help you arrange your cleaning.", '', "If now isn't the right time, that's completely fine. You're always welcome to contact us again whenever you need professional cleaning services!"], '', ...companySignatureLines('marys')])
      ] }
    ]
  };
  function normalizeTextForMatching(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B`']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F""]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function situationalFollowUpStatus(company, lead, conversationText, options) {
    const situations = situationalFollowUps[company];
    if (!situations) return null;
    const effectiveLead = options?.vaName ? { ...lead, vaName: options.vaName } : lead;
    const history = String(conversationText || '').toLocaleLowerCase();
    const normalizedHistory = normalizeTextForMatching(conversationText);
    const hasQuote = /estimated (?:price|investment)|here.?s our estimate|recommended service|initial service|first visit estimate|quote (?:we|that)|estimate (?:we|that)/i.test(history);
    const hasDetailsRequest = /approximate square footage|number of bedrooms|number of bathrooms|photos of the main areas|(?:information|details) we (?:requested|need)|remaining (?:information|details)|missing (?:a few )?details|missing (?:the )?remaining information|walkthrough video|video walkthrough/i.test(history);
    const suggestedSituation = hasQuote && hasDetailsRequest ? 4 : hasDetailsRequest ? 2 : hasQuote ? 1 : null;
    return {
      suggestedSituation,
      situations: situations.map((situation, index) => ({
        ...situation,
        number: index + 1,
        messages: situation.messages.map((item, stage) => ({
          ...item,
          stage: stage + 1,
          sent: normalizedHistory.includes(normalizeTextForMatching(item.signature)),
          message: item.message(effectiveLead?.customerName || 'there', effectiveLead)
        }))
      }))
    };
  }
  function followUpStatus(company, lead, conversationText, options) {
    const effectiveLead = options?.vaName ? { ...lead, vaName: options.vaName } : lead;
    const situational = situationalFollowUpStatus(company, effectiveLead, conversationText, options);
    if (situational) return situational;
    const followUps = followUpDefinitions[company] || [];
    const normalizedHistory = normalizeTextForMatching(conversationText);
    return followUps.map((followUp, index) => ({
      number: index + 1,
      sent: (followUp.signatures || [followUp.signature]).some((signature) =>
        normalizedHistory.includes(normalizeTextForMatching(signature))
      ),
      message: followUp.message(effectiveLead?.customerName || 'there', effectiveLead)
    }));
  }
  function archivingMessage(company, lead, options) {
    const name = lead?.customerName || 'there';
    const va = resolveAttendant(company || 'kacs', options, lead);
    if (company === 'dasilva') return [
      `Hi ${name}, since we haven't heard back, we'll go ahead and close this request for now.`, '',
      "If you ever need professional cleaning in the future, simply reach out again—we'll be happy to prepare a new quote and assist you.", '',
      'We appreciate the opportunity and hope to work with you someday.', '',
      'Da Silva Cleaning Services', '📞 (925) 515-3121'
    ].join('\n');
    if (company === 'utcleans') return [
      `Hi ${name}, thank you for considering UT Cleans and for giving us the opportunity to assist you.`, '',
      "Since we haven't heard back from you, we'll close your request for now. If you'd like to schedule a cleaning with us in the future, we'd be more than happy to help. You can submit a new request or contact us directly at 📞 (925) 202-0504.", '',
      'We truly appreciate your interest and wish you all the best!', '', 'Best regards,', 'UT Cleans', '📞 (925) 202-0504'
    ].join('\n');
    if (company === 'marys') return [
      `Hi ${name}! 😊`, '', "Thank you for considering Mary's House Cleaning.", '', "Since we haven't heard back, we'll go ahead and close your request for now.", '', "If you decide you'd like to schedule a cleaning with us in the future, you're always welcome to reach out again. We'd be happy to assist you whenever you're ready!", '', 'We appreciate your interest in our services and wish you all the best.', '', 'Warm regards,', "Mary's House Cleaning", '📞 (925) 905-8387'
    ].join('\n');
    if (company === 'gleam') return [
      `Hi ${name}! We hadn't heard back, so we're going to leave this one here for now.`, '',
      'No worries at all if the timing wasn’t right. If you need a cleaning later, just send us a message and we’ll pick things back up.', '',
      'Take care!', 'Gleam Team Housecleaning', '📞 (925) 515-5461'
    ].join('\n');
    if (company === 'express') return [
      `Hi ${name}!`, '', 'Thank you once again for reaching out to Express House Cleaning!', '',
      'Since I haven’t heard back, I’ll go ahead and close your request for now. You’re always welcome to contact us again in the future.', '',
      'Wishing you all the best!', '', 'Warm regards,', 'Express House Cleaning', '📞 (510) 757-9573'
    ].join('\n');
    if (company === 'jheys') return [
      `Hi ${name}, thank you again for reaching out to Jhey's Cleaning.`,
      '',
      'As we have not heard back, we will go ahead and close this request for now. You are always welcome to reach out again by submitting a new request or contacting us at 📞 (925) 515-5090.',
      '',
      'Wishing you all the best.',
      'Warm regards,',
      "Jhey's Cleaning"
    ].join('\n');
    return [
      `Hi ${name}! Thank you once again for reaching out to KACS Cleaning!`,
      '',
      'Since I haven’t heard back, I’ll go ahead and close your request for now, but no worries — you’re always welcome to contact us again by submitting a new request or by texting/calling us at (925) 438-0657.',
      '',
      'You can also explore our services here:',
      'Our Google page: https://g.co/kgs/df1X25U',
      '🌐 www.kacscleaning.com',
      '',
      'Wishing you all the best!',
      `— ${va} | KACS Cleaning Services LLC`
    ].join('\n');
  }
  function kacsMessage(review) {
    const quote = review.quote;
    const lead = review.lead || {};
    const details = homeDetails(lead);
    const service = quote.service;
    const message = [greeting(lead.customerName), '', 'Thank you for reaching out to KACS Cleaning Services LLC!'];
    if (service === 'first_cleaning') {
      message.push('', "We'd be happy to help with your cleaning service. Since this would be your first cleaning with our company, we recommend starting with a First Cleaning. This initial visit allows us to become familiar with your home and establish a cleaning baseline before any future maintenance visits.");
    } else if (service === 'deep_cleaning') {
      message.push('', quote.recurringCleaning ? "We'd be happy to help with your Deep Cleaning service." : "We'd be happy to help with your one-time Deep Cleaning service.");
    }
    if (details.length) message.push('', 'Based on the information you provided:', '', ...details);
    message.push('', `🧼 ${quote.serviceLabel.toUpperCase()}`, '', ...hourlyEstimate(quote));
    const recurring = recurringCleaningSection(quote);
    if (recurring.length) message.push('', ...recurring);
    const limitations = serviceLimitations(lead);
    if (limitations.length) message.push('', ...separatedParagraphs(limitations));
    const availability = selectedAvailability(review);
    if (availability.length) message.push('', ...availability);
    const noAvailability = noAvailabilityFollowUp(review);
    if (noAvailability.length) message.push('', ...noAvailability);
    message.push('', 'Please let us know if you have any questions or would like to discuss the next steps.', '', 'KACS Cleaning Services LLC', '🌐 www.kacscleaning.com', '📞 (925) 438-0657');
    return message.join('\n');
  }

  function missingSizeMessage(review) {
    const quote = review.quote || {};
    const lead = review.lead || {};
    const service = quote.serviceLabel || lead.serviceType || 'cleaning service';
    return [
      greeting(lead.customerName),
      '',
      'Thank you for reaching out to KACS Cleaning Services LLC!',
      '',
      `We’d be happy to help with your ${service}. To prepare an accurate estimate, could you please let us know how many bedrooms and bathrooms your home has?`,
      '',
      'If available, you are also welcome to share the approximate square footage or a few photos of the main areas.',
      '',
      'Once we have those details, we’ll be happy to provide the estimated service time and discuss the next steps.',
      '',
      'KACS Cleaning Services LLC',
      '🌐 www.kacscleaning.com',
      '📞 (925) 438-0657'
    ].join('\n');
  }

  function jheysMissingSizeMessage(review) {
    const lead = review.lead || {};
    return [
      greeting(lead.customerName),
      '',
      'Thank you for reaching out to Jhey’s Cleaning. 👋',
      '',
      '✨ We’re currently welcoming new clients and would love the opportunity to prepare a personalized cleaning plan for your home.',
      '',
      'To prepare an accurate estimate for your home, could you kindly share the following details?',
      '• Approximate square footage',
      '• Number of bedrooms and bathrooms',
      '',
      'Photos or a short video of the main areas are also welcome, as they allow us to tailor the estimate more precisely.',
      '',
      'Best regards,',
      'Jhey’s Cleaning',
      '📞 (925) 515-5090'
    ].join('\n');
  }

  function jheysMessage(review) {
    const quote = review.quote || {};
    const lead = review.lead || {};
    const details = homeDetails(lead);
    const message = [
      greeting(lead.customerName),
      '',
      'Thank you for reaching out to Jhey’s Cleaning! ✨',
      '',
      'We’re currently welcoming new clients and would love the opportunity to make your home feel fresh, comfortable, and sparkling clean.',
      '',
      'Based on the details of your home, we recommend the following:'
    ];
    if (details.length) message.push('', ...details);
    message.push(
      '',
      `🧼 Recommended service: ${quote.serviceLabel || 'Cleaning'}`,
      `💲 Estimated investment: $${quote.priceRange?.minimum ?? quote.amount} to $${quote.priceRange?.maximum ?? Number(quote.amount || 0) + 100}`
    );
    if ((review.includeEstimatedTime ?? quote.includeEstimatedTime) && quote.estimatedHours) {
      message.push(`⏱️ Estimated time: ${hours(quote.estimatedHours.minimum)} to ${hours(quote.estimatedHours.maximum)} hours`);
    }
    if (quote.discount?.percentage) message.push(`✨ ${quote.discount.percentage}% new customer discount applied`);
    const recurring = recurringCleaningSection(quote);
    if (recurring.length) message.push('', ...recurring);
    const limitations = serviceLimitations(lead);
    if (limitations.length) message.push('', ...separatedParagraphs(limitations));
    const availability = selectedAvailability(review);
    if (availability.length) message.push('', ...availability);
    message.push(
      '',
      '👥 Team: 2 professional cleaners',
      '',
      'This first visit provides a thorough foundation, allowing future appointments to be more efficient, consistent, and budget-friendly.',
      ...(noAvailabilityFollowUp(review).length ? ['', ...noAvailabilityFollowUp(review)] : []),
      '',
      'We would be delighted to welcome you to Jhey’s Cleaning. Please let us know if you would like to proceed or have any questions.',
      '',
      'Best regards,',
      'Jhey’s Cleaning',
      '📞 (925) 515-5090'
    );
    return message.join('\n');
  }

  const fixedPriceCompanies = {
    dasilva: { name: 'Da Silva Cleaning Services', phone: '(925) 515-3121' },
    utcleans: { name: 'UT Cleans', phone: '(925) 202-0504' },
    marys: { name: "Mary's House Cleaning", phone: '(925) 905-8387' },
    gleam: { name: 'Gleam Team Housecleaning', shortName: 'Gleam Team', phone: '(925) 515-5461' },
    express: { name: 'Express House Cleaning', phone: '(510) 757-9573' }
  };
  function fixedPriceMissingSizeMessage(review) {
    const quote = review.quote || {};
    const lead = review.lead || {};
    const service = quote.serviceLabel || lead.serviceType || 'cleaning service';
    const name = lead.customerName;
    const attendant = resolveAttendant(quote.company, review, lead, quote);

    const messagesByCompany = {
      dasilva: [
        greeting(name),
        '',
        'Thank you for reaching out to Da Silva Cleaning Services! 😊',
        '',
        `We’d be happy to prepare an accurate estimate for your ${service}. Could you please let us know the number of bedrooms and bathrooms, along with the approximate square footage?`,
        '',
        'If you have a couple of photos of the main areas, feel free to send them over as well.',
        '',
        'Once we have those details, we’ll get your quote ready right away!',
        '',
        ...companySignatureLines('dasilva')
      ],
      utcleans: [
        greeting(name),
        '',
        'Thank you for reaching out to UT Cleans! We’d love to help get your home in great shape. 😊',
        '',
        `To put together an accurate quote for your ${service}, could you let us know the approximate square footage and how many bedrooms and bathrooms you have?`,
        '',
        'Photos of the main areas are always super helpful too if you have them handy!',
        '',
        'Once you share those, we’ll send your quote right over. Let me know if you have any questions!',
        '',
        ...companySignatureLines('utcleans')
      ],
      marys: [
        greeting(name),
        '',
        "Thank you for reaching out to Mary's House Cleaning! ✨",
        '',
        `To ensure we provide the most accurate estimate and give your home the care and attention it deserves for your ${service}, could you please share:`,
        '• Approximate square footage',
        '• Number of bedrooms and bathrooms',
        '',
        'You’re also warmly welcome to send a few photos or a quick walkthrough video of the main areas.',
        '',
        `Once we have these details, ${attendant} will prepare your personalized quote right away!`,
        '',
        ...companySignatureLines('marys')
      ],
      gleam: [
        greeting(name),
        '',
        'Thanks for reaching out to Gleam Team Housecleaning.',
        '',
        `Before I put a quote together for your ${service}, I just need a few details about the home so we're not giving you a number based on guesswork: approximately how many square feet, how many bedrooms and bathrooms, and what type of cleaning you're looking for.`,
        '',
        "If it's easier, you can also send a few pictures or a short walkthrough video. Sometimes that's the easiest way for us to get a good feel for the home.",
        '',
        ...companySignatureLines('gleam')
      ],
      express: [
        greeting(name),
        '',
        'Thank you for reaching out to Express House Cleaning! 👋',
        '',
        `You’re in great hands with our experienced team. To help us calculate an accurate, reliable quote for your ${service}, could you please share:`,
        '• Approximate square footage',
        '• Number of bedrooms and bathrooms',
        '',
        'Feel free to include a couple of photos of the main areas as well so we can account for your home’s layout.',
        '',
        'Once we have these details, we’ll send your customized estimate right over!',
        '',
        ...companySignatureLines('express')
      ]
    };

    const lines = messagesByCompany[quote.company] || [
      greeting(name),
      '',
      'Thank you for reaching out!',
      '',
      `To prepare an accurate estimate for your ${service}, could you please share the approximate square footage and the number of bedrooms and bathrooms?`,
      '',
      ...companySignatureLines(quote.company)
    ];
    return lines.join('\n');
  }
  function gleamQuoteMessage(review) {
    const quote = review.quote || {}; const lead = review.lead || {};
    const minimum = quote.priceRange?.minimum ?? quote.amount;
    const maximum = quote.priceRange?.maximum ?? Number(quote.amount || 0) + 100;
    const price = minimum === maximum ? `$${minimum}` : `$${minimum}–$${maximum}`;
    const name = lead.customerName || 'there';
    const isMove = quote.service === 'move_in' || quote.service === 'move_out';
    const isPost = quote.service === 'post_construction';
    const isFirst = quote.service === 'first_cleaning';
    const message = [`Hi ${name}${isFirst ? '! 😊' : '! '}`.trim(), ''];
    if (isMove) message.push('Thank you so much for reaching out to Gleam Team! We’d love the opportunity to help make your move easier with a detailed Move-In/Move-Out Cleaning.');
    else if (isPost) message.push('Thank you so much for reaching out to Gleam Team! We’d love the opportunity to help make your post-construction project easier with a detailed cleaning.');
    else message.push(`Thank you so much for reaching out to ${isFirst ? 'Gleam Team Housecleaning' : 'Gleam Team'}!`);
    message.push('', `Based on the details you shared about your home, here is what we ${isMove || isPost || isFirst ? 'suggest' : 'recommend'}:`, '', `🧼 ${quote.serviceLabel}${isMove || isPost || isFirst ? ':' : ''}`, ...homeDetails(lead), `💰 Estimated price: ${price}`);
    if ((review.includeEstimatedTime ?? quote.includeEstimatedTime) && quote.estimatedHours) message.push(`⏱️ Estimated time: ${hours(quote.estimatedHours.minimum)}–${hours(quote.estimatedHours.maximum)} hours`);
    message.push('👥 Two-person cleaning team');
    if (/non.?toxic|non.?toxico/i.test(String(lead.cleaningProducts || ''))) message.push('🍃 Non-toxic cleaning products requested');
    if (isMove || (quote.service === 'deep_cleaning' && /oven|refrigerator|fridge/i.test(String(lead.extraServices || '')))) message.push('✨ Oven and refrigerator interior cleaning included');
    if (quote.discount?.percentage) message.push(`✨ ${quote.discount.percentage}% new customer discount applied`);
    if (isMove) message.push('', "For the most accurate quote, we consider the home’s condition, whether it will be empty, and the level of detail needed.");
    else if (isPost) message.push('', "For the most accurate quote, we consider the home’s condition, the amount of construction dust or debris, whether the space is empty, and the level of detail needed.");
    else if (isFirst) message.push('', 'For the most accurate quote, we consider your home’s size, current condition, and cleaning frequency. Final pricing will be confirmed after the first cleaning.');
    else if (quote.service === 'deep_cleaning') message.push('', 'After your initial deep cleaning, we can provide a fixed quote for maintenance cleaning at a lower rate, helping you keep your home consistently clean and comfortable.');
    const recurring = recurringCleaningSection(quote); if (recurring.length) message.push('', ...recurring);
    const limitations = serviceLimitations(lead); if (limitations.length) message.push('', ...separatedParagraphs(limitations));
    const availability = selectedAvailability(review); if (availability.length) message.push('', ...availability);
    const noAvailability = noAvailabilityFollowUp(review); if (noAvailability.length) message.push('', ...noAvailability);
    message.push('', isFirst ? '📋 I’m also attaching a checklist of everything included in our regular cleaning service so you know exactly what to expect.' : 'I am also attaching a checklist of what is included in our cleaning service.', '', `Would you like me to check our availability for your ${isMove ? quote.serviceLabel : isPost ? 'post-construction cleaning' : 'first cleaning'}?`, '', isFirst ? "I’d be happy to help you find a day and a cleaning schedule that works best for you!" : "I’d be happy to help you find a day that works best for you!", '', 'Warmly,', 'Gleam Team Housecleaning', '(925) 515-5461');
    return message.join('\n');
  }

  function fixedPriceMessage(review) {
    const quote = review.quote || {}; const lead = review.lead || {}; const company = fixedPriceCompanies[quote.company];
    if (quote.company === 'gleam') return gleamQuoteMessage(review);
    const minimum = quote.priceRange?.minimum ?? quote.amount;
    const maximum = quote.priceRange?.maximum ?? Number(quote.amount || 0) + 100;
    const price = minimum === maximum ? `$${minimum}` : `$${minimum}–$${maximum}`;
    const showTime = Boolean((review.includeEstimatedTime ?? quote.includeEstimatedTime) && quote.estimatedHours);
    const minHours = showTime ? hours(quote.estimatedHours.minimum) : null;
    const maxHours = showTime ? hours(quote.estimatedHours.maximum) : null;
    const details = homeDetails(lead);
    const message = [greeting(lead.customerName), ''];
    if (quote.company === 'dasilva') {
      message.push(`Thank you for reaching out to ${company.name}! 😊`, '', "Based on your home's size, here's our estimate:", '', `🧼 Recommended Service: ${quote.serviceLabel}`, ...details, `💰 Estimated Price: ${price}`);
      if (showTime) message.push(`⏱️ Estimated Time: Approximately ${minHours}–${maxHours} hours with a team of 2 cleaners.`);
      message.push('', "The final price will depend on the home's current condition and the level of detail required.");
    } else if (quote.company === 'utcleans') {
      message.push(`Thank you for providing your home details. For your home, here is what we suggest:`, '', `🧼 Initial Service: ${quote.serviceLabel}`, ...details, `💲 First Visit Estimate: ${price}`);
      if (showTime) message.push(`⏱️ Estimated time: around ${minHours}–${maxHours} hours with our team of 2 cleaners.`);
      message.push('👥 Dedicated Team: 2 cleaners', '', 'Our first service focuses on creating a fresh baseline throughout your space, allowing future maintenance cleanings to be streamlined, consistent, and budget-friendly.');
    } else if (quote.company === 'marys') {
      const priceLabel = quote.discount?.percentage ? '💲 Special price' : '💲 Estimated price';
      message.push(`Thank you for providing the details about your home. We truly appreciate the information!`, '', `🧼 Recommended service: ${quote.serviceLabel}`, ...details, `${priceLabel}: ${price}`);
      if (showTime) message.push(`⏱️ Estimated time: ${minHours}–${maxHours} hours`);
      message.push('', 'The final price may depend on the overall condition of the home and the level of cleaning required.', '', 'Our first visit is designed to establish a thorough cleaning foundation, making future maintenance cleanings more efficient and consistent.', '', 'Would you like us to check availability for your preferred date?');
    } else {
      message.push('Thank you so much for contacting Express House Cleaning! We truly appreciate your interest in our services.', '', "Based on the information provided, here's our estimate for your home:", '', `🧼 ${quote.serviceLabel}`, ...details, '', `💲 Estimated price: ${price}`);
      if (showTime) message.push(`⏱️ Estimated time: Approximately ${minHours} to ${maxHours} hours`);
      message.push('👥 Team: 2 professional cleaners', '', "The final price will depend on the home's overall condition and the level of detail required.");
    }
    if (quote.discount?.percentage) message.push(`✨ ${quote.discount.percentage}% new customer discount applied`);
    const recurring = recurringCleaningSection(quote);
    if (recurring.length) message.push('', ...recurring);
    const limitations = serviceLimitations(lead); if (limitations.length) message.push('', ...separatedParagraphs(limitations));
    const availability = selectedAvailability(review); if (availability.length) message.push('', ...availability);
    const noAvailability = noAvailabilityFollowUp(review); if (noAvailability.length) message.push('', ...noAvailability);
    message.push('', 'Please let us know if you have any questions or would like to schedule your cleaning. We’d be happy to help! 😊', '');
    if (quote.company === 'marys') message.push('Warm regards,', company.name, `📞 ${company.phone}`);
    else if (quote.company === 'utcleans') message.push('Best regards,', company.name, `📞 ${company.phone}`);
    else message.push(company.name, `📞 ${company.phone}`);
    return message.join('\n');
  }

  function approvedMessage(review) {
    const quote = review.quote || {};
    if (quote.company === 'kacs' && quote.status === 'missing_size') return missingSizeMessage(review);
    if (quote.company === 'kacs' && quote.estimatedHours) {
      return kacsMessage(review);
    }
    if (quote.company === 'jheys' && quote.status === 'missing_size') return jheysMissingSizeMessage(review);
    if (quote.company === 'jheys' && Number.isFinite(quote.amount)) return jheysMessage(review);
    if (fixedPriceCompanies[quote.company] && quote.status === 'missing_size') return fixedPriceMissingSizeMessage(review);
    if (fixedPriceCompanies[quote.company] && Number.isFinite(quote.amount)) return fixedPriceMessage(review);
    return 'This lead needs a manual review before a message can be prepared.';
  }

  function companyContactMeta(company) {
    const meta = {
      kacs: {
        name: 'KACS Cleaning Services LLC',
        shortName: 'KACS Cleaning Services',
        attendant: 'Frank',
        phone: '(925) 438-0657',
        googleLink: 'https://g.co/kgs/df1X25U',
        website: 'www.kacscleaning.com',
        paymentRecipient: 'Juliana dos Santos Paixao',
        venmo: 'https://venmo.com/code?user_id=2802683257815040106 (Last 4 digits: 0949)',
        zelle: '5049200949'
      },
      jheys: {
        name: 'Jhey’s Cleaning',
        shortName: 'Jhey’s Cleaning',
        attendant: 'Frank',
        phone: '(925) 515-5090',
        paymentRecipient: 'Jheyce Souza Barcelo',
        venmo: 'https://venmo.com/u/Jheyce-Barcelo',
        zelle: '925 3174027'
      },
      dasilva: {
        name: 'Da Silva Cleaning Services',
        shortName: 'Da Silva Cleaning Services',
        attendant: 'Andie',
        phone: '(925) 515-3121'
      },
      utcleans: {
        name: 'UT Cleans',
        shortName: 'UT Cleans',
        attendant: 'Andie',
        phone: '(925) 202-0504',
        paymentRecipient: 'Victor Teles Netto',
        venmo: 'https://venmo.com/u/victornetto (Last 4 digits: 0275)',
        zelle: '925-497-0275'
      },
      marys: {
        name: "Mary's House Cleaning",
        shortName: "Mary's House Cleaning",
        attendant: 'Oliver',
        phone: '(925) 905-8387'
      },
      gleam: {
        name: 'Gleam Team Housecleaning',
        shortName: 'Gleam Team',
        attendant: 'Andie',
        phone: '(925) 515-5461'
      },
      express: {
        name: 'Express House Cleaning',
        shortName: 'Express House Cleaning',
        attendant: 'Andie',
        phone: '(510) 757-9573',
        paymentRecipient: 'Marilda Neves',
        venmo: 'https://venmo.com/u/Marilda-Neves',
        zelle: '(415) 724-7516'
      }
    };
    return meta[company] || meta.kacs;
  }

  function quickReplies(company = 'kacs', lead = {}, quote = {}, options = {}) {
    const resolvedCompany = company && company !== 'unknown' ? company : (quote?.company && quote.company !== 'unknown' ? quote.company : 'kacs');
    const meta = companyContactMeta(resolvedCompany);
    const attendant = resolveAttendant(resolvedCompany, options, lead, quote);
    const sig = companySignatureLines(resolvedCompany);
    const name = lead?.customerName || 'there';
    const minPrice = quote?.priceRange?.minimum ?? quote?.amount ?? null;
    const priceDisplay = minPrice !== null ? `$${minPrice}` : '$XXX';
    const serviceLabel = quote?.serviceLabel || lead?.serviceType || 'Cleaning';
    const addressDisplay = lead?.location || '[Service Address]';
    const netCleanerAmount = minPrice !== null ? Math.round(minPrice * 0.7) : 'XXX';
    const cleanerPriceText = resolvedCompany === 'kacs' && quote?.estimatedHours
      ? `${hours(quote.estimatedHours.minimum)}–${hours(quote.estimatedHours.maximum)}h ($100/h equipe)`
      : `$${minPrice ?? 'XXX'}-30%=$${netCleanerAmount}`;
    const homeSummary = [
      lead?.bedrooms ? `${lead.bedrooms}bed` : '?bed',
      lead?.bathrooms ? `${lead.bathrooms}bath` : '?bath',
      lead?.squareFeet ? `${lead.squareFeet}sqft` : null
    ].filter(Boolean).join(' ');
    const byCompany = (variants) => {
      const selected = variants[resolvedCompany];
      if (!selected) {
        throw new Error(`Missing dedicated quick reply variant for company "${resolvedCompany}"`);
      }
      return selected.join('\n');
    };

    const groups = [
      {
        category: 'Explanations & FAQs',
        items: [
          {
            id: 'deep_vs_regular',
            label: 'Deep vs. Regular Cleaning',
            message: byCompany({
              kacs: [
                `Hi ${name}!`,
                '',
                'We’d like to briefly explain the difference between Regular Cleaning and Deep Cleaning, as choosing the right service makes a big difference in the final result.',
                '',
                'Regular Cleaning is a maintenance service. It’s designed for homes that are already being cleaned on a regular basis and focuses on keeping the space tidy, fresh, and well maintained. It does not address heavy buildup, deep grease, or dirt that has accumulated over time.',
                '',
                'Deep Cleaning is a more detailed and thorough service. It’s recommended for first-time cleanings, homes that haven’t been cleaned recently, or when a deeper level of detail is needed. This service focuses on buildup, hard-to-reach areas, and deeper grime, helping to “reset” the home so future maintenance cleanings are effective.',
                '',
                'In short, Regular Cleaning maintains a clean home, while Deep Cleaning restores it. Choosing the right service helps ensure your expectations are met and allows us to deliver the best possible results.',
                '',
                'If you’re unsure which option is best for your home, we’re happy to help guide you.',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name}, since this is a common question, here is a brief overview of the difference between our two main services.`,
                '',
                'Regular Cleaning is designed to maintain a home that is already kept on a consistent schedule. It focuses on upkeep rather than addressing buildup that accumulates over time.',
                '',
                'Deep Cleaning is a more thorough service. It addresses areas that are typically missed in routine visits — baseboards, buildup, and other details that accumulate over weeks or months.',
                '',
                'For homes we have not serviced before, we generally recommend beginning with a Deep Cleaning so that subsequent visits can run on a lighter, more efficient schedule.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! 👋`,
                '',
                'We’d love to quickly share the difference between Regular Cleaning and Deep Cleaning so you can choose the best fit for your home:',
                '',
                '• Regular Cleaning is our maintenance service for homes already on a routine schedule — keeping surfaces, kitchens, bathrooms, and floors fresh and tidy.',
                '• Deep Cleaning is a thorough “reset” for first-time visits or homes that need extra attention on baseboards, buildup, and hard-to-reach spots.',
                '',
                'Starting with a deeper initial clean sets a strong foundation so future recurring visits are faster and more cost-effective. Let us know which option sounds best to you! 😊',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "We'd be happy to explain the difference between our Regular Cleaning and Deep Cleaning services so we can find the best care for your home!",
                '',
                '✨ Regular Cleaning is designed for ongoing maintenance in homes that are already cleaned consistently, focusing on everyday freshness and upkeep.',
                '✨ Deep Cleaning is a more detailed, top-to-bottom service that tackles accumulated dust, baseboards, and deeper buildup — establishing a fresh foundation for your home.',
                '',
                "If this is our first visit to your home, we usually recommend starting with a First or Deep Cleaning so future maintenance visits are as smooth and effective as possible. Let us know if you have any questions! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Happy to explain the difference!`,
                '',
                'Regular cleaning is for ongoing upkeep when a home is already on a routine schedule, while a deep cleaning gives the home a full reset—covering extra details like baseboards and buildup that accumulate over time.',
                '',
                'Let me know which one sounds like the best fit for your home!',
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Happy to break down the difference for you:`,
                '',
                '🧽 Regular Cleaning is all about keeping things fresh when your home is already on a steady routine.',
                '✨ Deep Cleaning is our top-to-bottom reset — we spend extra time on baseboards, buildup, and the spots that don’t get touched during everyday upkeep (using our green, kid-safe, and pet-safe products 🌱).',
                '',
                'If you’re not sure which one your home needs right now, just let me know and we’ll figure it out together! 💛',
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'Here is a quick comparison between our Regular Cleaning and Deep Cleaning services:',
                '',
                '• Regular Cleaning focuses on routine maintenance to keep an already clean home tidy and fresh.',
                '• Deep Cleaning is a more detailed service that addresses accumulated dust, baseboards, and heavier buildup throughout the home.',
                '',
                "For a first visit, we recommend starting with a First or Deep Cleaning to establish a solid baseline. Please let us know if you have any questions — we'd be happy to help.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'why_sqft',
            label: 'Why we ask for Sq. Ft.',
            message: byCompany({
              kacs: [
                `Hi ${name},`,
                '',
                'Regarding the square footage: we ask for the total home sqft because it helps us understand the general size and proportion of the rooms. Two homes can have the same number of bedrooms and bathrooms, but be completely different in size — for example, some 3 bed/2 bath homes are around 1,100 sqft, while others can be 3,000 sqft or more.',
                '',
                'Knowing the approximate size allows us to:',
                '• Estimate how large the rooms likely are',
                '• Understand whether there is a spacious or standard master bathroom',
                '• Determine how much time our cleaners will need',
                '• Provide a fair and accurate quote',
                '• Schedule our team properly so we can be on time and efficient',
                '',
                'This is the only reason we ask for the total sqft — it gives us a basic reference point to ensure our pricing and timing are correct. If you have any other questions, please feel free to ask!',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name},`,
                '',
                'Thank you for asking. We request the approximate square footage because homes with the same number of bedrooms and bathrooms can vary significantly in layout and room dimensions.',
                '',
                'Having an approximate size allows our team to estimate the required service time accurately, prepare a fair investment range, and allocate the right schedule window for your home.',
                '',
                'If you are unsure of the exact number, a rough estimate or a few photos of the main living areas works just as well.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! 👋`,
                '',
                'We ask for the approximate square footage because two homes with the same bedroom and bathroom count can have very different room sizes and layouts.',
                '',
                'Knowing the approximate size helps us estimate the right amount of time for our 2-cleaner team and make sure your quote is as fair and accurate as possible. If you only have a rough estimate, that works great too! 😊',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "That's a great question! We ask for the approximate square footage because homes with the same number of bedrooms and bathrooms can vary quite a bit in overall space.",
                '',
                "Having a general idea of your home's size helps us estimate the cleaning time accurately and prepare the fairest price for your space. 📸 If you're not sure of the exact square footage, no worries at all — a rough estimate or a few photos works wonderfully too! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 We ask for the approximate square footage just because two homes with the same bedrooms and bathrooms can be very different in size.`,
                '',
                'It helps us estimate the time for our 2-cleaner team and give you the most accurate price. An approximate number or a few photos is totally fine if you’re not sure!',
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Good question — we ask for the approximate square footage just because two homes with the same bed/bath count can have totally different layouts and room sizes.`,
                '',
                "It helps us figure out how much time our team will need and keep the quote fair. If you don't know the exact number, no worries at all — a rough guess or a few quick pictures works great!",
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'We ask for the approximate square footage because homes with the same number of bedrooms and bathrooms can differ significantly in total space and time required.',
                '',
                "This detail helps us prepare an accurate estimate and schedule our 2-cleaner team properly. If you don't have the exact square footage, an approximate number is completely fine.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'yelp_masked_phone',
            label: 'Yelp masked phone note',
            message: byCompany({
              kacs: [
                `Just a quick note — when we communicate through Yelp, their policy masks both your number and ours, so the phone number you see may not be our real one — our direct line is ${meta.phone}.`
              ],
              jheys: [
                `Please note that Yelp automatically masks phone numbers for privacy on both ends, so the number displayed on Yelp may differ from our direct line at ${meta.phone}.`
              ],
              express: [
                `Just a quick heads-up — Yelp masks phone numbers on both sides for privacy, so the number shown on Yelp isn’t our direct line. Feel free to call or text our team anytime at 📞 ${meta.phone}!`
              ],
              marys: [
                `Hi ${name}! 😊 Just a friendly note that Yelp masks phone numbers on both ends for privacy, so the number shown there may look different. You can always reach Mary's House Cleaning directly at 📞 ${meta.phone}! ✨`
              ],
              utcleans: [
                `Just a quick note! 😊 Yelp uses a masked forwarding number for privacy, so if you ever want to text or call us directly, our real number is 📞 ${meta.phone}.`
              ],
              gleam: [
                `Quick heads-up — Yelp masks phone numbers on both ends, so the number showing up in the app isn't our actual line. You can reach us directly anytime at 📞 ${meta.phone}!`
              ],
              dasilva: [
                `Please note that Yelp masks phone numbers for both the customer and the business. If you need to reach Da Silva Cleaning Services directly, our phone number is 📞 ${meta.phone}.`
              ]
            })
          },
          {
            id: 'move_out_pitch',
            label: 'Move-Out specialty pitch',
            message: byCompany({
              kacs: [
                'Move-out cleanings are actually one of our specialties. Our team handles these services on a daily basis, and we’re very familiar with all the requirements needed for a successful inspection and key handoff.',
                '',
                'We know exactly what property managers look for, and your checklist matches perfectly with the standards we already follow.',
                '',
                'The only service we do not provide is carpet washing — but everything else on your list (including inside the oven, inside the refrigerator, cabinets and drawers, and reachable interior windows) is fully covered by our team.',
                '',
                'If you’d like, we can also pre-schedule your move-out cleaning. Just let me know the day and time that works best for you!',
                '',
                ...sig
              ],
              jheys: [
                'Move-out cleanings are one of our most requested services, and our team is well acquainted with what these appointments require.',
                '',
                'Our goal is to leave the property ready for inspection, addressing dust, residue, and everyday buildup throughout the home (including inside cabinets, drawers, oven, and refrigerator).',
                '',
                'The only service we do not provide is carpet shampooing; all other items on a standard move-out checklist are fully covered by our team.',
                '',
                'If you would like to reserve your preferred date, please let us know and we will arrange the scheduling.',
                '',
                ...sig
              ],
              express: [
                'Move-in and move-out cleanings are a central part of what we do at Express House Cleaning! ✨ Our experienced crews know exactly what property managers and landlords look for to ensure a seamless inspection and handoff.',
                '',
                'The only service we do not offer is carpet shampooing or washing (we provide thorough vacuuming) — all other items, including inside cabinets, appliances, and detailed surface wiping, are completely covered.',
                '',
                'We take genuine pride in leaving the home spotless and stress-free. Let us know your move date and preferred arrival time so we can reserve your spot!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Move-in and move-out cleanings are one of our specialties at Mary's House Cleaning! Our team is very familiar with what landlords and property managers look for during final inspections.",
                '',
                'We take care of the detailed work throughout the empty home — including inside cabinets and drawers, inside the oven and refrigerator, baseboards, bathrooms, and floors (please note we vacuum carpets but do not offer carpet shampooing).',
                '',
                "If you have a move date in mind, let us know and we'd love to check our availability for you! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Move-out cleanings are one of our most popular services!`,
                '',
                'Our 2-cleaner team covers all the details needed to get the home inspection-ready, including inside cabinets, drawers, oven, fridge, baseboards, and floors (we vacuum carpets, though we don’t do carpet shampooing).',
                '',
                'Let me know what date you have in mind and we can check our schedule for you!',
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Move-in and move-out cleanings are right up our alley. 😊`,
                '',
                'Our team handles empty-home turnovers all the time, so we know how to get everything inspection-ready — including inside the oven, fridge, cabinets, drawers, baseboards, and floors (just a heads-up that we vacuum carpets rather than steam/shampoo them).',
                '',
                'Let me know what date you’re aiming for and I’ll check our schedule! 💛',
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'Move-out cleanings are one of our core services. Our team is experienced with property turnover standards and focuses on leaving the home thoroughly cleaned and ready for inspection — including inside appliances, cabinets, baseboards, bathrooms, and floors (excluding carpet shampooing).',
                '',
                "Please let us know your preferred date and time, and we'll be happy to check our availability for you.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'checklist_intro',
            label: 'Checklist intro',
            message: byCompany({
              kacs: [
                '💡 Here’s a detailed checklist of what’s included in our services.',
                'We’re also happy to accommodate any special requests you may have.'
              ],
              jheys: [
                '💡 Please find below a detailed checklist outlining what is included in our services.',
                'We are also glad to accommodate any specific requests you may have.'
              ],
              express: [
                'You’re in great hands with Express House Cleaning! 💡 Here is our comprehensive cleaning checklist. ✨',
                'If you have any special priorities or customized requests, our team will gladly take care of them for you.'
              ],
              marys: [
                `Hi ${name}! 😊 Here is a detailed overview of what is included in our cleaning service. Please let us know if there are any special areas you'd like us to focus on! ✨`
              ],
              utcleans: [
                'Here’s a quick look at what’s included in our cleaning! 😊 Let me know if there are any specific areas you’d like us to focus on.'
              ],
              gleam: [
                'Here’s our cleaning checklist so you can see everything that’s included! 🌱 Let me know if you want us to add or focus on anything specific.'
              ],
              dasilva: [
                'Here is a checklist of what is included in our cleaning service. Please let us know if you have any specific requests or priority areas.'
              ]
            })
          }
        ]
      },
      {
        category: 'Objections & Lost Leads',
        items: [
          {
            id: 'budget_objection',
            label: 'Price too high / Budget objection',
            message: byCompany({
              kacs: [
                `Hi ${name},`,
                '',
                'Thank you very much for sharing your budget with us. We truly appreciate the opportunity to provide you with an estimate and to explain how we approach our work.',
                '',
                `For a house of this size, the lowest price we would be able to offer is ${priceDisplay}. This reflects not only the time required but also the level of detail and care our team puts into every cleaning. We don’t simply tidy up, but we make sure each area is thoroughly cleaned, sanitized, and left in excellent condition.`,
                '',
                'That said, we always want to be fair and transparent. If you’d like to share some photos of the space, we’d be happy to review them and see if there’s any way we can adjust the estimate.',
                '',
                'Thank you again for considering us, we look forward to your reply!',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name}, thank you for sharing your budget with us — we appreciate the transparency.`,
                '',
                `For a home of this size, ${priceDisplay} represents the most competitive rate we are able to offer. This reflects both the time required and the level of care our team dedicates to every visit.`,
                '',
                'If you are open to it, a few photos of the space would allow us to review whether an adjusted scope could better align with your budget.',
                '',
                'Our priority is to ensure the value you receive matches the investment. Please let us know how you would like to proceed.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! Thanks so much for being open with us about your target budget.`,
                '',
                `For a home with this layout, ${priceDisplay} is our most competitive rate for a comprehensive clean by our professional 2-person crew, ensuring every area meets our high standards.`,
                '',
                'That said, we’d love to help make things work! If you’d like to send a few photos or focus our time on priority areas — like the kitchen, bathrooms, and main living floors — we can gladly customize a scope that fits closer to your budget. 😊',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                'Thank you for being honest with us! We completely understand that finding a cleaning service that fits your budget is important.',
                '',
                "We'd love to see if there's an option that works better for you. Depending on your priorities, we may be able to customize the service by focusing on the areas that need the most attention or adjusting the scope of the cleaning.",
                '',
                'Our goal is to find the best solution for your home and your budget while making sure expectations are clear from the beginning.',
                '',
                "Are there any particular areas you'd like us to prioritize? We'd be happy to discuss the options with you! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `I understand, ${name}! 😊 We want to find an option that works for you. If you’d like, we can talk about adjusting the cleaning scope or focusing on your main priority areas to better fit your budget.`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Totally understand — everyone has a budget they're working with.`,
                '',
                `For the full scope, ${priceDisplay} is the lowest we'd be able to go for a home of this size. However, if you want to send over a few pictures or narrow the focus to specific priority areas (like bathrooms and kitchen), I'm happy to take another look and see how we can adjust it for you!`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                `Thank you for sharing your budget with us. For a full cleaning of a home this size, the lowest estimate we can offer is ${priceDisplay} based on the time required for our 2-cleaner team.`,
                '',
                "If you'd like, we can also look into adjusting the scope of the cleaning to focus on your highest-priority areas, or review a few photos of the home to see what options might work best for you.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'upfront_deposit',
            label: 'Upfront security deposit explanation',
            message: byCompany({
              kacs: [
                `Hi ${name},`,
                '',
                'Thank you so much for taking the time to speak with us and for the conversation we had regarding your move-out cleaning. We truly appreciate your interest in our services.',
                '',
                'We completely understand your concern about paying anything before the service, and we respect your point of view. We would just like to kindly clarify that what we request is not an advance payment — it is a small security deposit, which is fully applied and credited toward the agreed total balance on the day of service.',
                '',
                'Because move-out cleanings require us to reserve a specific time slot, turn away other clients, and send a crew to a vacant property, this deposit is part of our company policy following prior last-minute cancellations.',
                '',
                'That said, please feel completely free and comfortable with whatever decision is best for you. There is absolutely no pressure at all.',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name}, thank you for taking the time to discuss this with us and for considering our services.`,
                '',
                'We fully understand your concern regarding payment prior to service, and we respect your perspective.',
                '',
                'We would like to clarify that this is not an additional charge. The deposit is applied directly toward your final balance on the day of service — it simply represents a portion of the total already agreed upon.',
                '',
                'This policy exists because these appointments reserve a dedicated time slot for our crew, and it was introduced following prior last-minute cancellations.',
                '',
                'That said, please feel free to make whatever decision is most comfortable for you. There is no obligation, and we appreciate the opportunity to have this conversation.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name},`,
                '',
                'Thank you so much for your time and for discussing your move-out cleaning with us! We completely understand your caution about paying anything ahead of time.',
                '',
                'We just want to clarify that our deposit is not an extra fee — it is a small security deposit that goes 100% toward your final balance on the day of the cleaning. Because vacant move-out cleanings reserve a large block of time for our 2-cleaner crew, this policy helps protect the schedule against last-minute cancellations.',
                '',
                'Please feel completely comfortable making whatever choice works best for you — there is no pressure at all!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Thank you so much for sharing your thoughts with us! We completely understand your hesitation about making a deposit before the cleaning takes place.",
                '',
                "We'd just like to reassure you that the deposit isn't an extra charge — it is credited directly toward your agreed total on the day of your service. For vacant move-out cleanings, reserving a dedicated team window requires holding that spot exclusively for your property.",
                '',
                "Of course, we want you to feel 100% comfortable, so there is never any pressure at all! Please let us know if you have any questions. ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Totally understand where you’re coming from regarding the deposit.`,
                '',
                'Just to clarify, it’s not an extra fee—it goes directly toward your final balance at the end of the cleaning. We only ask for it on vacant move-out jobs since we block off a large window for our 2-cleaner team.',
                '',
                'No pressure at all either way! Let me know what you feel comfortable with.',
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Totally understand your concern about paying a deposit upfront.`,
                '',
                'Just so you know, it’s not an extra charge — it gets deducted right from your final total on cleaning day. Since empty move-out cleanings block out a big part of our team’s day, it just helps us lock in the spot.',
                '',
                'No pressure at all though — whatever you feel most comfortable with is completely okay with us!',
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'We completely understand your concern regarding an upfront deposit. Please note that the deposit is not an additional fee — it is credited in full toward your final balance on the day of the cleaning.',
                '',
                'Because move-out cleanings require reserving a dedicated block of time for our team at a vacant property, this policy helps confirm the appointment for both sides. Please feel free to decide whatever works best for you.',
                '',
                ...sig
              ]
            })
          },
          {
            id: 'needs_time',
            label: 'Client needs time to think',
            message: byCompany({
              kacs: [
                `Hi ${name}!`,
                '',
                'No problem at all — please take all the time you need to review the estimate. Whenever you’re ready or if any questions come up about the service, just reach out and we’ll be glad to help!',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name}, thank you for letting us know.`,
                '',
                'Please take all the time you need to review the options. I remain available whenever you are ready to proceed or if any questions arise.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! 😊`,
                '',
                'No problem at all — take your time! Whenever you’re ready to move forward or if you have any questions about the estimate, just send me a message and I’ll be happy to help.',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                'Of course! We completely understand that you may need some time to decide.',
                '',
                "Whenever you're ready or if any questions come up, please feel free to reach out. We'd be happy to help you explore the options and find a cleaning service that works best for your needs.",
                '',
                "Thank you again for considering Mary's House Cleaning. We'll be happy to assist you whenever the time is right!",
                '',
                ...sig
              ],
              utcleans: [
                `Of course, ${name}! 😊 Take your time. If any questions come up, just let me know. We’d be happy to help when you’re ready.`,
                '',
                ...sig
              ],
              gleam: [
                `No rush at all, ${name}! Take your time talking it over. Whenever you're ready or if any questions pop up, just send a message my way! 💛`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "Of course, take all the time you need. Whenever you're ready or if you have any questions about the estimate, just send us a message and we'll be happy to assist.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'found_better_price',
            label: 'Found a lower price elsewhere',
            message: byCompany({
              kacs: [
                `Hi ${name}!`,
                '',
                'Thank you for letting us know. We completely understand that every family has their own budget, and we truly respect that. At KACS Cleaning Services, we take pride in offering reliable, detailed, and high-quality cleaning that brings real value and peace of mind to our clients.',
                '',
                'If you’d ever like to get to know our services better or need support in the future, we’ll be more than happy to assist you again.',
                '',
                '✨ KACS Cleaning Services LLC',
                '📞 (925) 438-0657',
                '🌐 www.kacscleaning.com'
              ],
              jheys: [
                `Hi ${name}, thank you for letting us know. We understand that every household has different priorities, and we fully respect that.`,
                '',
                "At Jhey's Cleaning, we place a strong emphasis on consistency and attention to detail, which is reflected in our pricing.",
                '',
                'Should your needs change in the future, we would be glad to assist you.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}!`,
                '',
                'Thank you for keeping us posted! We completely understand that cost is an essential factor in deciding on home services.',
                '',
                'At Express House Cleaning, our priority is always delivering dependable care and spotless results so you never have to stress about the details.',
                '',
                'You’re always in great hands with our team whenever you need support in the future. Wishing you the very best!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Thank you so much for letting us know! We completely understand that budget is an important part of choosing a service, and we truly appreciate you considering Mary's House Cleaning.",
                '',
                "We wish you all the best with your home cleaning! If you ever need professional cleaning services in the future, we'd love the opportunity to care for your home. ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Thanks for letting us know, ${name}! 😊 We completely understand working within a budget. Wishing you all the best, and feel free to reach out if you ever need UT Cleans in the future!`,
                '',
                ...sig
              ],
              gleam: [
                `Thanks for letting me know, ${name}! Totally understand going with an option that fits your budget best. If you ever need a hand with your home cleaning down the road, we're always here! Take care! 💛`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "Thank you for letting us know. We completely understand choosing the option that best fits your budget. If you ever need professional cleaning services in the future, we'll be happy to help.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'chose_another',
            label: 'Chose another company',
            message: byCompany({
              kacs: [
                `Hi ${name}! Thank you for getting back to us — we truly appreciate you considering KACS Cleaning. We understand that choosing a company to care for your home is an important decision and we fully respect your choice.`,
                '',
                'If you wouldn’t mind sharing, we’d love to know what led you to choose another company — it helps us understand if there’s anything we can improve.',
                '',
                'If in the future you’d like to experience the level of care and excellence we offer, we’d be more than happy to assist you:',
                '🔗 Google Page: https://g.co/kgs/df1X25U',
                '📞 (925) 438-0657',
                '🌐 www.kacscleaning.com',
                '',
                'Wishing you all the best! 💫 KACS Cleaning Team'
              ],
              jheys: [
                `Hi ${name}, thank you for getting back to us and for considering our services.`,
                '',
                'We understand that selecting a company to care for your home is an important decision, and we respect the choice you have made.',
                '',
                "If you don't mind sharing, we would appreciate knowing what led to your decision, as it helps us continue improving.",
                '',
                'Should you wish to explore our services in the future, we would be glad to assist you.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! Thank you for following up with us and for considering Express House Cleaning for your home.`,
                '',
                'We completely respect your decision and want you to have the best experience possible. If you have a quick moment, we’d truly appreciate hearing what tipped the scales toward another option — any insight helps our team continue learning and refining our service.',
                '',
                'Remember that you’re always in great hands here should you ever need us down the road. Wishing you a wonderful, sparkling clean home!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Thank you for letting us know! We completely understand, and we appreciate you considering Mary's House Cleaning for your home.",
                '',
                "If you don't mind sharing, we'd genuinely appreciate knowing what influenced your decision to go with another company. Was it the pricing, availability, services offered, or something else? Your feedback is very valuable to us and helps us better understand our customers' needs and continue improving our service.",
                '',
                "Of course, we wish you the very best with your cleaning service! And if you ever need professional cleaning in the future, please don't hesitate to reach out. ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Thank you for letting us know, ${name}! 😊 We appreciate you considering UT Cleans, and we wish you the best with your home cleaning.`,
                '',
                ...sig
              ],
              gleam: [
                `Thanks so much for letting me know, ${name}! No worries at all — I hope the cleaning goes great. If you ever need us in the future, just send a message our way. Take care! 💛`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "Thank you for letting us know, and we appreciate you considering Da Silva Cleaning Services! Wishing you all the best with your home cleaning, and please feel free to reach out if you ever need us in the future.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'no_longer_needed',
            label: 'No longer needs cleaning',
            message: byCompany({
              kacs: [
                `No problem at all ${name}, thank you for letting us know! 😊`,
                '',
                'If in the future you ever need cleaning services or would like to experience the care and quality of our work, we’d be happy to help! We completely respect your choice, but if you’d like to share what guided your decision, it would help us understand what didn’t work for you so we are able to improve.',
                '',
                '📞 (925) 438-0657',
                '📍 Google us: https://g.co/kgs/df1X25U',
                '🌐 www.kacscleaning.com',
                'Wishing you all the best! 💫',
                'KACS Cleaning Team'
              ],
              jheys: [
                `Thank you for letting us know, ${name}. 😊`,
                '',
                'Should a cleaning need arise in the future, we would be glad to assist.',
                '',
                'If you would like to share any feedback regarding your decision, we would welcome it, as it helps us continue to improve. Wishing you all the best,',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! Thank you for the update — we completely understand that schedules and home projects change.`,
                '',
                'I’ll go ahead and close out your request for now so you don’t receive unnecessary check-ins.',
                '',
                'If you ever need a reliable team to step in down the road, you’re always welcome to reach back out to Express House Cleaning.',
                '',
                'Wishing you the very best with everything ahead!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                'Thank you for letting us know! We completely understand that plans can change, and we appreciate you keeping us informed.',
                '',
                "If you ever need professional cleaning services in the future, Mary's House Cleaning would be happy to assist you.",
                '',
                "If you don't mind sharing, we'd also appreciate any feedback about what influenced your decision. Thank you again for considering us, and we wish you all the best! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `No problem at all, ${name}! 😊 Thanks for letting us know. If your plans change and you ever need a hand with your home cleaning in the future, we’d be happy to help!`,
                '',
                ...sig
              ],
              gleam: [
                `No worries at all, ${name}! Thanks for keeping me posted. Whenever you need a cleaning down the road, just reach out and we'll pick things right back up. Take care!`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "No problem at all — thank you for letting us know! If your plans change and you need cleaning services in the future, simply reach out and we'll be happy to help.",
                '',
                ...sig
              ]
            })
          }
        ]
      },
      {
        category: 'Booking, Payment & Post-Cleaning',
        items: [
          {
            id: 'missed_call',
            label: 'Missed call',
            message: byCompany({
              kacs: [
                `Hi ${name}! This is ${attendant}. Thank you so much for reaching out!`,
                "I've tried returning your call, but it went to voicemail.",
                "Let me know if there's anything I can help you with!",
                `${attendant} - KACS Cleaning Services LLC`
              ],
              jheys: [
                `Hi ${name}, this is ${attendant} with Jhey's Cleaning. I attempted to reach you by phone but wasn't able to connect.`,
                '',
                "I'm glad to continue the conversation here by message if that's more convenient for you.",
                '',
                "Whenever you have a moment, please share a bit about what you're looking for and I'll be happy to assist.",
                '',
                "Jhey's Cleaning",
                '📞 (925) 515-5090'
              ],
              express: [
                `Hi ${name}! This is ${attendant} with Express House Cleaning. 👋`,
                '',
                'I placed a quick follow-up call to connect about your home cleaning, but wasn’t able to catch you.',
                '',
                'No worries at all — you’re welcome to reply right here via text whenever convenient.',
                '',
                'I’m ready to answer any questions, go over details, and make sure your home is in great hands from start to finish.',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊 This is ${attendant} from Mary's House Cleaning.`,
                '',
                "We tried giving you a quick call back, but we weren't able to connect! We're happy to help you right here by message if that's easier for you.",
                '',
                "Whenever you have a moment, let us know how we can help with your home cleaning! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 We tried giving you a quick call back but missed you. Happy to help right here by text if that’s easier—just let me know what you’re looking for!`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! I tried giving you a quick call back and missed you. No worries at all — feel free to text me here whenever you get a chance and let me know how we can help with your cleaning!`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "We tried returning your call earlier but weren't able to reach you. Please feel free to message us here whenever convenient, and we'll be happy to assist with your cleaning request.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'booking_confirmation',
            label: 'Appointment confirmation',
            message: byCompany({
              kacs: [
                `Hi ${name}!`,
                'Your cleaning appointment is confirmed. You’ll receive a text reminder 3 days before the cleaning.',
                'Let me know if you have any questions or if anything changes, I’m here to help!',
                '',
                'Cleaning details:',
                `🧼 ${serviceLabel}`,
                `📍 ${addressDisplay}`,
                '📅 [Date] at [Time]',
                '💲 $50/h per cleaner - team of 2 cleaners - total $100/h.',
                '',
                'Our payment methods are: cash, Zelle or Venmo, feel free to choose what works best for you at the end of the cleaning, thank you!',
                'Here is our info for payment:',
                '✔️ Venmo link: https://venmo.com/code?user_id=2802683257815040106',
                'Last 4 digits are: 0949 -- the name will appear as Juliana dos Santos Paixao.',
                '✔️ Our Zelle: 5049200949 (only numbers) -- the name will appear as KACS Cleaning Services LLC.',
                'Thanks for choosing and trusting KACS Cleaning!'
              ],
              jheys: [
                `Hi ${name},`,
                'Your cleaning appointment is confirmed.',
                'Please let us know if you have any questions or if anything changes.',
                '',
                'Appointment details:',
                `📍 ${addressDisplay}`,
                '⏰ [Date & Time]',
                `💲 Total: ${priceDisplay}`,
                `🧽 Service: ${serviceLabel}`,
                '',
                'Accepted payment methods are cash, Zelle, or Venmo, payable at the end of the service — whichever is most convenient for you.',
                'Payment should be sent to Jheyce Souza Barcelo:',
                '✔️ Venmo: https://venmo.com/u/Jheyce-Barcelo',
                '✔️ Zelle: 925 3174027',
                '',
                'For cancellations or rescheduling outside our office hours (8:30 AM – 4:30 PM), please contact us at 📞 (925) 317-4027.',
                "Thank you for choosing and trusting Jhey's Cleaning."
              ],
              express: [
                `Hi ${name}! 👋`,
                '',
                'Your upcoming visit with Express House Cleaning is officially booked on our calendar!',
                '',
                'Here is a summary of your scheduled appointment:',
                `🧼 Service: ${serviceLabel}`,
                `📍 Address: ${addressDisplay}`,
                '📅 Date & Time: [Date] at [Time]',
                `💲 Estimated total: ${priceDisplay}`,
                '👥 Team: 2 professional cleaners',
                '',
                'If there are any special instructions, gate codes, or priority focus areas for our team, feel free to drop them here anytime before we arrive.',
                '',
                'For your convenience, payment is settled once the cleaning is finished and you have checked our work. We welcome cash, Zelle, or Venmo:',
                '• Zelle: (415) 724-7516 (Marilda Neves)',
                '• Venmo: https://venmo.com/u/Marilda-Neves (Marilda Neves)',
                '',
                'If your plans shift or you need to reschedule at any point, simply give us a call or text at (415) 724-7516 or (510) 757-9573.',
                '',
                "Thank you so much for welcoming Express House Cleaning into your home — we can't wait to make it sparkle! ✨",
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Your cleaning appointment with Mary's House Cleaning is confirmed!",
                '',
                '📅 Date: [Date]',
                '⏰ Time: [Time]',
                `🏠 Service: ${serviceLabel}`,
                `💲 Agreed price: ${priceDisplay}`,
                `📍 Address: ${addressDisplay}`,
                '',
                'Please let us know as soon as possible if anything changes or if there are any important details about your home that we should know before the appointment.',
                '',
                "Thank you for choosing Mary's House Cleaning! We're looking forward to providing your home with the care and attention it deserves. ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 You’re all set for your ${serviceLabel} on [Date] at [Time] at ${addressDisplay}. We look forward to taking care of your home!`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! You're all set for your ${serviceLabel} on [Date] at [Time] at ${addressDisplay} for ${priceDisplay}.`,
                '',
                'If anything changes or if there are any entry notes we should know before our team arrives, just send them my way. Our crew can’t wait to make your home shine! 💛',
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'We have reserved your appointment with Da Silva Cleaning Services on our schedule:',
                `🧼 Service: ${serviceLabel}`,
                `📍 Address: ${addressDisplay}`,
                '📅 Date & Time: [Date] at [Time]',
                `💰 Estimated Price: ${priceDisplay}`,
                '',
                'Please let us know if anything changes or if you have any special instructions for our team.',
                '',
                ...sig
              ]
            })
          },
          {
            id: 'payment_info',
            label: 'Payment info (Zelle / Venmo)',
            message: byCompany({
              kacs: [
                `Hi ${name}! Here is our info for payment - the name will appear as Juliana dos Santos Paixao:`,
                '✔️ Venmo link: https://venmo.com/code?user_id=2802683257815040106',
                'Last 4 digits are: 0949.',
                '✔️ Our Zelle: 5049200949',
                'Thanks for choosing and trusting KACS Cleaning!'
              ],
              jheys: [
                `Hi ${name}, please find our payment details below. The name on file will appear as Jheyce Souza Barcelo:`,
                '✔️ Venmo: https://venmo.com/u/Jheyce-Barcelo',
                '✔️ Zelle: 925 3174027',
                "Thank you for choosing Jhey's Cleaning."
              ],
              express: [
                `Hi ${name}! 👋`,
                '',
                'Here are our payment details for your service with Express House Cleaning.',
                '',
                'We collect payment once the cleaners wrap up and you are completely satisfied with the results.',
                'You can settle the balance using Zelle, Venmo, or cash in person:',
                '',
                '• Zelle: (415) 724-7516 (registered under Marilda Neves)',
                '• Venmo: https://venmo.com/u/Marilda-Neves (account name: Marilda Neves)',
                '',
                'If you have any questions about the invoice or need a receipt sent over, please let me know and I will be glad to assist.',
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Just a quick reminder that payment is due at the end of the cleaning. We accept cash, Zelle, or Venmo—whichever is easiest for you:`,
                '✔️ Zelle: 925-497-0275 (Victor Teles Netto)',
                '✔️ Venmo: https://venmo.com/u/victornetto (Victor Teles Netto — last 4 digits: 0275)',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊 Just a friendly reminder that payment is due upon completion of the cleaning. We accept cash, Zelle, or Venmo — whichever is most convenient for you! ✨`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Just a quick note on payment — it's due once the cleaning is finished, and you can use cash, Zelle, or Venmo, whatever is easiest for you! 💛`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name}, payment is due upon completion of the service. We accept cash, Zelle, or Venmo — whichever option is most convenient for you.`,
                '',
                ...sig
              ]
            })
          },
          {
            id: 'payment_reminder',
            label: 'Unpaid cleaning follow-up',
            message: byCompany({
              kacs: [
                `Good morning, ${name}! I hope you’re doing well.`,
                '',
                'I just wanted to follow up regarding yesterday’s cleaning. At this time, we haven’t yet received the payment confirmation on our end.',
                'When you have a moment, could you kindly forward us the payment receipt for verification?',
                '',
                'And of course, if there’s anything you need from us, please don’t hesitate to let me know — we’re always happy to help.',
                '',
                'Warm regards,',
                `${attendant} – KACS Cleaning Services`
              ],
              jheys: [
                `Good morning ${name}, I hope you are doing well.`,
                '',
                'I am following up regarding your last appointment, as we have not yet received payment confirmation on our end.',
                '',
                'Whenever convenient, could you kindly send over the payment confirmation so we may update our records?',
                "Please don't hesitate to reach out if there is anything you need from us. Thank you very much.",
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! Hope your day is going great.`,
                '',
                'I’m following up on our recent cleaning visit, as we haven’t spotted the payment confirmation in our records yet.',
                '',
                'Whenever you have a free moment, could you please forward the receipt or let us know if you need our Venmo or Zelle details again? We’re always here to assist!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊 We hope you're doing well and enjoying your clean home!`,
                '',
                "We're just checking in regarding your recent cleaning appointment, as we haven't seen the payment confirmation come through on our end yet.",
                '',
                "Whenever you have a quick moment, could you please share the confirmation with us so we can update our records? Let us know if you need any assistance at all! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Hope you’re doing well! I just wanted to quickly check in on the payment for your recent cleaning since we haven’t seen the confirmation come through yet. Let me know if you need our Zelle or Venmo info again!`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Hope your week is going well. Just wanted to check in on the payment for your recent cleaning since we haven't seen it come through on our end yet. Whenever you get a second, could you send over the confirmation? Thanks so much!`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "I hope you're doing well. I just wanted to follow up regarding your recent cleaning service, as we haven't received the payment confirmation on our end yet. Whenever you have a chance, please let us know or send over the confirmation.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'post_cleaning_thanks',
            label: 'Post-cleaning + Review request',
            message: byCompany({
              kacs: [
                `Hi ${name}, the cleaning's finished!`,
                'I just wanted to check in and see how everything went with the cleaning. Did everything meet your expectations? 😊',
                '',
                'If you have any feedback or suggestions, we’d love to hear it! And if you have a moment, we’d truly appreciate a quick review — your feedback means a lot and helps others find and trust our services. 💬✨',
                'Google page link 👉 https://g.co/kgs/df1X25U',
                '',
                'Thank you so much for choosing and trusting us!',
                'Warm regards,',
                `${attendant} - KACS Cleaning Services LLC`
              ],
              jheys: [
                `Hi ${name}, your cleaning has been completed!`,
                'Thank you for having us today, we hope your home looks and feels refreshed.',
                '',
                'If you were satisfied with your experience, we would greatly appreciate a brief review. 💬✨ Your feedback is valuable to our team and helps other homeowners feel confident when choosing a cleaning service.',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! Our cleaning team has just wrapped up at your home. 🧼✨`,
                '',
                'We hope you love walking into a refreshed, spotless space! Providing reliable service and the quality you count on is our highest priority.',
                '',
                'If you have a quick moment, sharing a brief review would mean the world to our crew — it helps other local homeowners know they’re in great hands with Express House Cleaning.',
                '',
                'Thank you for welcoming our team into your home today!',
                '',
                'Warm regards,',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "Thank you for choosing Mary's House Cleaning! We truly appreciate the opportunity to take care of your home.",
                '',
                "We hope you're happy with the results and are enjoying your fresh, clean space! ✨ If you have any feedback or a moment to share a review of your experience, it means the world to our team.",
                '',
                'Thank you again for trusting us with your home!',
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Thank you for choosing UT Cleans and trusting us with your home! We hope you’re happy with the cleaning and that your home feels fresh and clean.`,
                '',
                'If you’re happy with the service, we’d really appreciate it if you could leave us a quick review—your feedback helps other homeowners find us and means a lot to our team!',
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Your cleaning is all wrapped up — we hope your home feels super fresh and clean! 🌱`,
                '',
                'If everything looked great and you have a quick minute to leave us a review, it helps our team out a ton. And if there’s any feedback you want to share, just send it my way! 💛',
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                'Your cleaning has been completed! We hope everything met your expectations and that you are enjoying your clean home.',
                '',
                'If you have a moment to share your feedback or leave us a review, we would greatly appreciate it. Thank you for choosing Da Silva Cleaning Services!',
                '',
                ...sig
              ]
            })
          },
          {
            id: 'recurring_offer',
            label: 'Recurring maintenance offer',
            message: byCompany({
              kacs: [
                `Hi ${name}!`,
                'We hope you enjoyed your cleaning!',
                '',
                'Now that your initial cleaning has been completed, future visits can be scheduled as Regular Cleaning (🏡 Weekly, 🏡 Biweekly, or 🏡 Monthly), which generally requires less time and comes with a lower maintenance rate.',
                '',
                'Just let us know which frequency works best for you, and we’ll be happy to send you the available options for your next visit!',
                '',
                ...sig
              ],
              jheys: [
                `Hi ${name}, I hope you are doing well.`,
                '',
                'Now that we have established a thorough cleaning foundation for your home, I wanted to check whether you would like to set up a recurring maintenance schedule (bi-weekly or monthly) at our lower regular rate.',
                '',
                'We are happy to keep the same weekday or adjust to whatever works best for your schedule. Please let us know your preference!',
                '',
                ...sig
              ],
              express: [
                `Hi ${name}! 😊`,
                '',
                'If you’d like, we can go ahead and set up your regular maintenance — either keeping the same weekday or adjusting to whatever works best for you (bi-weekly or monthly at our lower maintenance rate).',
                '',
                'Just let me know what you prefer!',
                '',
                ...sig
              ],
              marys: [
                `Hi ${name}! 😊`,
                '',
                "We hope you're enjoying your freshly cleaned home!",
                '',
                'If you’d like to keep your home consistently clean, we also offer recurring cleaning services on a bi-weekly or monthly basis. Regular cleanings help maintain the results of your first visit and make it easier to keep up with everyday cleaning needs.',
                '',
                "If you're interested, we'd be happy to discuss the options and help you find a schedule that works best for you! ✨",
                '',
                ...sig
              ],
              utcleans: [
                `Hi ${name}! 😊 Hope you’re enjoying your clean home! If you’d like to keep things fresh on a regular schedule, we can set up bi-weekly or monthly maintenance visits at a lower recurring rate. Just let me know if you’d like to set that up!`,
                '',
                ...sig
              ],
              gleam: [
                `Hi ${name}! Hope you're loving how the house feels! 😊 If you'd like to keep it up on a regular rhythm, we can set you up on a bi-weekly or monthly schedule at our recurring rate. Just let me know what works best for you! 💛`,
                '',
                ...sig
              ],
              dasilva: [
                `Hi ${name},`,
                '',
                "We hope you're enjoying your clean home! Now that the first cleaning is complete, we can set up a recurring schedule (every 2 weeks or every 4 weeks) at our lower maintenance rate. Let us know if you'd like to schedule your next visit.",
                '',
                ...sig
              ]
            })
          },
          {
            id: 'cleaner_job_offer',
            label: 'Ofertar Job p/ Cleaner (PT-BR)',
            message: byCompany({
              kacs: [
                `Oi [NOME DO CLEANER], temos um job da KACS: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, solicita uma ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Preferência de horário: dia XXX e hora XXX. Você teria disponibilidade para assumir com a equipe?'
              ],
              jheys: [
                `Olá [NOME DO CLEANER]! Novo atendimento pela Jhey’s Cleaning: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, quer agendar ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Janela solicitada: dia XXX às XXX. Por favor confirme se você tem disponibilidade para este agendamento.'
              ],
              dasilva: [
                `Oi [NOME DO CLEANER], tudo bem? Job novo pela Da Silva Cleaning: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, precisa de ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Data e horário solicitados: dia XXX às XXX. Você consegue pegar esse atendimento?'
              ],
              utcleans: [
                `Olá [NOME DO CLEANER]! Proposta de atendimento UT Cleans: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, pediu ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Previsão de atendimento: dia XXX às XXX. Me avisa se você tem disponibilidade para essa data!'
              ],
              marys: [
                `Olá [NOME DO CLEANER], tudo bem? Temos uma faxina pela Mary's House Cleaning: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, solicitou ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Preferência informada: dia XXX no horário XXX. Você tem interesse e agenda livre para esse atendimento?'
              ],
              gleam: [
                `Oi [NOME DO CLEANER]! Chamado da Gleam Team: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, agendando ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Horário desejado: dia XXX às XXX. Gostaria de assumir esse serviço?'
              ],
              express: [
                `Olá [NOME DO CLEANER], oportunidade de serviço pela Express House Cleaning: o cliente ${lead?.customerName || 'XXXXX'}, ${homeSummary}, ${cleanerPriceText}, precisa de ${serviceLabel}.`,
                `Localidade: ${lead?.location || '[Cidade/ZIP]'}`,
                'Horário indicado pelo cliente: dia XXX às XXX. Você pode confirmar sua disponibilidade?'
              ]
            })
          }
        ]
      }
    ];
    if (resolvedCompany === 'gleam') {
      const signedGleam = (lines) => [...lines, '', ...sig].join('\n');
      const replacements = {
        missed_call: [`Hi ${name}, this is ${attendant} with Gleam Team Housecleaning! I just tried giving you a call but wasn't able to catch you.`, '', "Whenever you have a moment, tell me a little about the home you'd like cleaned and I'll be happy to help with the next steps."],
        deep_vs_regular: [`Hi ${name}! The difference between Deep and Regular Cleaning can be a little confusing, so here's the easiest way to look at it.`, '', "Regular Cleaning is for keeping a home that's already in a routine looking good. It takes care of the normal dust and dirt that comes with everyday life, but it's not meant to catch up on months of buildup.", '', 'Deep Cleaning goes further. It gets into things like baseboards, buildup behind and under things, areas that tend to get missed, and dirt that has had more time to settle in.', '', 'So, in simple terms: Regular maintains. Deep gets things caught up.', '', "If we haven't cleaned the home before and it's been a while since the last thorough cleaning, we'd recommend starting with a Deep Cleaning."],
        why_sqft: ['The square footage helps us get the quote right.', '', 'Two homes can have the same number of bedrooms and bathrooms but be very different in overall size, so knowing the approximate square footage helps us estimate the time the crew will need, price the job fairly and make sure we leave enough time in the schedule.', '', 'We only use it for those purposes.'],
        yelp_masked_phone: ['The number showing through Yelp is a number the platform uses for communication between customers and businesses. Our actual business number is (925) 515-5461.'],
        move_out_pitch: ['Move-out cleanings are actually a big part of what we do, so our crews are very familiar with getting a home ready for a landlord or property manager walkthrough.', '', 'We go through the home looking at the dust, residue and buildup that tends to collect over the course of a lease, with the goal of leaving the property ready for inspection.', '', "The one thing we don't handle is carpet shampooing. Everything else you'd normally expect on a move-out checklist is within our scope.", '', "If you already know your move-out date, send it my way and I'll check what we have available."],
        checklist_intro: ["Here's the full breakdown of what's included in a standard cleaning, room by room.", '', "Take a look when you have a chance. If there's something specific you'd like us to add that isn't listed, just let me know and I'll check what we can do."],
        budget_objection: [`Thanks for being upfront with me about your budget, ${name}. I completely understand wanting to stay within a certain number.`, '', `For a home this size, ${priceDisplay} is where our pricing lands based on the time and work involved, so unfortunately there's not much room to move the price itself.`, '', "But if you'd like, send me a few pictures of the spaces and I can take another look at the scope. We can see whether there's a way to adjust what's included and get closer to what you had in mind."],
        upfront_deposit: [`Thanks for bringing that up, ${name}. It's completely fair to want to understand how the deposit works before committing.`, '', "The deposit isn't an extra charge on top of the cleaning. Whatever you pay upfront comes directly off the balance due on the day of the cleaning.", '', 'For move-outs, we ask for it because once we reserve a crew for a vacant property, that time is taken off the schedule for someone else. We started doing this after a few last-minute cancellations left our crews with an open slot and no job.', '', "Of course, whatever you decide is completely okay. There's no pressure — I just wanted to make sure you had the full picture."],
        found_better_price: [`Thanks for letting us know, ${name}. I completely understand — there are quite a few cleaning companies out there and prices can vary.`, '', "We appreciate you giving Gleam Team Housecleaning a look. If things change down the road, just reach out. We'd be happy to hear from you."],
        chose_another: [`Thanks for letting us know, ${name}, and thanks for giving Gleam Team Housecleaning a chance.`, '', "We completely understand. Choosing someone to come into your home is a personal decision, especially when it's someone you'll be trusting with your space.", '', "If you're comfortable sharing what made the difference for you, we'd genuinely appreciate the feedback. It helps us learn what matters most to the families we work with.", '', "And if you ever need us down the road, we're still here."],
        no_longer_needed: [`Hi ${name}, thanks for letting me know!`, '', "No worries at all. If a cleaning need comes up later, just reach out and we'll be here.", '', "And if there's a particular reason you decided not to move forward that you're comfortable sharing, we'd always appreciate the feedback.", '', "Whenever you need us, we'd be glad to help."],
        recurring_offer: [`Hi ${name}! Hope you've been doing well.`, '', "I wanted to check whether you'd like to get your next cleaning on the calendar. We can keep the same day as before, or change it around if your schedule has shifted.", '', 'Just let me know what works best for you.'],
        payment_reminder: [`Hi ${name}! Just following up on the cleaning from earlier.`, '', 'It looks like we still have the payment showing as outstanding on our end. Whenever you get a chance, please send over the payment or confirmation.', '', "If something came up or there's an issue on your end, just let me know."],
        post_cleaning_thanks: [`Hi ${name}! The crew has wrapped up and your home is all set.`, '', 'We hope you walk in and feel like everything is just the way you wanted it.', '', "And if there's anything you'd like us to know — whether something stood out in a good way or there's something we could have done better — please tell us. We really do appreciate the feedback."],
        booking_confirmation: [`Hi ${name}! You're all set for your upcoming cleaning.`, '', "We'll send you a reminder the day before. If anything comes up before then or you need to make a change, just let us know.", '', "Here's what we have:", `📍 ${addressDisplay}`, '⏰ [DATE AND TIME]', `💲 ${priceDisplay}`, `🧽 ${serviceLabel}`, '', 'We accept Zelle or Venmo. Payment is due at the end of the service, whichever is easier for you.', '', 'Payment details:', '✔️ Venmo: https://venmo.com/u/hiltonmoura', '✔️ Zelle: 650 2801111 (numbers only) — the name should appear as HILTON SEIXAS MOURA.', '', 'If you need to reschedule or cancel outside office hours (8:30 AM – 4:30 PM), you can text (650) 280-1111 directly.', '', 'See you soon!'],
        payment_info: ['Of course! Here are the payment details separately:', '', '✔️ Venmo: https://venmo.com/u/hiltonmoura', '✔️ Zelle: 650 2801111 (numbers only) — the name should appear as HILTON SEIXAS MOURA.']
      };
      for (const group of groups) for (const item of group.items) if (replacements[item.id]) item.message = signedGleam(replacements[item.id]);
      const jobOffer = groups.flatMap((group) => group.items).find((item) => item.id === 'cleaner_job_offer');
      if (jobOffer) jobOffer.message = [`Oi [NOME DO CLEANER]! Surgiu um job:`, '', `Cliente: ${lead?.customerName || 'XXXXX'}`, homeSummary, `Serviço: ${serviceLabel}`, `Valor: ${priceDisplay}`, `Líquido após 30%: $${netCleanerAmount}`, `Endereço: ${addressDisplay}`, 'Data/horário sugerido: [DATA/HORÁRIO]', '', 'Consegue cobrir?'].join('\n');
      groups[0].items.push(...[
        { id: 'gleam_home_details', label: 'Request home details', message: signedGleam([`Hi ${name}! Thanks for reaching out to Gleam Team Housecleaning.`, '', "Before I put a quote together, I just need a few details about the home so we're not giving you a number based on guesswork: approximately how many square feet, how many bedrooms and bathrooms, and what type of cleaning you're looking for.", '', "If it's easier, you can also send a few pictures or a short walkthrough video. Sometimes that's the easiest way for us to get a good feel for the home."]) },
        { id: 'gleam_carpet_upholstery', label: 'Carpet, rug or sofa', message: signedGleam(["Just one thing I want to clarify before we move forward: we do vacuum carpets, but we don't offer carpet shampooing or deep extraction.", '', "The same goes for upholstery and area rugs — those services aren't something our team currently provides.", '', 'I just wanted to mention it upfront so there are no surprises later. Let me know if that changes anything for you.']) },
        { id: 'gleam_pending_details', label: 'Photos or information pending', message: signedGleam([`Hi ${name}! Just wanted to check if you're still interested in getting a cleaning quote from us.`, '', "We're happy to put one together. We just need the few details we asked for, or a couple of pictures/short video of the home, so we can get a better idea of the work involved.", '', "Whenever you're ready, send them over and we'll take it from there."]) },
        { id: 'gleam_review_request', label: 'Review request', message: signedGleam([`Hi ${name}! If you were happy with the cleaning, we'd really appreciate a review when you have a moment.`, '', "We're a small family business, and honest reviews make a big difference for us when new families are deciding who to trust with their home.", '', 'Link: [insert review link]', '', 'Thank you again for choosing us!']) },
        { id: 'gleam_cancellation', label: 'Appointment cancelled', message: signedGleam(['APPOINTMENT CANCELLED', '', `👥 ${lead?.customerName || '[CLIENT]'}`, `🧼 ${serviceLabel}`, `📍 ${addressDisplay}`, '📅 [DATE]', '', 'Cancelled per your request. Reason noted: [REASON].', '', "Whenever you're ready to get back on the schedule, just reach out."]) },
        { id: 'gleam_nextdoor', label: 'Nextdoor comment', message: signedGleam([`Hi ${name}! If you're still looking around for a cleaning service, we'd love for you to keep Gleam Team Housecleaning in mind.`, '', "We're a small family business and work with families, pets and busy households every week. We handle deep cleanings, move-in/move-out, recurring cleanings, post-construction and more.", '', 'Estimates are always free. You can reach us at (925) 515-5461.']) },
        { id: 'gleam_scope', label: 'Detail-oriented client: scope', message: signedGleam(["A few things I like to mention upfront, just so we're all on the same page before the cleaning:", '', "• We don't wash or fold laundry", "• Dishes aren't part of a standard cleaning", "• Organizing closets, drawers or general clutter isn't included", "• Anything outside the checklist we've shared isn't automatically included", '', "When the crew arrives, they'll do a quick walkthrough to make sure the home matches what we discussed.", '', "If anything looks different from the original scope, we'll talk with you about it before starting rather than surprising you afterward."]) },
        { id: 'gleam_move_difference', label: 'Move-in vs. Move-out', message: signedGleam(["The cleaning itself is essentially the same. What usually changes is the condition of the home.", '', "With a move-out, there's often more buildup from the time the property was occupied. With a move-in, the home has usually already gone through a move-out cleaning before the new keys are handed over, so it tends to be in better shape and takes less time."]) }
      ]);
    }
    return groups;
  }

  function quickReplyMessage(id, company, lead, quote, options) {
    const groups = quickReplies(company, lead, quote, options);
    for (const group of groups) {
      const found = group.items.find((item) => item.id === id);
      if (found) return found.message;
    }
    return null;
  }

  global.CleaningQuoteMessages = { VA_NAMES, resolveAttendant, approvedMessage, archivingMessage, detailsRequestMessage, followUpStatus, quickReplies, quickReplyMessage };
  if (typeof module !== 'undefined') module.exports = global.CleaningQuoteMessages;
})(globalThis);
