# AP1 Curriculum Coverage Audit & Gap Map

## 1. Audit metadata

| Field | Verified value |
|---|---|
| Audit basis | The AP1 checklist supplied with Batch 28; no external syllabus interpretation |
| Repository baseline | `973b5d400e0a` |
| Audit date | 2026-10-01 |
| Canonical modules | 25 |
| Canonical lessons | 162; all are marked `available` |
| Module completion quizzes | 25; no canonical module is missing one |
| Question-bank questions | 336: 201 single-choice, 135 multiple-selection |
| Questions used by completion quizzes | 336 |
| Practice-eligible questions | 240 |
| Completion-only questions | 96 |
| Practice-eligible modules | 17 |
| Completion-only modules | 8 |
| Learning phases | 5 |

Evidence: `src/app/data/learning-modules.ts`, `src/app/data/learning-path.ts`, `src/app/data/quiz-bank/question-bank.ts`, `src/app/data/quiz-bank/module-completion-definitions.ts`, `src/app/data/quiz-bank/categories.ts`, and `tests/learning-content.test.mts` / `tests/quiz-engine.test.mts`. Counts above were also recomputed directly from the imported current data; historical Batch reports were not used as evidence.

### Method and source limitation

This document measures the current repository against the supplied Batch-28 checklist. It does **not** independently establish what will appear in the February 2027 examination and does not predict learner performance.

The status denominator is deterministic: each dashed item in the 19 explicit `Audit` lists is one audit unit; the four indented audio parameters are also individual units. A single line containing a fixed bundle, such as “normal/high/very-high protection needs”, remains one unit. The three explicitly non-penalized Backup enrichments (RPO/RTO, restore testing, 3-2-1) are reported but excluded from the AP1 denominator. The seven explicitly removed/non-priority topics are each counted once as `SUPPLEMENTAL-FISI`. The resulting universe is 580 units: 573 requested AP1 units plus 7 supplemental units.

Dimensions use `T` theory, `P` learner practice, `C` calculation, `A` completion/Practice assessment, and `S` scenario readiness. `✓` means substantive, `△` means thin or indirect, `—` means absent, and `n/a` means the dimension does not naturally apply. A grouped row assigns the displayed status and dimension profile to every named unit in that row.

## 2. Executive summary

Azubi Lab has a broad and generally coherent curriculum. Privacy, software/licensing, UML/data modelling, quality assurance, virtualization/cloud, programming fundamentals, and most project/economic foundations are strong. Networking is deep for IPv4, subnetting, DHCP, DNS, models, devices, topologies, and troubleshooting, but has a conspicuous IPv6 and modern WLAN/protocol edge gap. The largest content deficit is a general data/number/calculation foundation: Mbit/s versus MB/s, hexadecimal, image/audio sizing, encoding, and systematic SI/IEC conversion are not taught as a connected skill family. The second critical content deficit is client setup: installation, partitioning, formatting, boot/UEFI/POST/bootloader, FAT32/ext4, and practical DHCP/static/RDP setup.

Assessment coverage has two different truths. Every module has a substantial completion quiz and every bank question is completion-eligible. In contrast, the mixed Practice Quiz and IHK simulation only admit 240 questions from 17 modules. All 96 questions from Programming, UML, Project Management, Economics, Software/Licensing, Virtualization/Cloud, Customer/Contracts, and Quality/Handover are excluded. Consequently, the present IHK simulation cannot sample major supplied-checklist task families even though those topics are taught and tested in their modules.

Checklist result:

| Status | Count |
|---|---:|
| FULL | 433 |
| PARTIAL | 46 |
| MISSING | 56 |
| CROSS-COVERED | 38 |
| SUPPLEMENTAL-FISI | 7 |
| **Total** | **580** |

These are mechanical checklist counts, not an “exam readiness” percentage.

The immediate next content Batch should be **Data & Calculation Fundamentals**. In parallel or immediately afterward, Practice/IHK taxonomy should be expanded to include the eight completion-only modules; otherwise newly strong content remains absent from mixed rehearsal and simulation.

## 3. Current curriculum inventory

### Canonical module, lesson, and quiz inventory

| Module slug | Lessons | Quiz (SC/MS) | Bank / Practice / completion-only | Primary usefulness |
|---|---:|---:|---:|---|
| `arbeitsplatz-hardware` | 6 | 12 (8/4) | 12 / 12 / 0 | AP1 core; workplace practical |
| `windows-grundlagen` | 6 | 16 (8/8) | 16 / 16 / 0 | AP1 supporting; workplace practical |
| `linux-grundlagen` | 7 | 17 (8/9) | 17 / 17 / 0 | AP1 supporting; broader FISI foundation |
| `osi-tcp-ip-modell` | 8 | 12 (9/3) | 12 / 12 / 0 | AP1 core; FISI foundation |
| `netzwerk-koppelelemente` | 9 | 12 (8/4) | 12 / 12 / 0 | AP1 core; workplace practical |
| `netzwerktopologien` | 9 | 12 (8/4) | 12 / 12 / 0 | AP1 core; FISI foundation |
| `ipv4-grundlagen` | 5 | 12 (9/3) | 12 / 12 / 0 | AP1 core |
| `subnetting` | 6 | 15 (9/6) | 15 / 15 / 0 | AP1 core |
| `dhcp` | 6 | 15 (11/4) | 15 / 15 / 0 | AP1 core; workplace practical |
| `dns` | 6 | 15 (7/8) | 15 / 15 / 0 | AP1 core; workplace practical |
| `webserver-grundlagen` | 6 | 15 (10/5) | 15 / 15 / 0 | AP1 supporting; later FISI/AP2 useful |
| `active-directory-grundlagen` | 7 | 18 (9/9) | 18 / 18 / 0 | broader/later FISI; workplace practical |
| `virtualisierung-und-cloud` | 6 | 12 (7/5) | 12 / 0 / 12 | AP1 core/supporting; broader FISI |
| `storage-und-raid` | 6 | 12 (7/5) | 12 / 12 / 0 | supplemental FISI; later/AP2 useful |
| `backup-datensicherung` | 9 | 15 (10/5) | 15 / 15 / 0 | AP1 core; workplace practical |
| `netzwerkfehler-systematisch-analysieren` | 6 | 18 (9/9) | 18 / 18 / 0 | AP1 core/supporting; workplace practical |
| `it-sicherheit` | 6 | 12 (7/5) | 12 / 12 / 0 | AP1 core |
| `datenschutz` | 6 | 12 (6/6) | 12 / 12 / 0 | AP1 core; workplace practical |
| `programmierung-und-pseudocode` | 6 | 12 (7/5) | 12 / 0 / 12 | AP1 core |
| `uml-und-datenmodellierung` | 6 | 12 (7/5) | 12 / 0 / 12 | AP1 core |
| `projektmanagement` | 6 | 12 (6/6) | 12 / 0 / 12 | AP1 core; workplace practical |
| `wirtschaftlichkeit-und-beschaffung` | 6 | 12 (7/5) | 12 / 0 / 12 | AP1 core; workplace practical |
| `software-und-lizenzierung` | 6 | 12 (8/4) | 12 / 0 / 12 | AP1 core/supporting; workplace practical |
| `kundenauftrag-kommunikation-und-vertraege` | 6 | 12 (8/4) | 12 / 0 / 12 | AP1 core; workplace practical |
| `qualitaetssicherung-und-uebergabe` | 6 | 12 (8/4) | 12 / 0 / 12 | AP1 core; workplace practical |

All 25 quizzes draw canonical question IDs, and all 336 bank questions are used by completion definitions. There are no modules without a completion quiz and no orphaned question-to-lesson references. Evidence: `src/app/data/quiz-bank/module-completion.ts`, `src/app/data/quiz-bank/validation.ts`, `tests/quiz-engine.test.mts`.

### Lessons and substantive checks

The catalogue has 162 unique lesson records, all available. The 107 lessons in the 16 newer content families use `FundamentalsLesson` with an explicit application scenario and solution; many also carry an interactive `SingleChoiceCheck` or `PracticeExercise`. The 55 older IPv4/Subnetting/DHCP/DNS/Windows/Linux/Webserver/AD/Troubleshooting lessons use route-local checks and specialized check components. Static source inspection can prove that each lesson is routed and that the content families contain exercises, but component indirection does not justify claiming that every older lesson has an equally substantive per-lesson check. Therefore, the defensible result is: **no missing lesson content route detected; no numeric “zero lessons without checks” claim**. The practical-depth gaps are reported by topic in sections 7 and 8.

### Depth and size

Lesson counts range from 5 to 9 and question counts from 12 to 18. `backup-datensicherung`, `netzwerk-koppelelemente`, and `netzwerktopologien` are the densest at nine lessons but remain conceptually coherent. `kundenauftrag-kommunikation-und-vertraege` and `qualitaetssicherung-und-uebergabe` are broad six-lesson modules; their breadth is coherent, but each bank has no hard question, making assessment depth weaker than content breadth. No module is demonstrably fragmented solely because of size, and no merge/split is recommended from counts alone.

## 4. Learning phase/order review

| Phase | Canonical order | Integrity and pedagogy |
|---|---|---|
| 1. IT-Grundlagen & Arbeitsplatz | Hardware → Windows → Linux | Each module appears once. Hardware before OS is sensible. Missing general data/number foundations and client installation concepts should be introduced here before network calculations. |
| 2. Netzwerke | OSI/TCP-IP → devices → topologies → IPv4 → subnetting → DHCP → DNS | Each module appears once. IPv4 before subnetting and addressing before services are strong. IPv6 and WLAN/security concepts are absent rather than misordered. |
| 3. Systeme, Storage & Betrieb | Webserver → AD → Virtualization/Cloud → Storage/RAID → Backup → Troubleshooting | Each module appears once. Service and system context precedes troubleshooting. Storage before Backup helps the RAID/Backup distinction. |
| 4. Sicherheit & Datenschutz | Security → Privacy | Each module appears once. Placement after systems/network context is appropriate. BSI protection-needs content is missing, not misplaced. |
| 5. Entwicklung, Planung & Wirtschaft | Programming → UML → Project → Economics → Software → Customer/Contracts → Quality/Handover | Each module appears once. Programming before modelling and project before planning calculations are sensible; customer requirements before project planning would also be defensible, but the current order is not harmful because the path is guidance, not a lock. |

`learningPathPhases` contains 25 entries, exactly matches the 25 canonical module slugs, contains no duplicate, uses deterministic phase order 1–5, and introduces no hard prerequisite. Evidence: `src/app/data/learning-path.ts` and the “learning path groups every canonical module exactly once” test in `tests/learning-content.test.mts`.

Recommended order change only when new content exists: insert Data & Calculation Fundamentals in phase 1 before IPv4/Subnetting; add Client Installation & Boot after the two OS foundations. No current module needs immediate reordering.

## 5. Coverage matrix for all 19 source blocks

### Block summary

| # | Source block | FULL | PARTIAL | MISSING | CROSS-COVERED | Main conclusion |
|---:|---|---:|---:|---:|---:|---|
| 1 | Networking | 48 | 13 | 17 | 10 | Excellent IPv4/services foundation; IPv6 and WLAN/protocol edges are the main gap. |
| 2 | Hardware & workplace | 40 | 7 | 4 | 1 | Strong selection and energy practice; optical/media taxonomy, resolution, Green IT/recycling are thin. |
| 3 | Number systems/units/calculations | 0 | 10 | 13 | 5 | No coherent general foundation; fragments are cross-covered by Hardware/IPv4/Subnetting. |
| 4 | Operating systems/client setup | 16 | 5 | 11 | 1 | Strong administration basics; installation, boot and filesystem coverage is incomplete. |
| 5 | Virtualization & cloud | 22 | 1 | 0 | 0 | Substantive and scenario-based; FaaS is only a short orientation. |
| 6 | IT security | 45 | 2 | 5 | 2 | Strong threats/measures/crypto; structured BSI protection-needs method is absent. |
| 7 | Backup | 12 | 1 | 1 | 0 | Strong restore-oriented module; hot/cold backup and concrete media comparison are gaps. |
| 8 | Privacy/GDPR | 21 | 0 | 0 | 0 | Complete against the supplied list with scenarios and assessment. |
| 9 | Programming/pseudocode | 23 | 2 | 0 | 0 | Strong fundamentals and desk checks; completion tasks and procedural/OOP comparison are thin. |
| 10 | UML/data modelling | 23 | 0 | 0 | 0 | Complete against the supplied list. |
| 11 | Software/licensing | 28 | 0 | 0 | 0 | Complete, including selection, licence models, rights, and AI awareness. |
| 12 | Project management | 41 | 0 | 1 | 0 | Strong planning/calculation coverage; free float is missing. |
| 13 | Economics/calculations | 22 | 1 | 1 | 0 | Strong worked calculations; break-even is indirect and hourly-rate calculation is absent. |
| 14 | Customer/advice/communication | 15 | 2 | 0 | 2 | Strong requirements/communication; source evaluation and presentation practice are thin. |
| 15 | Procurement/offer comparison | 17 | 1 | 0 | 6 | Components are strong across modules; end-to-end research/application needs a richer integrated exercise. |
| 16 | Contract law | 17 | 1 | 3 | 1 | Core contract types are strong; delay and AGB concepts are absent. |
| 17 | Quality assurance | 19 | 0 | 0 | 0 | Complete and applied against the supplied list. |
| 18 | Service/support/troubleshooting | 13 | 0 | 0 | 5 | Complete through deliberate cross-coverage between technical and service-process modules. |
| 19 | Delivery/handover/documentation | 11 | 0 | 0 | 5 | Complete through Quality, Customer, Project and Economics ownership. |

### 1. Networking — 88 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| OSI seven layers, purposes, device/protocol assignment (3); TCP/IP structure/comparison (2); hub/bridge/switch/router/AP (5) | FULL | ✓/✓/n/a/✓/✓ | `osi-tcp-ip-modell` lessons `die-sieben-osi-schichten`, `osi-und-tcp-ip-vergleichen`; `netzwerk-koppelelemente`; corresponding question groups | None material. |
| Client/server (1) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | `webserver-grundlagen/was-ist-ein-webserver`, HTTP client/server checks | Owned by Webserver rather than a general architecture lesson. |
| Peer-to-peer (1) | MISSING | —/—/n/a/—/— | No substantive repository match in learning or quiz content | Add comparison with client/server. |
| LAN, basic topologies, Ethernet fundamentals (3) | FULL | ✓/✓/n/a/✓/✓ | `netzwerktopologien`; `netzwerk-koppelelemente/bridge-und-switch`; `network-topologies.ts` exercises | None. |
| WLAN as a network type (1) | PARTIAL | △/△/n/a/△/△ | AP/WLAN bridging appears in `netzwerk-koppelelemente/access-point-modem-medienkonverter` | No coherent WLAN fundamentals/security lesson. |
| MAC vs IP; all requested IPv4 structure, mask/CIDR, network/broadcast/hosts, subnetting, private/public, APIPA, loopback and gateway units (14) | FULL | ✓/✓/✓/✓/✓ | `ipv4-grundlagen`, `subnetting`, route content in `src/app/lernen/[slug]/[lessonSlug]/page.tsx`; 27 related completion questions | Strong calculation exercises and scenarios. |
| IPv6 fundamentals/address format (2) | PARTIAL | △/—/n/a/△/— | IPv6 examples and AAAA appear in OSI/DNS (`dns-records`) | Mentions do not teach addressing. |
| IPv6 shortening, expanding, Global Unicast, Link Local, Unique Local, Multicast, IPv4 comparison, SLAAC (8) | MISSING | —/—/n/a/—/— | No substantive lesson/question match | Coherent IPv6 package required. |
| DHCP purpose/DORA (2); DNS resolution plus A/AAAA/MX/CNAME/PTR/NS/SOA (8) | FULL | ✓/✓/n/a/✓/✓ | `dhcp-ablauf-dora`; `dns-aufloesung`, `dns-records`, `dns-zonen-und-delegation`; 30 questions across DHCP/DNS | None material. |
| ARP and ICMP/ping (2) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | `netzwerkfehler.../client-ip-lokales-netz` and quiz IDs `nt-client-mask-arp`, `nt-method-ping` | Canonical owner is Troubleshooting. |
| TCP vs UDP (1) | FULL | ✓/✓/n/a/✓/✓ | `osi-tcp-ip-modell/osi-schichten-4-bis-7`; `udp-properties` question | None. |
| TCP three-way handshake (1) | MISSING | —/—/n/a/—/— | No SYN/SYN-ACK/ACK teaching match | Add protocol-flow practice. |
| Routing and VLAN fundamentals (2) | FULL | ✓/✓/n/a/✓/✓ | `netzwerk-koppelelemente/router`, `bridge-und-switch`; topology VLAN questions | None. |
| Tagged vs untagged; VPN fundamentals (2) | PARTIAL | △/△/n/a/△/△ | Trunk/VLAN and overlay/underlay appear in `netzwerktopologien/physische-und-logische-topologie` | Tagging and VPN purpose/security are not taught end-to-end. |
| WLAN AP (1) | FULL | ✓/✓/n/a/✓/✓ | AP lesson and `netzwerk-koppelelemente:access-point` | None. |
| WLAN repeater (1) | PARTIAL | △/—/n/a/—/△ | Generic repeater is taught; wireless repeater design is not | Add WLAN-specific distinction. |
| Hotspot, WPA2/WPA3, PSK vs Enterprise (3) | MISSING | —/—/n/a/—/— | No substantive repository match | Important WLAN-security gap. |
| PoE and DSL fundamentals (2) | PARTIAL | △/—/n/a/—/△ | Both are mentioned in network-device selection, but not explained or assessed | Extend infrastructure lesson. |
| HTTP, HTTPS, SSH, Telnet, DNS, DHCP, SMB services/ports (7) | FULL | ✓/✓/n/a/✓/✓ | Webserver, Security, DHCP/DNS, Windows and Troubleshooting port table/questions | None. |
| SMTP, RDP, NTP (3) | PARTIAL | △/—/n/a/△/△ | SMTP is an OSI example; RDP/NTP appear as port/option references | No substantive service workflow. |
| FTP, POP3, IMAP (3) | MISSING | —/—/n/a/—/— | No substantive content match | Add only checklist-level fundamentals. |
| ping, ipconfig, ip, tracert/traceroute, nslookup, arp (6) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | `netzwerkfehler...` read-only toolboxes and scenario questions | Adequately owned by Troubleshooting. |
| ifconfig (1) | MISSING | —/—/n/a/—/— | No repository match; modern `ip` is taught instead | Checklist-specific terminology gap. |
| Transmission rate/data amount (2) | PARTIAL | △/△/△/△/△ | Hardware transfer example uses data/rate/time | Missing Mbit/s↔MB/s and varied network tasks. |
| Transmission duration (1) | CROSS-COVERED | ✓/✓/✓/✓/✓ | `arbeitsplatz-hardware/leistung-energie-und-kapazitaet`; `gb-gib-transfer` question | Correctly taught outside Networking. |

### 2. Hardware & workplace — 52 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| CPU purpose/cores/threads/clock/ALU/Von Neumann (6); RAM purpose/types/DDR/Dual Channel (4) | FULL | ✓/✓/n/a/✓/✓ | `arbeitsplatz-hardware/cpu-und-von-neumann`, `ram-mainboard-und-netzteil`; hardware questions | None. |
| Mainboard, PSU, GPU (3) | FULL | ✓/✓/n/a/✓/✓ | Hardware lessons and selection scenarios | None. |
| Chipset (1) | PARTIAL | △/△/n/a/△/△ | Compatibility checks mention chipset | Purpose/role is not taught independently. |
| NIC (1) | MISSING | —/—/n/a/—/— | No substantive hardware NIC section | Add adapter role/features. |
| HDD, SSD, SATA, PCIe, NVMe, M.2, performance, capacity, cost (9) | FULL | ✓/✓/△/✓/✓ | `gpu-speicher-und-schnittstellen`; M.2/NVMe misconception check | None material. |
| Magnetic/electronic/optical storage; lifespan; storage energy (3) | PARTIAL | △/△/△/△/△ | HDD mechanics, SSD choice, “Haltbarkeit” and energy criteria appear | Optical media and comparative lifecycle depth are absent. |
| Keyboard, mouse, printer, scanner, monitor, docking station (6) | FULL | ✓/✓/n/a/✓/✓ | `peripherie-und-clienttypen`; accessible workplace scenario/question | None. |
| DisplayPort, HDMI, USB (3) | PARTIAL | △/—/n/a/△/△ | Interface names/purposes appear in `gpu-speicher-und-schnittstellen` | No versions, bandwidth or selection exercise. |
| Resolutions (1) | MISSING | —/—/—/—/— | Only a distractor mentions monitor resolution | Add display-resolution fundamentals. |
| Notebook/desktop/tablet/thin client/fat client (5) | FULL | ✓/✓/n/a/✓/✓ | `peripherie-und-clienttypen` table and scenario | None. |
| Customer scenario, ergonomics, accessibility, energy efficiency (4) | FULL | ✓/✓/✓/✓/✓ | `arbeitsplatz-auswaehlen`, `leistung-energie-und-kapazitaet` | None. |
| Sustainability (1) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | Procurement comparison and utility-analysis scenarios | Canonical owner is Procurement/Economics. |
| Green IT and recycling (2) | MISSING | —/—/n/a/—/— | No substantive repository match | Add lifecycle/repair/reuse/disposal concepts. |
| P=U×I, energy over time, efficiency (3) | FULL | ✓/✓/✓/✓/✓ | `leistung-energie-und-kapazitaet`; `power-energy` question | Strong worked example and quiz calculation. |

### 3. Number systems, units and calculations — 28 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Bit vs byte; KB–TB; KiB–TiB; SI/IEC; decimal/binary unit conversion; data amounts (6) | PARTIAL | △/△/△/△/△ | Hardware lesson explains GB/GiB and one TB→GiB example | No systematic unit ladder or varied exercises. |
| Transmission time (1) | CROSS-COVERED | ✓/✓/✓/✓/✓ | Hardware transfer scenario and completion question | Adequate but isolated. |
| Transmission rates; storage requirements (2) | PARTIAL | △/△/△/△/△ | Rate/time and capacity appear in Hardware | No rate derivation or multi-step sizing practice. |
| Mbit/s vs MB/s (1) | MISSING | —/—/—/—/— | No substantive match | Critical conversion gap. |
| Binary, decimal, binary↔decimal, powers of two (4) | CROSS-COVERED | ✓/✓/✓/✓/✓ | IPv4 octet conversion and Subnetting host-count exercises | Adequate for network use, not yet generalized. |
| Hexadecimal and hex↔decimal/binary (2) | MISSING | —/—/—/—/— | No substantive match | Add conversion practice. |
| Image size; resolution×colour depth (2) | MISSING | —/—/—/—/— | No learning-content match | Add realistic image calculations. |
| Audio sizing plus sampling rate/depth/channels/duration (5) | MISSING | —/—/—/—/— | No learning-content match | Add multi-factor audio calculations. |
| Compression (1) | PARTIAL | △/—/n/a/—/— | Compression is only an OSI presentation-layer example | No substantive explanation. |
| Lossless vs lossy, ASCII, Unicode (3) | MISSING | —/—/n/a/—/— | No substantive learning-content match | Add representation/encoding basics. |
| UTF-8 (1) | PARTIAL | △/—/n/a/—/— | Mentioned as an OSI representation example | No encoding reasoning or assessment. |

### 4. Operating systems & client setup — 33 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| OS purpose, Windows vs Linux, GUI vs CLI (3) | FULL | ✓/✓/n/a/✓/✓ | `windows-verstehen`, `linux-kernel-distributionen-shell`, shell checks | None. |
| NTFS (1) | FULL | ✓/✓/n/a/✓/✓ | `windows-grundlagen/benutzer-gruppen-ntfs`; NTFS questions | None. |
| FAT/FAT32 and ext4 (2) | MISSING | —/—/n/a/—/— | No substantive content match | Filesystem comparison gap. |
| Directory structure; files/directories (2); users/groups/permissions/rwx/chmod/chown (6) | FULL | ✓/✓/n/a/✓/✓ | Windows/Linux filesystem and permissions lessons/checks | None. |
| Process (1) | FULL | ✓/✓/n/a/✓/✓ | Windows/Linux process/service lessons and questions | None. |
| Task (1) | PARTIAL | △/△/n/a/△/△ | Task Manager is used, but “task” is not cleanly modelled against process/thread | Clarify vocabulary. |
| Thread and multitasking (2) | MISSING | —/—/n/a/—/— | No substantive content match | Add OS execution fundamentals. |
| OS installation, partitioning, formatting (3) | MISSING | —/—/n/a/—/— | Only read-only partition inventory appears | Critical client-setup gap. |
| Drivers (1) | PARTIAL | △/△/n/a/△/△ | Windows architecture and Device Manager mention drivers | No install/update/rollback workflow. |
| Updates/patches (1) | FULL | ✓/✓/n/a/✓/✓ | Windows Update and Linux package-management lessons/questions | None. |
| BIOS vs UEFI, POST, boot process, bootloader (4) | MISSING | —/—/n/a/—/— | No substantive content match | Critical boot fundamentals gap. |
| Client network configuration; DHCP vs static; remote/RDP (3) | PARTIAL | △/△/n/a/△/△ | Windows/Linux inventory and Troubleshooting read configurations; RDP port appears | Configuration and safe remote-access setup are not practiced. |
| Domain join (1) | CROSS-COVERED | ✓/△/n/a/✓/✓ | `active-directory-grundlagen/was-ist-active-directory` and domain-join misconceptions | Owned by AD; practical join is intentionally not performed. |
| Windows and Linux command-line diagnostics (2) | FULL | ✓/✓/n/a/✓/✓ | Both “system untersuchen” lessons and read-only inventories | None. |

### 5. Virtualization & cloud — 23 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| All requested virtualization concepts: purpose, trade-offs, physical/virtual, host, guest, Type 1/2, bare-metal/hosted, VM (9) | FULL | ✓/✓/n/a/✓/✓ | `virtualisierung-host-gast-hypervisor`, `vm-ressourcen-und-betriebsgrenzen`; completion questions | None. |
| VM vs container and container fundamentals (2) | FULL | ✓/✓/n/a/✓/✓ | `vm-und-container-unterscheiden`, `container-grundlagen` | None. |
| Cloud computing, on-prem/cloud, IaaS/PaaS/SaaS, Public/Private/Hybrid, scalability, availability, cost/benefit (11) | FULL | ✓/✓/n/a/✓/✓ | Cloud model/decision lessons and scenario questions | None material. |
| FaaS (1) | PARTIAL | △/—/n/a/—/△ | One orientation sentence in `cloud-service-und-bereitstellungsmodelle` | If retained, add example and assessment; otherwise avoid overemphasis. |

### 6. IT security — 54 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Information security/IT security/privacy/backup distinctions (4); confidentiality/integrity/availability/authenticity (4) | FULL | ✓/✓/n/a/✓/✓ | `it-sicherheit/begriffe-und-schutzziele`; `disciplines`, `cia-auth` questions | None. |
| All listed malware, social, network and vulnerability threats (16) | FULL | ✓/✓/n/a/✓/✓ | `schadsoftware-erkennen`, `angriffe-und-social-engineering`; scenario questions | None. |
| All listed measures except drive encryption (11) | FULL | ✓/✓/n/a/✓/✓ | `schutzmassnahmen-und-hardening`; hardening/MFA questions | None material. |
| Drive encryption (1) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | Full-disk protection in `datenschutz/datenschutz-und-datensicherheit` device-theft scenario | Canonical context is endpoint/privacy protection. |
| Plain/cipher text, symmetric/asymmetric, strengths, hashing, hash distinction, signatures, certificates, CA, SSH/Telnet (10) | FULL | ✓/✓/n/a/✓/✓ | `kryptografie-und-hashing`, `zertifikate-tls-und-sichere-administration` | None. |
| TLS/HTTPS (1) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | Canonical detail in `webserver-grundlagen/https-und-tls`; deliberate Security cross-link | Correct ownership. |
| IT-Grundschutz, protection-needs analysis, normal/high/very-high, personnel/infrastructure categories (5) | MISSING | —/—/n/a/—/— | No BSI/Grundschutz/protection-tier teaching match | Important structured-security gap. |
| Technical and organizational measure categories (2) | PARTIAL | △/✓/n/a/△/✓ | Controls are applied in Security/Privacy, but not taught as a BSI categorization method | Add framework and protection-needs derivation. |

### 7. Backup — 14 requested units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Purpose, backup vs archive, full/incremental/differential, trade-offs, restore effort/storage, retention, GFS, loss causes/protection (12) | FULL | ✓/✓/△/✓/✓ | All nine Backup lessons, `learning-exercises/backup.ts`, 15 questions | Strong restore-chain and ransomware scenarios. |
| Backup media (1) | PARTIAL | △/△/n/a/△/△ | Independent media/failure domains are taught in `backup-strategien-321` | No concrete tape/disk/removable/cloud media comparison. |
| Hot vs cold backup (1) | MISSING | —/—/n/a/—/— | No substantive match | Add consistency/availability trade-off. |

RPO/RTO, restore testing, and 3-2-1/3-2-1-1-0 are substantive enrichments in `rpo-und-rto`, `backup-sicherheit-und-restore-tests`, and `backup-strategien-321`; they strengthen the module but are not counted as requested AP1 units.

### 8. Privacy/GDPR — 21 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Personal data, GDPR/BDSG orientation, all principles/accountability (11) | FULL | ✓/✓/n/a/✓/✓ | `personenbezogene-daten-und-rechtsrahmen`, `datenschutzgrundsaetze`; privacy questions | None. |
| Access, rectification, erasure, restriction, objection, portability (6) | FULL | ✓/✓/n/a/✓/✓ | `betroffenenrechte`; rights questions and deletion scenario | None. |
| Anonymization, pseudonymization, privacy vs security, workplace handling (4) | FULL | ✓/✓/n/a/✓/✓ | Last three Privacy lessons and practice cases | None. |

### 9. Programming/pseudocode — 25 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Algorithm reading, variables/types/assignment/operators/comparisons/boolean logic, branches, loops, functions, lists, error finding, desk checks/output, class/object/attribute/method/public/private (23) | FULL | ✓/✓/n/a/✓/✓ | Six Programming lessons each have a check and scenario; 12 completion questions include desk calculations and boundary cases | None material. |
| Completing pseudocode (1) | PARTIAL | ✓/△/n/a/△/△ | Learners read and predict code but do not regularly fill missing statements | Add completion tasks. |
| Procedural vs object-oriented concept (1) | PARTIAL | △/△/n/a/△/△ | OOP basics are taught, but an explicit procedural/OOP comparison is thin | Add a focused comparison; inheritance is not required. |

### 10. UML & data modelling — 23 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| UML purpose; all requested use-case, class and activity elements (14) | FULL | ✓/✓/n/a/✓/✓ | First four Modeling lessons, six interactive checks, related questions | None. |
| ER/entity/attribute/relationship/cardinality and relational table/key/redundancy concepts (9) | FULL | ✓/✓/n/a/✓/✓ | `er-modell-und-kardinalitaeten`, `relationale-tabellen-und-schluessel`; questions | None. SQL is correctly out of scope. |

### 11. Software & licensing — 28 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| All software and business-software types (9) | FULL | ✓/✓/n/a/✓/✓ | `softwarearten-und-geschaeftsanwendungen`; quiz group | None. |
| Requirements, compatibility, interoperability, maintainability, usability, accessibility (6) | FULL | ✓/✓/n/a/✓/✓ | `software-auswaehlen` DMS scenario and questions | None. |
| All listed licensing models/rights/copyright topics (12) | FULL | ✓/✓/n/a/✓/✓ | Three licensing lessons; Open Source, Concurrent and usage-right questions | None. |
| AI software awareness (1) | FULL | ✓/✓/n/a/✓/✓ | `ki-gestuetzte-software`; verification/data questions | None. |

### 12. Project management — 42 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| All 15 project basics; Gantt/network plan (2); Lastenheft/Pflichtenheft (2); risk/target-actual/controlling (3); all 11 method/Scrum/Kanban units | FULL | ✓/✓/△/✓/✓ | Six Project lessons, interactive checks and 12 completion questions | None material. |
| Predecessor/successor, earliest/latest dates, total float, critical path (8) | FULL | ✓/✓/✓/✓/✓ | `netzplan-und-kritischer-pfad`, `lib/project-network.ts`, tested 11-day example | None. |
| Free float (1) | MISSING | —/—/—/—/— | Helper and lesson calculate only total float | Add formula, example, exercise and question. |

### 13. Economics/commercial calculations — 24 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Acquisition/ongoing/fixed/variable costs, revenue, profit, contribution margin, profitability, amortization, TCO, Make-or-Buy, purchase/rent/leasing, discount/Skonto/net/gross/VAT, basic calculation, comparisons, utility/offer/price-performance (22) | FULL | ✓/✓/✓/✓/✓ | Six Economics lessons, `lib/economic-calculations.ts`, five calculation questions | Strong worked examples and tested rounding/formulas. |
| Break-even basic concept (1) | PARTIAL | △/△/△/—/△ | Contribution margin/fixed cost are taught | No explicit break-even quantity/point task. |
| Hourly rate (1) | MISSING | —/—/—/—/— | No substantive learning/question match | Add cost-rate derivation and application. |

### 14. Customer needs/advice/communication — 19 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Requirements gathering, question types, functional/non-functional requirements, target groups, wish vs need, appropriate explanation/terminology, English information, communication models, sender/receiver, four-sides, instruction and instruction documentation (15) | FULL | ✓/✓/n/a/✓/✓ | First three Customer lessons and `sla-support-und-kundeneinweisung`; completion questions | None material. |
| Technical and economic requirements (2) | CROSS-COVERED | ✓/✓/✓/✓/✓ | Hardware/Software selection and Economics procurement scenarios | Adequate shared ownership. |
| Evaluating information sources; presenting results (2) | PARTIAL | △/△/n/a/△/△ | Marketing-vs-specification and documented handover appear | No explicit source-quality method or presentation exercise. |

### 15. Procurement/offer comparison — 24 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Must/optional, qualitative/quantitative, price, utility weighting/scoring/total, acquisition/operating/maintenance/TCO/delivery/future/sustainability/accessibility (17) | FULL | ✓/✓/✓/✓/✓ | `wirtschaftlichkeit-und-beschaffung` procurement/utility lessons and workplace scenario | Individually strong. |
| Need→requirements, technical specification comparison, licence cost, energy, warranty distinction, scalability (6) | CROSS-COVERED | ✓/✓/✓/✓/✓ | Customer, Hardware, Software/Licensing, Cloud and Economics modules | Correct cross-module process inputs. |
| Researching products/options (1) | PARTIAL | △/△/n/a/△/△ | “market options/pilot” appears in software selection | No source-driven product-research exercise. |

The complete selection process is **PARTIAL as an integrated capability** despite the atomic coverage: no single assessment requires a learner to extract customer needs, research options, reject on must criteria, calculate TCO, score utility, and document a recommendation end-to-end.

### 16. Contract law — 22 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Formation/offer/acceptance; purchase/rental/leasing; service/work/licence/support contracts; service-vs-work; SLA; performance description; statutory defect rights/guarantee/defect rights/acceptance (17) | FULL | ✓/✓/n/a/✓/✓ | Last three Customer lessons plus Economics/Software links and completion questions | None material. |
| Defective delivery (1) | PARTIAL | △/△/n/a/△/△ | General defect documentation and rights are taught | Delivery-specific handling is not explicit. |
| Delivery delay, payment delay, AGB (3) | MISSING | —/—/n/a/—/— | No substantive content match | Add stable conceptual treatment, not obscure detail. |
| Copyright (1) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | `software-und-lizenzierung/open-source-und-proprietaer`, usage-right questions | Canonical owner is Software/Licensing. |

### 17. Quality assurance — 19 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Quality/QA/QM/objectives/planning/PDCA (10) | FULL | ✓/✓/n/a/✓/✓ | `qualitaet-qa-qm-und-pdca`; check and scenario | None. |
| Test case/Soll-Ist/protocol; acceptance/system/integration; black/white box; defect/reproducibility/continuous improvement (9) | FULL | ✓/✓/n/a/✓/✓ | `testfaelle-und-soll-ist`, `testarten-und-abnahmetest`, `fehlerdokumentation...`; questions | None. |

### 18. Service/support/troubleshooting — 18 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Request intake, ticket, priority, incident/problem, solution documentation, support levels, escalation, status, remote support, verification, closure (13) | FULL | ✓/✓/n/a/✓/✓ | `qualitaetssicherung.../fehlerdokumentation-und-serviceprozess`; service questions | None. |
| Asking users, systematic isolation, cause vs symptom, fault analysis, user instruction (5) | CROSS-COVERED | ✓/✓/n/a/✓/✓ | Technical method in `netzwerkfehler...`; instruction in Customer/Quality | Deliberate split between technical and process owners. |

### 19. Delivery/handover/documentation — 16 units

| Topics (unit count) | Status | T/P/C/A/S | Evidence | Gap |
|---|---|---|---|---|
| Scope, performance verification/control, acceptance/protocol, defect documentation, handover, technical documentation, deviations, Lessons Learned, rework/follow-up (11) | FULL | ✓/✓/n/a/✓/✓ | Last two Quality lessons and their quiz group | None material. |
| Target/actual, deadlines, user instruction, work-time and cost documentation (5) | CROSS-COVERED | ✓/✓/✓/✓/✓ | Project controlling, Customer instruction, Economics and Quality plan/actual effort | Adequate shared ownership. |

## 6. Detailed missing and partial topics

The 56 `MISSING` and 46 `PARTIAL` units are not 102 equally important defects. They consolidate into the following capability gaps:

| Gap family | Current state | Affected checklist topics | Assessment consequence |
|---|---|---|---|
| Data representation and calculation | Fragmented examples, no canonical foundation | SI/IEC conversions, Mbit/s↔MB/s, hexadecimal, image/audio sizing, compression, ASCII/Unicode/UTF-8 | Learners can solve the taught subnet/energy examples, but cannot reliably transfer the method to general data-size tasks. |
| Client installation and boot | Administration after installation is strong; installation path is absent | FAT32/ext4, process/thread/multitasking distinction, install/partition/format, BIOS/UEFI/POST/bootloader, practical network/driver setup | Neither completion banks nor mixed practice can assess a workflow that is not taught. |
| IPv6 and WLAN/service edges | IPv4 and core services are strong; modern edge topics are mostly mentions or absent | IPv6 addressing/shortening/scopes/SLAAC, hotspot, WPA2/WPA3, PSK/Enterprise, TCP handshake, FTP/POP3/IMAP, tagged/untagged, VPN, PoE/DSL, SMTP/RDP/NTP | Existing network assessment overstates breadth if interpreted as covering the whole checklist. |
| Structured BSI method | Security threats, controls and cryptography are strong | IT-Grundschutz, protection-needs analysis and tiers, personnel/infrastructure measures | Learners can select controls but are not trained to derive them using the requested framework. |
| Commercial/project calculation edges | Main calculation families are strong | free float, explicit break-even and hourly rate | Small but concrete calculation types are unassessed. |
| Contract and information-work edges | Core contracts and communication are strong | delivery/payment delay, AGB, delivery-specific defect handling, source evaluation, result presentation | Scenario reasoning is good within the existing scope but omits these requested decisions. |
| Practical integration | Individual modules contain good scenarios | end-to-end procurement and multi-topic AP1 cases | The learner rarely has to extract requirements, calculate, compare, justify, and document in one task. |

Coverage and availability in mixed assessment must be kept separate: the eight completion-only modules are not content gaps, but their 96 questions cannot currently appear in Practice Quiz or IHK simulation. That is an assessment-architecture gap covering Programming, UML, Project Management, Economics, Software/Licensing, Virtualization/Cloud, Customer/Contracts, and Quality/Handover.

## 7. Calculation coverage

| Calculation family | Theory | Worked example | Learner exercise | Quiz assessment | Decision |
|---|---|---|---|---|---|
| Subnetting, network/broadcast and host counts | Yes | Yes | Yes | Yes | Strong; `subnetting` is a canonical calculation owner. |
| Network data rate/data amount | Thin | One isolated transfer example | Thin | Thin | `PARTIAL`; variation and unit conversion are missing. |
| Transfer duration | Yes | Yes | Yes | Yes | `CROSS-COVERED` by Hardware (`leistung-energie-und-kapazitaet`). |
| P = U×I, energy over time, efficiency | Yes | Yes | Yes | Yes | Strong Hardware calculation sequence. |
| SI/IEC and decimal/binary storage units | Thin | One GB/GiB example | Thin | Thin | `PARTIAL`; needs systematic conversion practice. |
| Mbit/s ↔ MB/s | No | No | No | No | `MISSING`; blocks reliable transfer calculations. |
| Image size (resolution × colour depth) | No | No | No | No | `MISSING`. |
| Audio size (rate × depth × channels × duration) | No | No | No | No | `MISSING`. |
| Project network plan | Yes | Yes | Yes | Yes | Strong for early/latest dates, total float and critical path; free float is missing. |
| Rabatt, Skonto and VAT | Yes | Yes | Yes | Yes | Strong; implemented through Economics lessons and calculation helpers. |
| TCO and amortization | Yes | Yes | Yes | Yes | Strong. |
| Profitability and contribution margin | Yes | Yes | Yes | Yes | Strong; explicit break-even point remains thin. |
| Weighted utility analysis | Yes | Yes | Yes | Yes | Strong multi-criteria comparison exercise. |
| Hourly rate | No | No | No | No | `MISSING`. |

Evidence: `src/app/lernen/[slug]/[lessonSlug]/page.tsx`, `src/app/components/learning/hardware-lessons.tsx`, `src/app/components/learning/project-management-lessons.tsx`, `src/app/lib/project-network.ts`, `src/app/components/learning/economics-lessons.tsx`, `src/app/lib/economic-calculations.ts`, and the corresponding question groups in `src/app/data/quiz-bank/question-bank.ts`.

The current mix is therefore not “calculation weak” everywhere: network addressing, electricity, project scheduling, and commercial comparison are substantive. The gap is a missing general data-calculation layer and three bounded calculation types (free float, break-even, hourly rate).

## 8. Practice and exercise coverage

The repository provides meaningful application rather than pure reading in its strongest areas:

- Subnetting uses address, broadcast, range and host-count tasks.
- Hardware combines workstation selection, accessibility, power/energy and transfer-time decisions.
- Programming uses desk checks, output prediction and error/boundary reasoning.
- UML/ER uses interpretation and model-selection tasks.
- Project Management uses Gantt/network-plan calculations and method decisions.
- Economics uses discounts, VAT, TCO, amortization and weighted utility analysis.
- Customer, Quality and Troubleshooting use SLA, test-case, ticket, diagnosis and handover scenarios.

The clearest exercise gaps are data-rate/data-amount variation, number-system/encoding tasks, image/audio calculation, installation/boot workflows, IPv6/WLAN configuration reasoning, and a full procurement case from requirements through documented recommendation. The existing application scenarios are mostly module-local. Mixed scenarios such as workstation procurement, network incident, cloud selection, or project delivery are not a systematic practice layer.

All 107 lessons in the newer 16-module content families declare an application scenario and solution through `FundamentalsLesson`; many add an interactive check or practice exercise. The 55 older lessons use specialized route-local content/check components. Because the implementation is heterogeneous, this audit does not infer an exact per-lesson interactive-check total from component names. No routed lesson is missing, but “lesson exists” should not be read as equal practical depth.

The module-size review found no count-only reason to split or merge. The densest nine-lesson modules are coherent. The six-lesson Customer/Contracts and Quality/Handover modules are broad, but their main depth issue is assessment difficulty (no hard bank questions), not fragmentation.

## 9. Completion quiz coverage

Every canonical module has a completion quiz. All 336 canonical question IDs are used exactly through completion definitions. “Scenario” below is a qualitative inspection of contextual/application prompts; the data model has no scenario flag. “Calculation” records explicit numeric or algorithmic working, not ordinary recall.

| Module | Completion | Questions (SC/MS) | Scenario emphasis | Calculation | Mixed-pool status and notable gap |
|---|---|---:|---|---|---|
| `arbeitsplatz-hardware` | YES | 12 (8/4) | Strong selection cases | Yes: power/energy/transfer | Practice-eligible; no NIC/resolution/Green-IT assessment. |
| `windows-grundlagen` | YES | 16 (8/8) | Administration/diagnosis | No dedicated numeric task | Practice-eligible; installation/boot/filesystem gaps follow content. |
| `linux-grundlagen` | YES | 17 (8/9) | Shell/permissions/operations | No | Practice-eligible; no ext4/install/boot coverage. |
| `osi-tcp-ip-modell` | YES | 12 (9/3) | Layer/protocol assignment | No | Practice-eligible; no handshake or general encoding depth. |
| `netzwerk-koppelelemente` | YES | 12 (8/4) | Device selection | No | Practice-eligible; WLAN/PoE/DSL edges remain thin. |
| `netzwerktopologien` | YES | 12 (8/4) | Design/failure cases | No | Practice-eligible; VPN/tagging are thin. |
| `ipv4-grundlagen` | YES | 12 (9/3) | Address interpretation | Yes: binary/address logic | Practice-eligible; no IPv6 transfer. |
| `subnetting` | YES | 15 (9/6) | Strong address planning | Yes: hosts/ranges | Practice-eligible; strong. |
| `dhcp` | YES | 15 (11/4) | DORA/configuration failures | No | Practice-eligible; strong within scope. |
| `dns` | YES | 15 (7/8) | Resolution/record diagnosis | No | Practice-eligible; strong within scope. |
| `webserver-grundlagen` | YES | 15 (10/5) | HTTP/TLS/operations | No | Practice-eligible; TLS ownership is sound. |
| `active-directory-grundlagen` | YES | 18 (9/9) | Identity/domain scenarios | No | Practice-eligible; domain-join concept, not hands-on execution. |
| `virtualisierung-und-cloud` | YES | 12 (7/5) | Platform/cloud decisions | No | Completion-only; only one hard question and FaaS is thin. |
| `storage-und-raid` | YES | 12 (7/5) | RAID/storage decisions | Capacity/failure reasoning | Practice-eligible; supplemental to this AP1 checklist. |
| `backup-datensicherung` | YES | 15 (10/5) | Restore-chain/ransomware cases | Restore/storage reasoning | Practice-eligible; hot/cold and concrete media are absent/thin. |
| `netzwerkfehler-systematisch-analysieren` | YES | 18 (9/9) | Strong end-to-end diagnosis | Address/path reasoning | Practice-eligible; strong. |
| `it-sicherheit` | YES | 12 (7/5) | Threat/control decisions | No | Practice-eligible; BSI protection-needs framework absent. |
| `datenschutz` | YES | 12 (6/6) | Workplace data cases | No | Practice-eligible; strong. |
| `programmierung-und-pseudocode` | YES | 12 (7/5) | Desk checks/errors | Yes: trace/output | Completion-only; completion-of-code task depth is thin. |
| `uml-und-datenmodellierung` | YES | 12 (7/5) | Diagram/model interpretation | No | Completion-only; strong within checklist. |
| `projektmanagement` | YES | 12 (6/6) | Planning/method cases | Yes: network plan | Completion-only; free float absent. |
| `wirtschaftlichkeit-und-beschaffung` | YES | 12 (7/5) | Offer/decision cases | Yes: five calculation questions | Completion-only; break-even/hourly-rate gaps. |
| `software-und-lizenzierung` | YES | 12 (8/4) | Selection/licence cases | No | Completion-only; only one hard question. |
| `kundenauftrag-kommunikation-und-vertraege` | YES | 12 (8/4) | Requirements/SLA/contracts | No | Completion-only; 11 medium, one easy, no hard; delay/AGB gaps. |
| `qualitaetssicherung-und-uebergabe` | YES | 12 (8/4) | Testing/service/handover | No | Completion-only; 11 medium, one easy, no hard. |

Question-bank difficulty totals by module were inspected as well. The weakest difficulty spread is not question count but the lack of hard items in Customer/Contracts and Quality/Handover. Virtualization/Cloud and Software/Licensing each have only one hard item. This does not invalidate the completion quiz, but it limits deeper discrimination and integrated scenario pressure.

## 10. Practice Quiz coverage

The Practice Quiz selects 15 questions with fixed difficulty quotas (4 easy, 8 medium, 3 hard) and type quotas (8 single-choice, 7 multiple-selection). It balances the learner's chosen categories/modules and is deterministic under its seeded selection inputs. Evidence: `src/app/data/quiz-bank/practice-config.ts`, `src/app/data/quiz-bank/practice-selection.ts`, `src/app/data/quiz-bank/categories.ts`, and `tests/quiz-engine.test.mts`.

Its source pool is the 240 `practiceEligible` questions from 17 modules. The following 96 completion questions can never appear:

- Programming/Pseudocode: 12
- UML/Data Modelling: 12
- Project Management: 12
- Economics/Procurement: 12
- Software/Licensing: 12
- Virtualization/Cloud: 12
- Customer/Communication/Contracts: 12
- Quality/Handover: 12

This is an important mixed-practice hole, not a failure of the eight completion quizzes. It removes whole task families such as pseudocode, diagrams, network-plan/commercial calculations, licence/customer decisions, and QA/handover from spaced mixed rehearsal. No category-persistence or selection logic was changed in this audit.

## 11. IHK simulation coverage

The current simulation uses 30 questions, a 45-minute timer, and a pass threshold of exactly 15/30. Selection targets are 8 easy, 16 medium, 6 hard and 16 single-choice/14 multiple-selection. Four legacy categories receive seven questions each; two seeded categories receive one additional question, producing a 7/7/8/8 distribution. Evidence: `src/app/lib/ihk-exam.ts`, `src/app/lib/server/ihk-exam-selection.ts`, `src/app/data/quiz-bank/categories.ts`, and `tests/ihk-exam.test.mts`.

The simulation filters the same `practiceEligible` pool as Practice Quiz. It therefore uses only 17 of 25 modules and excludes all 96 questions from the eight modules listed in section 10, including every Batch-26/27 question and Virtualization/Cloud. Batch-25 Security/Privacy content can appear; Storage/RAID can also appear despite being supplemental for this supplied AP1 checklist.

The four-category taxonomy is `netzwerk-grundlagen`, `netzwerk-dienste`, `systeme-und-betrieb`, and `troubleshooting`. Networking plus Troubleshooting necessarily occupy 14–16 of 30 slots, and the single Troubleshooting module alone contributes 7–8. This creates a material legacy-networking skew relative to the expanded 25-module curriculum.

There is no explicit scenario, calculation, or multi-topic quota/tag. Such questions can be selected only incidentally through category/difficulty/type balancing. The timer and pass calculation are internally consistent, but the simulation does not represent the full supplied checklist and should not be described as a comprehensive 25-module AP1 simulation.

## 12. Cross-module overlap and canonical ownership

| Concept | Canonical owner | Contextual references | Finding |
|---|---|---|---|
| TLS/HTTPS trust and transport | Webserver | Security | Healthy cross-link; no redundant full lesson. |
| Requirements and customer need | Customer/Communication | Project documents; Hardware/Software selection | Customer owns elicitation, Project owns formal artefacts, selection modules consume requirements. |
| Procurement and offer comparison | Economics/Procurement | Hardware, Software, Customer and Cloud | Economics owns comparison/calculation; other modules provide domain criteria. An integrated exercise is missing, not another theory owner. |
| Backup versus RAID | Backup for recoverability | Storage/RAID for availability/performance | Deliberate and correct boundary. |
| Technical isolation versus service process | Troubleshooting for diagnosis | Quality/Handover for ticket, escalation, verification and closure | Complementary, not duplicate. |
| Virtualization/cloud decisions | Virtualization/Cloud | Security, Privacy and Economics for risk/cost context | Correct ownership; mixed assessment is the problem. |
| Acceptance, tests and handover | Quality/Handover | Customer/Contracts and Project | Quality owns evidence/process; Contract owns legal acceptance; Project owns control. |
| OS permissions | Windows/Linux respectively | Security least privilege | Necessary platform-specific treatment. |
| Statutory defect rights versus guarantee | Customer/Contracts | Economics procurement reminder | Small genuine repetition. Keep Customer/Contracts canonical and Economics contextual. |

No other harmful full-section duplication was found. Repeated one-sentence reminders generally establish needed context rather than fragment ownership.

## 13. Supplemental FISI content

| Explicit non-priority topic | Status | Repository finding | Recommendation |
|---|---|---|---|
| RAID | SUPPLEMENTAL-FISI | Dedicated `storage-und-raid` module, six lessons and 12 completion/Practice questions | Retain as useful FISI/AP2/workplace material; do not count as AP1 gap. |
| SAN | SUPPLEMENTAL-FISI | No substantive content | Do not add merely for this checklist. |
| SQL queries | SUPPLEMENTAL-FISI | Not taught; Modeling explicitly limits itself to models rather than query syntax | Keep out of AP1 gap totals. |
| NoSQL | SUPPLEMENTAL-FISI | No substantive content | Keep out of AP1 gap totals. |
| Struktogramm | SUPPLEMENTAL-FISI | No substantive content | Keep out of AP1 gap totals. |
| Programmablaufplan | SUPPLEMENTAL-FISI | No substantive content | Keep out of AP1 gap totals. |
| OOP inheritance | SUPPLEMENTAL-FISI | Deliberately not part of the Programming scope | Do not treat as missing AP1 content. |

## 14. Misconception and content-risk findings

All requested spot checks produced the correct distinction; no factual repair is required in this Batch.

| Risk | Result | Evidence/example |
|---|---|---|
| M.2 = NVMe | PASS | Hardware distinguishes form factor from protocol/interface. |
| RAID = Backup | PASS | Storage and Backup explicitly separate availability from independent recoverability. |
| Snapshot = Backup | PASS | Backup treats snapshots as insufficient without independent copies. |
| Container = VM | PASS | Virtualization compares shared kernel with full guest OS. |
| Cloud = automatic HA/security | PASS | Cloud lessons require explicit architecture/responsibility decisions. |
| Hash = reversible encryption | PASS | Security distinguishes one-way integrity evidence from encryption. |
| HTTPS = trustworthy content | PASS | Webserver/Security distinguish protected transport and identity from content truth. |
| Pseudonymization = anonymization | PASS | Privacy distinguishes reversible separation from irreversible loss of relation. |
| Licence = ownership | PASS | Software/Licensing teaches usage rights rather than transfer of ownership. |
| Open Source = free of cost | PASS | Licence content rejects this equivalence. |
| Guarantee = statutory defect rights | PASS | Customer/Contracts distinguishes voluntary guarantee from statutory rights. |
| Dienstvertrag = Werkvertrag | PASS | Contract content distinguishes activity owed from result owed. |
| Response time = resolution time | PASS | SLA content distinguishes acknowledgment/reaction from restoration/resolution. |
| Requirement = solution | PASS | Customer/Project content separates need/requirement from implementation. |
| QA = QM | PASS | Quality module distinguishes operational assurance from the management system. |

Evidence is distributed across the named canonical lessons and corresponding assertions/question groups in `tests/learning-content.test.mts` and `src/app/data/quiz-bank/question-bank.ts`.

## 15. Stale and internal consistency findings

- No stale current module, lesson, total-question, Practice-eligible, or completion-only count was found in the inspected curriculum data and tests. Current assertions cover 25 modules, 336 questions, a 240/96 pool split and exact five-phase membership.
- No duplicate canonical module/lesson slug, orphaned completion question, missing completion quiz, or learning-path omission/duplication was detected by the current integrity tests.
- No link to a renamed or removed canonical learning concept was identified in the routed curriculum checks.
- The main structural inconsistency is semantic rather than broken data: Practice Quiz/IHK categories cover 17 modules and retain four legacy category buckets while the canonical curriculum has grown to 25 modules. This is internally deliberate and tested, but it is stale as a representation of the full curriculum.
- The category label/distribution makes the IHK simulation appear broader than its eligible pool. Documentation/UI should avoid implying full-curriculum coverage until the pool and taxonomy change.
- No factual error was found in the misconception spot-check set. This remains a repository audit, not an independent guarantee about the February 2027 examination.

## 16. Critical, important and minor gaps

### CRITICAL

1. **Data and calculation fundamentals:** the absence of general units, Mbit/s↔MB/s, hexadecimal, image/audio sizing and encoding materially blocks a complete calculation/data-representation task family.
2. **Client setup and boot fundamentals:** installation, partitioning, formatting, FAT32/ext4 and BIOS/UEFI/POST/bootloader are missing as a coherent operational sequence.
3. **Mixed practice and simulation curriculum gap:** eight modules and 96 valid questions are excluded, so major taught AP1 families cannot be rehearsed or simulated together.

### IMPORTANT

- IPv6, WLAN security and selected protocol/service fundamentals need a coherent networking extension.
- BSI IT-Grundschutz and protection-needs analysis need a focused framework lesson and application.
- Integrated multi-topic cases are needed for procurement, network incidents, cloud selection and delivery.
- Free float, explicit break-even and hourly-rate calculations need short but complete exercise/assessment sequences.
- Delivery/payment delay, AGB, delivery-specific defects, source evaluation and result presentation need bounded additions.

### MINOR

- Peer-to-peer and legacy `ifconfig` terminology.
- Display resolution, optical-media comparison, storage lifetime/energy detail, Green IT and recycling.
- Hot/cold Backup, FaaS depth, pseudocode completion tasks and explicit procedural/OOP comparison.

Severity reflects impact on a task family, not the number of checklist bullets.

## 17. Recommended future implementation packages

### NEXT CONTENT BATCH — Data & Calculation Fundamentals

**Purpose:** establish a reusable foundation before learners meet network, storage, media and commercial calculations.

**Topics:** bit/byte; SI/IEC ladders; decimal/binary conversion; Mbit/s↔MB/s; rate/amount/time; binary/decimal/hex; powers of two; image/audio sizing; compression; ASCII/Unicode/UTF-8.

**Why:** this is the largest coherent content gap and cannot be solved by adding isolated quiz questions.

**Existing modules to extend:** link examples from Hardware, IPv4 and Subnetting back to the foundation rather than duplicating theory.

**New module required:** **YES**.

### LATER CONTENT BATCH — Client Setup, Boot and Filesystems

**Purpose:** connect pre-installation, installation, boot and post-installation client configuration.

**Topics:** FAT32/ext4/NTFS comparison; process/thread/multitasking; BIOS/UEFI/POST/bootloader; partition/format/install; driver lifecycle; DHCP/static configuration; remote access.

**Existing modules to extend:** Windows and Linux; add shared installation material only once.

**New module required:** **NO initially**; extend the two OS modules with a shared conceptual sequence, then reassess size.

### LATER CONTENT BATCH — IPv6, WLAN and Network-Service Essentials

**Purpose:** close modern networking edges without diluting the strong IPv4 path.

**Topics:** IPv6 notation/scopes/SLAAC; WLAN modes/security; TCP handshake; tagged/untagged; VPN; selected checklist services; PoE/DSL.

**Existing modules to extend:** OSI/TCP-IP, Network Devices, Topologies and Troubleshooting.

**New module required:** **YES for IPv6**; WLAN/service edges can extend existing owners.

### LATER CONTENT BATCH — BSI and Bounded Business/Contract Gaps

**Purpose:** add structured security analysis and the remaining small project/economic/legal capabilities.

**Topics:** IT-Grundschutz/protection needs; free float; break-even; hourly rate; delay/AGB/defective delivery; source evaluation/presentation.

**Existing modules to extend:** Security, Project, Economics and Customer/Contracts.

**New module required:** **NO**.

### NEXT PRACTICE BATCH — Integrated AP1 Application

**Purpose:** require learners to combine requirements extraction, calculation, comparison, troubleshooting and documentation.

**Topics:** workstation procurement, network incident, cloud selection and project delivery; calculation-in-prose; English technical extract; documented rationale.

**Existing modules to extend:** reuse canonical owners and link them through scenario sets.

**New module required:** **NO**; this is a cross-module practice layer.

### NEXT EXAM-SIMULATION BATCH — Full-Curriculum Pool and Rebalancing

**Purpose:** allow all intended AP1 content to appear and prevent legacy-network overrepresentation.

**Topics:** eligibility/category migration for the eight excluded modules; documented blueprint; scenario/calculation quotas or tags; representative distribution; persistence compatibility.

**Existing modules to extend:** none; change quiz taxonomy/selection with regression tests.

**New module required:** **NO**.

## 18. Recommended immediate next Batch

**Batch 29 — Data & Calculation Fundamentals** should be the immediate implementation Batch.

Its acceptance target should be one canonical module with a deterministic learning-path position before network calculations; lessons and learner exercises for units, rates and duration, number systems, image/audio sizing, compression and text encoding; a completion quiz with single- and multiple-selection plus realistic calculations; and eligibility for mixed Practice/IHK only after the taxonomy change is designed safely. Existing Hardware, IPv4 and Subnetting content should cross-link to the new owner and retain their domain-specific applications.

The Batch must preserve exact arithmetic/rounding rules in tested pure helpers, include worked and independent exercises, and avoid duplicating the same conversion theory across multiple modules. After that content foundation, the highest-value sequence is Client Setup/Boot, Practice/IHK taxonomy expansion, IPv6/WLAN, then integrated scenario practice and the bounded BSI/business/contract gaps.
