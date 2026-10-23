# CAC requirements, example-video review and research mapping

## Review scope

Official rules and official winner descriptions were retrieved. YouTube metadata and full available transcripts were retrieved for two 2025 entries. **No full video file was downloaded or visually watched in this environment.** The observations below concern transcripts, not camera work, editing quality or verified screen footage. Links are supplied so the student can watch the originals. Do not copy their footage or testimonials into this entry.

## Official 2026 requirements

https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf

The demonstration is 1–3 minutes, public on YouTube or Vimeo. Include participant names, app name, a one-sentence purpose, target audience, tools/coding languages and working functionality. The rules describe this as not a video-creation competition. The criteria include idea quality, implementation/user experience and demonstrated programming skills.

**Our response:** purpose in the opening; concrete feature map; actual game interaction; JavaScript and Swift explicitly named; a specific Bluetooth programming difficulty and solution; realistic next steps. No market sizing, fundraising ask, invented testimonials or unsupported clinical claims. Keep the deck as a visual aid, not a substitute for demonstrating the running app.

## Example 1: Care Path — 2025 KY-02 overall second place

Official placement and summary: https://guthrie.house.gov/news/documentsingle.aspx?DocumentID=390863

Video: https://www.youtube.com/watch?v=AUX9_xyljwM
Retrieved metadata: public, 3:00. Transcript reviewed.

The transcript moves from family information overload to concrete steps: create an account, add an appointment, document a daily check-in, and find resources. It explicitly mentions code.org and JavaScript. It includes other speakers' perspectives.

**Adapt:** explain a recognizable task and narrate what changes after a click. **Do not assume:** that CareSphere has accounts, remote care-circle sharing, clinician messaging, or similar testimonials. Its care notes are local. Do not fabricate an interview or user validation.

## Example 2: Knowledge Knockout — 2025 KY-02 overall fourth place

Official placement and summary: same House announcement above.

Video: https://www.youtube.com/watch?v=87OMof2xB8I
Retrieved metadata: public, 2:49. Transcript reviewed.

The transcript explains the actual game loop: select a level, move, answer math questions, retry after mistakes, reach an end screen. It distinguishes a proposed literacy extension from the present game.

**Adapt:** explain the rules and show a genuine attempt, not just a screenshot caption saying “games.” In CareSphere, show watch → repeat in Pattern Recall, reveal → compare in Picture Pairs, and stop → resume for sensory tools. **Do not copy:** their score/time mechanics; CareSphere's activities are intentionally unscored and untimed. Keep plans visibly separate from implemented features.

## Research → implementation → boundary

1. **Raymaker et al. (2019), AASPIRE Web Accessibility Guidelines for Autistic Web Users.**
   https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/
   Co-designed accessibility guidance informs predictable navigation, user control, palette/contrast choices and reduced distraction. This is design guidance, not a clinical trial of CareSphere. The deck uses the lead author Raymaker (the repo's earlier notes listed co-author Nicolaidis).
2. **Alahmari et al. (2023), computer-based games and cognitive impairments in children with autism, systematic review.**
   https://pmc.ncbi.nlm.nih.gov/articles/PMC9809031/
   Referenced in `docs/activities-and-accessibility.md`; studies and interventions vary. Motivates investigating optional game-based experiences, not claiming these four games improve memory or treat autism.
3. **Liu et al. (2025), gamified digital health interventions for autistic children/adolescents, systematic review/meta-analysis.**
   https://pmc.ncbi.nlm.nih.gov/articles/PMC12781649/
   Referenced in the repository design notes, which record promising results in some outcomes alongside bias concerns. No generalization to this app, to adults, or to dementia is warranted.

**Research limitation:** the AASPIRE article and repo research notes were inspected; the game-review summaries here rely on those repository notes rather than a fresh full-text appraisal of every trial. No CareSphere efficacy study or outcome dataset exists in this kit.

**Actual code mapping:** `src/App.jsx` implements Feelings Explorer, Pattern Recall, Picture Pairs, Picture Story, four Web Audio soundscapes and the 4–4–6 breathing cycle. Pattern Recall requires user-led continuation and allows replay/stop. Feelings has no correct response. Settings expose text, appearance, contrast and reduced-motion choices. None of these constitutes validated therapy, screening or cognitive assessment.

## Why the deck changed

- Features now precede privacy and technology.
- Games receive a whole slide naming the action, not only a screenshot of the Activities tab.
- Sensory tools and research each receive their own slide.
- Old population statistics and repeated positioning slides give way to understandable functionality.
- A matching 2:55 script replaces the old investor-like narration; 40 seconds are reserved for real interaction.
- Navy/mint palette, typography, editorial cards, transitions and real screenshots are retained.
