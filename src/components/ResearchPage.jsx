import React from 'react';
import { tr } from '../lib/i18n';

const studies = [
  {
    title: 'Serious games for social skills in autistic children and adolescents (2024)',
    description: 'Nine studies reported a positive result in at least one social-skill outcome, but the review found substantial risk of bias, varied interventions, and a small evidence base. The evidence concerns studied programs for children and adolescents, not CareSphere or adults.',
    href: 'https://doi.org/10.3390/healthcare12050508',
  },
  {
    title: 'Digital cognitive interventions for MCI and dementia (2020)',
    description: 'This review described 19 studies and 11 programs for adults over 60 with mild cognitive impairment or dementia. It distinguishes stimulation, training, and individualized rehabilitation; programs and evidence differed, and more clinical research was needed. Standalone app activities are not equivalent to structured therapist-led programs.',
    href: 'https://doi.org/10.3389/fpsyg.2020.00648',
  },
];

export default function ResearchPage({ onBack }) {
  return <main className="space-y-6" aria-labelledby="research-page-title">
    <button className="library-secondary" onClick={onBack}>{tr('Back to activities')}</button>
    <header className="library-intro">
      <div><p className="eyebrow">{tr('RESEARCH, PLAINLY')}</p><h1 id="research-page-title" className="text-2xl font-bold text-white">{tr('Research & how CareSphere works')}</h1>
        <p className="text-slate-300 mt-2">{tr('What two reviews say, what CareSphere borrows, and what it does not claim.')}</p></div>
    </header>
    <section className="library-tile space-y-3">
      <h2 className="text-xl font-bold text-white">{tr('What the research says')}</h2>
      {studies.map((study) => <article key={study.href} className="care-note-item">
        <h3 className="font-bold text-white">{tr(study.title)}</h3><p className="text-slate-300">{tr(study.description)}</p>
        <a className="library-secondary inline-flex" href={study.href} target="_blank" rel="noreferrer">{tr('Read the open-access systematic review')}</a>
      </article>)}
    </section>
    <section className="library-tile space-y-3">
      <h2 className="text-xl font-bold text-white">{tr('How CareSphere applies this')}</h2>
      <p className="text-slate-200">{tr('Social moment cards are optional everyday scenarios with several reasonable responses. Choose, discuss another option, or skip. There is no right-answer score; no response is saved or sent to a server.')}</p>
      <p className="text-slate-200">{tr('Familiar steps, optional hints, fewer choices, and clear stop controls support choice and predictability. Activities run offline. Favorites stay on this device.')}</p>
      <p className="text-slate-200">{tr('The activity does not ask for eye contact or expression imitation. Speaking, pointing, reading, or skipping are equally welcome.')}</p>
    </section>
    <section className="library-tile space-y-3">
      <h2 className="text-xl font-bold text-white">{tr('How the app works')}</h2>
      <p className="text-slate-200">{tr('CareSphere activities run on this device. Choose an activity, go at your own pace, and leave whenever you want. Activity answers and scores are not collected. Other features request permissions separately only when you choose them.')}</p>
      <p className="text-sm text-amber-100">{tr('Evidence boundary: CareSphere activities have not been clinically tested and do not diagnose, prevent, slow, or treat dementia or autism. Use them for optional enjoyment or conversation, not therapy or assessment.')}</p>
    </section>
    <section className="library-tile space-y-3">
      <h2 className="text-xl font-bold text-white">{tr('Sources you shared')}</h2>
      <p className="text-slate-300">{tr('The Google Scholar Labs links require sign-in and did not expose their result lists. They are links only; their contents have not been summarized or treated as verified evidence.')}</p>
      <a className="library-secondary inline-flex" href="https://scholar.google.com/scholar_labs/search/session/8600305665779058312?hl=en" target="_blank" rel="noreferrer">{tr('Open Google Scholar Labs search 1')}</a>
      <a className="library-secondary inline-flex" href="https://scholar.google.com/scholar_labs/search/session/6581218369437547131?hl=en" target="_blank" rel="noreferrer">{tr('Open Google Scholar Labs search 2')}</a>
    </section>
  </main>;
}
