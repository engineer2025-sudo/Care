# Research-informed activity and in-app evidence page — October 17, 2026

This update adds an optional cross-platform activity and a plain-language research page to the iPhone, Android, and web app. Both are available in English, Spanish, Simplified Chinese, Filipino, and Vietnamese. The catalog now contains 815 interface messages.

## New activity: Social moment cards

Three fictional, everyday scenarios offer several reasonable responses: a noisy room, a greeting, and a changed plan. The experience is untimed and unscored. A person can choose, discuss another response, skip, or leave. It does not enforce eye contact, imitation, a single “normal” response, or a preferred answer. It requests no health permission, works offline, and does not save or transmit the selected response. This is a conversation/practice activity, not treatment or an assessment.

## In-app page: Research & how CareSphere works

The page summarizes both user-provided open-access systematic reviews, links to their full texts and DOIs, explains the design response, and makes the evidence boundary explicit. It also includes the two shared Google Scholar Labs links with a note that they redirected to Google sign-in in this environment; their result lists could not be inspected and no claims are attributed to them.

1. Carneiro et al. (2024), *Serious Games for Developing Social Skills in Children and Adolescents with Autism Spectrum Disorder: A Systematic Review*, **Healthcare 12**(5), 508, [doi:10.3390/healthcare12050508](https://doi.org/10.3390/healthcare12050508). Nine included studies reported positive findings in at least one outcome, while the review also identified substantial risk of bias, varied methods/interventions, and a limited evidence base. Its population was children and adolescents. It does not validate CareSphere or generalize to adults.
2. Irazoki et al. (2020), *Technologies for Cognitive Training and Cognitive Rehabilitation for People With Mild Cognitive Impairment and Dementia. A Systematic Review*, **Frontiers in Psychology 11**, 648, [doi:10.3389/fpsyg.2020.00648](https://doi.org/10.3389/fpsyg.2020.00648). The review described 19 studies and 11 programs, distinguishing stimulation, training, and individualized rehabilitation. Programs and evidence differed, and the authors called for more clinical studies. A self-guided app activity is not a structured therapist-led program.

## Validation in this change

- Web [39056205898](https://github.com/engineer2025-sudo/Care/actions/runs/39056205898): passed — 67 unit tests, 35 browser tests (including the research-page links and non-scored activity), offline production check, and build.
- Android [39060181142](https://github.com/engineer2025-sudo/Care/actions/runs/39060181142): passed — 75 unit tests, lint, signature verification, and emulator checks for the research page and social moment flow. The emulator smoke does not represent a clinical or real-world validation study.
- iPhone [39056205885](https://github.com/engineer2025-sudo/Care/actions/runs/39056205885): passed — 61 Swift tests and the device, HealthKit, and Simulator builds/launch.
- All new user-facing copy is in the shared offline localization catalog. `scripts/generate_localizations.py --check` validates identical web/iOS/Android catalogs.

These activities have not been clinically evaluated and do not diagnose, prevent, slow, or treat dementia or autism. They are optional for enjoyment or conversation, not a substitute for professional care.
