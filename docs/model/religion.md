# Religion in Anagnosis

## Role of Religion

Religion is part of a polity's ideology and a strong signal of continuity or rupture. A change of religion alone never splits a polity (`polity.md` section 4). It does help explain why:
- A Serb, a Croat, and a Bosniak are linguistically and genetically near-identical, yet belong to different civilizational spheres (Orthodox/Byzantine, Catholic/Habsburg, Muslim/Ottoman)
- A Hindu Punjabi, a Muslim Punjabi, and a Sikh Punjabi are the same people with the same language, yet produced completely different political identities
- Urdu and Hindi are the same spoken language — mutually intelligible — yet represent distinct civilizational identities purely through script and religious vocabulary

## Religion as Polity Identity

Religion is part of a polity's **ideology** (see `ideology.md`). A change of state religion is recorded in the data and on inheritance claims. It does not end the polity by itself.

### The Zoroastrian/Islamic Break in Persia

This is the clearest example. The transition from Sassanid to Abbasid rule on the Iranian plateau is:
- The same land under a new ruling people
- But also an **ideological rupture** — Zoroastrianism to Sunni Islam

Then the Safavid revolution (1501) introduced a *second* rupture on the same land:
- Same Persian ethnicity as pre-Islamic Persia
- Same Iranian territory
- But Shia Islam vs Sunni Islam — a **civilizational wall** between Safavid Iran and its Sunni Timurid predecessors

This is why modern Iran is not simply "Persian." It is specifically **Shia Persian** — and that distinction is the foundation of its entire geopolitical identity vis-à-vis Sunni Arab/Turkic neighbors.

## The Religion Tree

Religions are organized as a tree (see `parent_id` in `csvs/religion.csv`), where:
- Distance between two religions on the tree = ideological distance
- Same leaf node = strong continuity
- Same branch (e.g., both Sunni) = moderate continuity
- Different top-level family (e.g., Zoroastrian vs Islamic) = rupture

```
proto_belief
├── Animism / Tengriism          ← Mongol, Göktürk, early Turkic
├── Mesopotamian Paganism        ← Sumerian, Babylonian, Assyrian
├── Egyptian Religion            ← Pharaonic Egypt
├── Zoroastrianism               ← Achaemenid, Parthian, Sassanid
├── Hellenic / Roman Paganism    ← Greek city-states, Roman Empire
├── Manichaeism                  ← Uyghur Khaganate (unique case)
├── Abrahamic
│   ├── Judaism                  ← Kingdom of Israel/Judah, Khazar Khaganate
│   ├── Christianity
│   │   ├── Eastern Orthodox     ← Byzantine, Serbia, Russia, Bulgaria
│   │   ├── Oriental Orthodox    ← Coptic Egypt, Ethiopia, Armenia
│   │   ├── Catholic             ← Croatia, Poland, France, Spain, HRE
│   │   └── Protestant           ← Northern Europe post-Reformation
│   └── Islam
│       ├── Sunni (Hanafi/Shafi'i/Maliki/Hanbali)
│       │     ← Ottoman, Abbasid, Seljuk, Mughal, Timurid, Golden Horde
│       └── Shia
│             ├── Twelver        ← Safavid Iran, modern Iran
│             └── Ismaili        ← Fatimid Caliphate
├── Dharmic
│   ├── Hinduism                 ← Gupta, Maurya (early), Rajput kingdoms
│   ├── Buddhism
│   │   ├── Theravada            ← Maurya (Ashoka), Southeast Asia
│   │   ├── Mahayana             ← Tang/Song China, Korea, Japan
│   │   └── Vajrayana            ← Tibet, Yuan Dynasty, Qing Dynasty
│   └── Jainism
└── East Asian
    ├── Confucianism             ← Han, Tang, Song, Ming, Qing
    ├── Taoism
    └── Legalism (extinct)       ← Qin Dynasty only
```

## Unique / Anomalous Cases

**Uyghur Khaganate — Manichaeism**
One of the only states in history to officially adopt Manichaeism. A syncretic religion blending Zoroastrian, Christian, and Buddhist elements. Represents a sharp ideological break from the Göktürk Tengriism that preceded it.

**Khazar Khaganate — Judaism**
The ruling class of the Khazar Khaganate converted to Rabbinic Judaism. Possibly a deliberate diplomatic neutrality — positioned between Christian Byzantium to the west and Muslim Caliphate to the south. A Turkic nomadic state with a Semitic religion creates a unique civilizational identity.

**Yuan Dynasty — Vajrayana Buddhism**
Kublai Khan adopted Tibetan Buddhism and appointed the Phags-pa Lama as the imperial preceptor. This served multiple functions: spiritual, and as legitimization over both Tibetan and Mongol subjects. Qing dynasty later did the same.

**Roman Empire — Mid-Dynasty Conversion**
Constantine's conversion (312) began as policy; Theodosius I's edict (380) made Christianity the only legal religion. This is the rare case where a **policy became an ideology mid-polity** — but it is better modeled as the Roman Empire being an ideological predecessor to the Byzantine Empire, rather than the same polity with a changed ideology.

## Religion and Succession Logic

Religion does not decide succession. It appears as one evidence signal (`same_religion`) on computed candidates and as one axis (`state_religion`) on curated claims, where an heir can affirm or repudiate it. Each claim is decided individually (`graph.md`).
