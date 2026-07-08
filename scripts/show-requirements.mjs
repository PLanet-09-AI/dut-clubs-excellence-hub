console.log('\n' + '='.repeat(100));
console.log('📋 ENTREPRENEUR CATEGORY - FORM REQUIREMENTS VS YONWABA\'S SUBMISSION');
console.log('='.repeat(100) + '\n');

const requirements = {
  'ent-1': {
    section: 'Originality & Value',
    prompt: 'Describe how the entrepreneurial endeavour is original, unique and relevant.',
    evidence: [
      '(e0) Product / service brochures',
      '(e1) Photos / videos of product in use',
      '(e2) Customer testimonials',
      '(e3) Patents / trademarks if any'
    ]
  },
  'ent-2': {
    section: 'Vision & Leadership',
    prompt: 'What is your long-term vision and how have you demonstrated leadership?',
    evidence: [
      '(e0) Viability & sustainability report',
      '(e1) Team testimonials',
      '(e2) Incubation report',
      '(e3) Records of goals & achievements'
    ]
  },
  'ent-3': {
    section: 'Personal Journey',
    prompt: 'Reflect on your entrepreneurial journey — challenges faced and personal growth.',
    evidence: [
      '(e0) Reflective essay'
    ]
  },
  'ent-4': {
    section: 'Team & Resource Management',
    prompt: 'How do you manage your team or resources to ensure productivity?',
    evidence: [
      '(e0) Job descriptions / task allocation',
      '(e1) Meeting minutes',
      '(e2) Workflow / resource tracking',
      '(e3) Project plans'
    ]
  },
  'ent-5': {
    section: 'Social Responsibility',
    prompt: 'How does your project contribute to social responsibility or the DUT community?',
    evidence: [
      '(e0) Narrative reports (with photos & registers)',
      '(e1) Beneficiary testimonials',
      '(e2) Letters of collaboration'
    ]
  }
};

const yonwabaHas = {
  'ent-1': ['e0 (3 files)', 'e1 (2 files)', 'e2 (1 file)', 'e3 (1 file)'],
  'ent-2': ['e1 (1 file - SharePoint link)'],
  'ent-3': ['e0 (1 file)'],
  'ent-4': ['e1 (1 file)'],
  'ent-5': ['e2 (1 file)']
};

for (const [qid, req] of Object.entries(requirements)) {
  const has = yonwabaHas[qid] || [];
  console.log(`\n${qid} - ${req.section.toUpperCase()}`);
  console.log(`${'─'.repeat(100)}`);
  
  console.log(`\nRequired evidence slots:`);
  for (const ev of req.evidence) {
    console.log(`  ${ev}`);
  }
  
  console.log(`\nYonwaba has:`);
  if (has.length === 0) {
    console.log(`  ❌ NOTHING`);
  } else {
    for (const h of has) {
      console.log(`  ✅ ${h}`);
    }
  }
}

console.log('\n' + '='.repeat(100));
console.log('\n📊 SUMMARY:\n');
console.log('  Required by form:  UP TO 16 evidence items (4+4+1+4+3)');
console.log('  Yonwaba submitted: 11 files\n');
console.log('  Category ALLOWS flexible submission - not all slots required.');
console.log('  However, Simiso Nzuza (the other nominee) submitted 21 files.\n');
console.log('='.repeat(100) + '\n');
