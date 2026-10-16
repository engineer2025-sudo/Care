export const CARE_BASICS = [
  {
    title: 'Keep a reliable medication list',
    excerpt: 'Keep an up-to-date list of medicines, supplements, strengths, and the clinician who prescribed them. Check the current package label and confirm questions with a pharmacist or prescriber. CareSphere records a schedule you enter; it cannot verify a prescription, check interactions, or decide whether a dose should be changed.',
    publisher: 'CareSphere safety note · MedlinePlus',
    url: 'https://medlineplus.gov/medicinesafety.html',
  },
  {
    title: 'Make the home easier to move through',
    excerpt: 'Reduce common trip hazards, keep walkways and frequently used items clear, and make lighting easy to reach. A clinician can help review personal balance, vision, and medication concerns. These general ideas do not replace an individual fall-risk assessment.',
    publisher: 'CareSphere safety note · CDC',
    url: 'https://www.cdc.gov/falls/prevention/index.html',
  },
  {
    title: 'Make support sensory-aware and respectful',
    excerpt: 'Ask the person what communication and sensory supports work for them. Offer advance notice of changes, a quieter option, and genuine choices when possible. Avoid assuming one strategy works for every autistic person; follow the person\'s preferences and care team\'s guidance.',
    publisher: 'CareSphere safety note · NIMH',
    url: 'https://www.nimh.nih.gov/health/topics/autism-spectrum-disorders-asd',
  },
  {
    title: 'Record health readings with context',
    excerpt: 'When documenting a measurement, include the date, time, device or source, and any context the care team requested. A single reading or wearable signal is not a diagnosis. Ask a clinician how a specific value should be interpreted for the individual.',
    publisher: 'CareSphere safety note · MedlinePlus',
    url: 'https://medlineplus.gov/ency/article/007490.htm',
  },
  {
    title: 'Urgent symptoms need human help',
    excerpt: 'This offline assistant cannot assess emergencies. For immediate danger or severe, rapidly worsening symptoms, contact local emergency services now. In the United States, call 911. Do not wait for an AI response.',
    publisher: 'CareSphere safety note',
    url: 'https://www.usa.gov/911',
  },
];

export function searchHealthReferences(query, corpus = CARE_BASICS, limit = 5) {
  const terms = query.toLowerCase().split(/\s+/).map(t => t.trim()).filter(t => t.length >= 2);
  if (!terms.length) return [];
  return corpus
    .map(entry => {
      const haystack = `${entry.title} ${entry.excerpt} ${entry.publisher}`.toLowerCase();
      return { entry, hits: terms.filter(t => haystack.includes(t)).length };
    })
    .filter(r => r.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(r => r.entry);
}
