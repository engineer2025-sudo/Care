# iOS support check-in flow

CareSphere's support flow is a simple, user-controlled sequence. It does not rely on the language model to diagnose, decide that someone is in danger, or contact another person.

## Triggers and steps

- Possible self-harm or poisoning language entered in Health Guide is checked on-device **before** reference search or model inference. The app displays a short, fixed safety response and offers emergency help. The raw question is not placed in the caregiver message. The rule set is a safety gate, not a complete or validated crisis detector; a missed phrase remains possible.
- Live heart-rate check-ins are off until enabled in Settings. When enabled, only fresh CoreBluetooth heart-rate notifications are considered, only while CareSphere is foregrounded and unlocked, and only after readings remain above 110 BPM for 90 seconds; a sample gap over 15 seconds resets the timer. Apple Health history is not used. The prompt first asks whether the person is moving or exercising; it does not label a reading as stress, a diagnosis, or an emergency. Exercise, medication, age, and individual health can all affect heart rate.
- A person can also tap **I'm stressed** on Overview. They can follow three short paced-breathing cycles, stop, skip, or ask for support at any time. The app does not use the camera or microphone to measure breathing; it asks the person how they feel afterward.
- For a possible self-harm message, the flow avoids method, lethality, and symptom details. For possible poisoning it says not to take it if they have not already and directs them to urgent help if it was taken. It never promises the classifier understands every message.

## Contact and video limits

- CareSphere has no remote caregiver account, push service, or delivery acknowledgement. The **Text** action opens an iOS Messages composer with the saved contact and a short support message; the user must review and tap Send. CareSphere does not send texts silently or claim that a message was delivered or read.
- A per-flow Jitsi room is created for an optional in-app video call. A caregiver can join from the link in the message. Jitsi rooms are not hosted or moderated by CareSphere; anyone with the link may join. Share only with the intended person.
- Emergency calls, Messages, and video require the person's explicit tap. A local prompt is not a substitute for emergency services or a clinician.

The flow reads only the specific question submitted to Health Guide and an explicitly enabled, paired live heart-rate sensor. It does not scan social media, Messages, or other apps. Verify all thresholds, false-positive behavior, localization, emergency contacts, and Jitsi permissions on supported iPhones before release.
