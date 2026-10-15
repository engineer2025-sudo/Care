# Interface languages — October 14, 2026

CareSphere iPhone **3.5.0 (12)**, Android **1.5.0 (6)** and web **1.3.0** add an offline, persistent **App language** selector:

| Choice | Interface scope | Speech matching |
| --- | --- | --- |
| English | English source text | Installed English voice |
| Español | Spanish | Installed Spanish voice |
| 中文（简体） | **Simplified Chinese**; not a Traditional Chinese edition | Installed Mandarin-compatible `zh` voice; not Hong Kong/Macao Cantonese voices |
| Filipino / Tagalog | Filipino/Tagalog | Installed `fil` or `tl` voice |
| Tiếng Việt | Vietnamese | Installed Vietnamese voice |

English counts as one of the five. The selection uses the **2019 American Community Survey home-language categories**, described in the [Census Bureau's December 2022 report](https://www.census.gov/library/stories/2022/12/languages-we-speak-in-united-states.html). Spanish, Chinese, Tagalog and Vietnamese are its four largest non-English categories; including English yields this set. This is **not a claim to have verified a new 2026 ranking**. Census Chinese groups multiple spoken varieties; this app's Simplified Chinese interface does not cover every script or dialect. Filipino/Tagalog is labeled together to make the choice findable.

## Choose a language

- **iPhone:** Settings (gear) → Language → App language. A compact globe picker is also on the setup wizard. Changing the preference updates SwiftUI without resetting care data or dismissing a form.
- **Android:** Settings & privacy → App language → globe button. Return to your care screen; saved records remain unchanged.
- **Web:** Settings → globe / App language. The selection changes labels without remounting the application, so an unfinished care-note draft remains in place.
- **Use device language** chooses the first supported language in the device/browser preference list, or English if none matches. A Traditional Chinese device preference currently selects the explicitly labeled Simplified Chinese edition. Choose another language manually if needed.
- Preferences are separate, nonsensitive **local UI settings**, not patient records, and are not sent with care transfers. Each device/browser chooses its own language. A browser that blocks saving shows a warning; the current tab can still change language.

## What is translated—and what is not

The checked-in catalog contains **458 source messages with four translations each**, including aliases shared between platforms. There is no translation API, cloud translator, account, hosted backend, or download required to use the catalog.

Coverage includes main navigation, language selection, common actions and form labels, core care-note actions, activity titles/categories and many supported-choice prompts, default communication phrases, interest prompts, and selected sharing/privacy/safety copy. Not every catalog message is used on every platform.

**This is an initial, partial interface localization—not a fully translated clinical product.** Advanced instructions, some onboarding/dashboard/game descriptions, system/error diagnostics, research references, exported summary templates, OS permission/share dialogs and externally fetched health content may still be in English or follow the OS/provider's language. The language picker explicitly warns about English fallback. Apple Intelligence output and its language availability are governed by Apple's model and the chosen action, not an automatic translation of records.

**User-authored content stays untouched:** names, notes, medication names/instructions, custom communication cards, visual-routine titles/steps, photo captions, contacts, questions and received care records. Even a custom phrase `Yes` or a note `Save` is not a translation key. IDs, selections, transfer schemas, connection codes, passphrases and saved date formats do not change. UI display dates use the selected locale in key browser/Android screens and SwiftUI's locale environment; some preformatted advanced timestamps still follow existing platform formatting. Stored timestamps retain their original ISO/wire representation.

Translations are **drafts requiring fluent-speaker and clinical-safety review** before a production release. They are not certified medical translations. Use verified prescribed instructions and qualified interpretation for care decisions; the app must not reinterpret a person's clinical information.

## Speech and accessibility

Speech uses a matching installed/local voice where available. Browser voices must report `localService`; Android rejects network-required and not-installed voices and checks voice selection success; iPhone selects from installed voices matching the chosen language. Chinese matching excludes `zh-HK` / `zh-MO`; Cantonese (`yue`) is not substituted.

No English voice is silently substituted for translated text. If a suitable voice is unavailable, words remain on screen and an explanation appears. Browser voice lists can load asynchronously; try again after the browser finishes loading them. OS voice downloads/settings are outside this app; no private text is sent to a translation service. Custom phrases/steps are read as entered, using the selected voice, **not translated**. Choose a language appropriate to that text before requesting speech. Hardware/installed-voice combinations still require manual testing.

Native language names remain visible in the picker, without flags. Layouts allow wrapping, and the existing large-text/accessibility preferences remain available. Professional VoiceOver/TalkBack and intended-user checks in all five languages are still needed.

## Developer workflow and safeguards

1. Edit `localization/interface.psv` (UTF-8, English + Spanish + Simplified Chinese + Filipino + Vietnamese), or add an exact equivalent in `localization/aliases.json`.
2. Run `python3 scripts/generate_localizations.py`.
3. Commit all three generated catalogs. `--check` refuses mismatches, duplicate source keys, empty translations, and missing/extra placeholders. All three CI workflows run it.
4. Lookup calls are deliberately placed at **interface literals and known built-in metadata**. Never translate arbitrary DOM text, all `Text(value)` calls, generic text/button helper arguments, records or storage values.
5. `{0}`-style placeholders are substituted once; arguments are never translated or reparsed. React/SwiftUI/native TextView render their contents as text, not markup.
6. Activity IDs, category IDs, selected sections and choice-answer comparisons remain stable English/machine IDs; only their display labels change. Activity search also checks translated built-in titles.
7. English is the fallback for an unknown key or unsupported locale. Translation failures must not make care records unreadable.

Automated evidence is recorded in `docs/release-2026-10-14.md` and the downloadable archives' `BUILD_VERIFICATION.json`. Unit tests cover language aliases, catalogs, placeholder integrity, unchanged values and wrong-language voice rejection. Browser tests cover all choices, device defaults, draft preservation, persisted preference, original saved notes and translated search. The Android emulator exercises all five choices, Spanish preference persistence and unchanged care-note text. These checks do not replace linguistic review or physical-phone testing.
