import type { ModuleCompletionDefinition } from "./types.ts";

export const moduleCompletionDefinitions = [
  {
    "id": "ipv4-grundlagen-abschlussquiz",
    "moduleSlug": "ipv4-grundlagen",
    "title": "Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen fünf Lektionen der IPv4 Grundlagen.",
    "questionIds": [
      "ipv4-grundlagen:ip-purpose",
      "ipv4-grundlagen:ip-can-change",
      "ipv4-grundlagen:ipv4-bits-octets",
      "ipv4-grundlagen:valid-notation",
      "ipv4-grundlagen:subnet-purpose",
      "ipv4-grundlagen:prefix-24",
      "ipv4-grundlagen:private-172-boundary",
      "ipv4-grundlagen:loopback",
      "ipv4-grundlagen:link-local",
      "ipv4-grundlagen:network-address",
      "ipv4-grundlagen:broadcast-address",
      "ipv4-grundlagen:network-concepts"
    ]
  },
  {
    "id": "subnetting-abschlussquiz",
    "moduleSlug": "subnetting",
    "title": "Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sechs Subnetting-Lektionen.",
    "questionIds": [
      "subnetting:subnetting-purpose",
      "subnetting:subnetting-boundary",
      "subnetting:prefix-26-mask",
      "subnetting:prefix-27-host-bits",
      "subnetting:valid-prefix-mappings",
      "subnetting:prefix-26-capacity",
      "subnetting:prefix-27-capacity",
      "subnetting:address-count-rule",
      "subnetting:range-192-168-20",
      "subnetting:range-10-0-0",
      "subnetting:boundaries-not-fixed",
      "subnetting:planning-45-hosts",
      "subnetting:overlap",
      "subnetting:lab-gateway",
      "subnetting:lab-invalid-hosts"
    ]
  },
  {
    "id": "dhcp-abschlussquiz",
    "moduleSlug": "dhcp",
    "title": "Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sechs DHCP-Lektionen.",
    "questionIds": [
      "dhcp:dhcp-purpose",
      "dhcp:dhcp-values",
      "dhcp:dora-order",
      "dhcp:ports",
      "dhcp:offer",
      "dhcp:lease",
      "dhcp:pool",
      "dhcp:reservation",
      "dhcp:relay",
      "dhcp:remote-pool",
      "dhcp:link-local",
      "dhcp:remote-failure",
      "dhcp:exhaustion",
      "dhcp:filius-pool",
      "dhcp:filius-special"
    ]
  },
  {
    "id": "dns-abschlussquiz",
    "moduleSlug": "dns",
    "title": "Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sechs DNS-Lektionen.",
    "questionIds": [
      "dns:dns-purpose",
      "dns:dns-dhcp",
      "dns:root-referral",
      "dns:resolver-cache",
      "dns:dns-ports",
      "dns:address-records",
      "dns:mail-reverse",
      "dns:ns-txt-srv",
      "dns:zone-delegation",
      "dns:authority-glue",
      "dns:dns-next-step",
      "dns:dns-outcomes",
      "dns:stale-answer",
      "dns:filius-config",
      "dns:filius-fault"
    ]
  },
  {
    "id": "osi-tcp-ip-modell-abschlussquiz",
    "moduleSlug": "osi-tcp-ip-modell",
    "title": "OSI- & TCP/IP-Abschlussquiz",
    "description": "Prüfe Schichten, Protokolle, Kapselung und die schichtenorientierte Fehlersuche.",
    "questionIds": [
      "osi-tcp-ip-modell:models-purpose",
      "osi-tcp-ip-modell:models-limits",
      "osi-tcp-ip-modell:seven-pdu",
      "osi-tcp-ip-modell:l2-address",
      "osi-tcp-ip-modell:routing-layer",
      "osi-tcp-ip-modell:transport-tcp",
      "osi-tcp-ip-modell:udp-properties",
      "osi-tcp-ip-modell:tcpip-application",
      "osi-tcp-ip-modell:mapping",
      "osi-tcp-ip-modell:encapsulation-order",
      "osi-tcp-ip-modell:router-frame",
      "osi-tcp-ip-modell:troubleshoot-https"
    ]
  },
  {
    "id": "netzwerk-koppelelemente-abschlussquiz",
    "moduleSlug": "netzwerk-koppelelemente",
    "title": "Koppelelemente-Abschlussquiz",
    "description": "Prüfe Gerätefunktionen, Weiterleitungsentscheidungen und Netzwerkdomänen anhand realistischer Fälle.",
    "questionIds": [
      "netzwerk-koppelelemente:device-information",
      "netzwerk-koppelelemente:multifunction",
      "netzwerk-koppelelemente:hub-behavior",
      "netzwerk-koppelelemente:hub-to-switch",
      "netzwerk-koppelelemente:bridge-switch",
      "netzwerk-koppelelemente:switch-learning",
      "netzwerk-koppelelemente:unknown-unicast",
      "netzwerk-koppelelemente:router-subnets",
      "netzwerk-koppelelemente:router-domains",
      "netzwerk-koppelelemente:gateway-context",
      "netzwerk-koppelelemente:access-point",
      "netzwerk-koppelelemente:domains-selection"
    ]
  },
  {
    "id": "netzwerktopologien-abschlussquiz",
    "moduleSlug": "netzwerktopologien",
    "title": "Netzwerktopologien-Abschlussquiz",
    "description": "Prüfe Struktur, Ausfallverhalten und Auswahl physischer und logischer Topologien.",
    "questionIds": [
      "netzwerktopologien:physical-logical",
      "netzwerktopologien:no-best",
      "netzwerktopologien:bus-failure",
      "netzwerktopologien:ring-resilience",
      "netzwerktopologien:star-cable",
      "netzwerktopologien:star-center",
      "netzwerktopologien:tree-uplink",
      "netzwerktopologien:full-mesh-links",
      "netzwerktopologien:partial-mesh",
      "netzwerktopologien:hybrid",
      "netzwerktopologien:vlan-trunk",
      "netzwerktopologien:selection"
    ]
  },
  {
    "id": "webserver-grundlagen-abschlussquiz",
    "moduleSlug": "webserver-grundlagen",
    "title": "Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sechs Lektionen der Webserver Grundlagen.",
    "questionIds": [
      "webserver-grundlagen:web-role",
      "webserver-grundlagen:web-transports",
      "webserver-grundlagen:request-target",
      "webserver-grundlagen:http-parts",
      "webserver-grundlagen:url-fragment",
      "webserver-grundlagen:auth-status",
      "webserver-grundlagen:status-gateway",
      "webserver-grundlagen:https-goals",
      "webserver-grundlagen:hostname-mismatch",
      "webserver-grundlagen:certificate-trust",
      "webserver-grundlagen:troubleshoot-404",
      "webserver-grundlagen:troubleshoot-502",
      "webserver-grundlagen:troubleshoot-tls",
      "webserver-grundlagen:lab-host",
      "webserver-grundlagen:lab-bad-record"
    ]
  },
  {
    "id": "linux-grundlagen-abschlussquiz",
    "moduleSlug": "linux-grundlagen",
    "title": "Linux Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sieben Lektionen der Linux Grundlagen.",
    "questionIds": [
      "linux-grundlagen:linux-kernel-distro",
      "linux-grundlagen:linux-shell-terminal",
      "linux-grundlagen:linux-pwd",
      "linux-grundlagen:linux-command-basics",
      "linux-grundlagen:linux-root-path",
      "linux-grundlagen:linux-path-types",
      "linux-grundlagen:linux-touch",
      "linux-grundlagen:linux-file-actions",
      "linux-grundlagen:linux-glob-file",
      "linux-grundlagen:linux-644",
      "linux-grundlagen:linux-directory-x",
      "linux-grundlagen:linux-permission-policy",
      "linux-grundlagen:linux-process-service",
      "linux-grundlagen:linux-systemctl",
      "linux-grundlagen:linux-packages",
      "linux-grundlagen:linux-inventory-network",
      "linux-grundlagen:linux-inventory-readonly"
    ]
  },
  {
    "id": "windows-grundlagen-abschlussquiz",
    "moduleSlug": "windows-grundlagen",
    "title": "Windows Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sechs Lektionen der Windows Grundlagen.",
    "questionIds": [
      "windows-grundlagen:windows-terminal",
      "windows-grundlagen:windows-uac",
      "windows-grundlagen:windows-shell-command",
      "windows-grundlagen:windows-shell-identity",
      "windows-grundlagen:windows-drive",
      "windows-grundlagen:windows-unc",
      "windows-grundlagen:windows-data-paths",
      "windows-grundlagen:windows-auth",
      "windows-grundlagen:windows-sid-groups",
      "windows-grundlagen:windows-ntfs",
      "windows-grundlagen:windows-process-service",
      "windows-grundlagen:windows-service-manual",
      "windows-grundlagen:windows-events-software-update",
      "windows-grundlagen:windows-inventory-network",
      "windows-grundlagen:windows-inventory-readonly",
      "windows-grundlagen:windows-inventory-evidence"
    ]
  },
  {
    "id": "active-directory-grundlagen-abschlussquiz",
    "moduleSlug": "active-directory-grundlagen",
    "title": "Active Directory Abschlussquiz",
    "description": "Prüfe dein Wissen aus allen sieben Lektionen der Active Directory Grundlagen.",
    "questionIds": [
      "active-directory-grundlagen:ad-purpose",
      "active-directory-grundlagen:ad-local-domain",
      "active-directory-grundlagen:ad-structure",
      "active-directory-grundlagen:ad-ou-group",
      "active-directory-grundlagen:ad-sid",
      "active-directory-grundlagen:ad-groups",
      "active-directory-grundlagen:ad-agdlp",
      "active-directory-grundlagen:ad-dc",
      "active-directory-grundlagen:ad-srv",
      "active-directory-grundlagen:ad-sites-time",
      "active-directory-grundlagen:ad-gpo-definition",
      "active-directory-grundlagen:ad-gpo-context",
      "active-directory-grundlagen:ad-gpo-diagnosis",
      "active-directory-grundlagen:ad-ts-dns",
      "active-directory-grundlagen:ad-ts-authorization",
      "active-directory-grundlagen:ad-ts-token",
      "active-directory-grundlagen:ad-design",
      "active-directory-grundlagen:ad-practice-safety"
    ]
  },
  {
    "id": "backup-datensicherung-abschlussquiz",
    "moduleSlug": "backup-datensicherung",
    "title": "Backup & Datensicherung Abschlussquiz",
    "description": "Prüfe Backup-Arten, Restore-Ketten, 3-2-1-1-0, RPO/RTO und sichere Wiederherstellung.",
    "questionIds": [
      "backup-datensicherung:raid-not-backup",
      "backup-datensicherung:sync-not-backup",
      "backup-datensicherung:backup-properties",
      "backup-datensicherung:incremental-definition",
      "backup-datensicherung:differential-definition",
      "backup-datensicherung:incremental-chain",
      "backup-datensicherung:differential-chain",
      "backup-datensicherung:snapshot",
      "backup-datensicherung:levels",
      "backup-datensicherung:three-two-one",
      "backup-datensicherung:three-two-one-one-zero",
      "backup-datensicherung:gfs",
      "backup-datensicherung:rpo",
      "backup-datensicherung:rto-controls",
      "backup-datensicherung:restore-test"
    ]
  },
  {
    "id": "netzwerkfehler-systematisch-analysieren-abschlussquiz",
    "moduleSlug": "netzwerkfehler-systematisch-analysieren",
    "title": "Abschlussquiz",
    "description": "Prüfe deine evidenzbasierte Fehlersuche über alle sechs Lektionen – vom ersten Symptom bis zur Anwendung.",
    "questionIds": [
      "netzwerkfehler-systematisch-analysieren:nt-method-first-step",
      "netzwerkfehler-systematisch-analysieren:nt-method-controlled-test",
      "netzwerkfehler-systematisch-analysieren:nt-method-ping",
      "netzwerkfehler-systematisch-analysieren:nt-client-apipa",
      "netzwerkfehler-systematisch-analysieren:nt-client-roles",
      "netzwerkfehler-systematisch-analysieren:nt-client-mask-arp",
      "netzwerkfehler-systematisch-analysieren:nt-routing-default",
      "netzwerkfehler-systematisch-analysieren:nt-routing-longest-prefix",
      "netzwerkfehler-systematisch-analysieren:nt-routing-evidence",
      "netzwerkfehler-systematisch-analysieren:nt-dhcp-options",
      "netzwerkfehler-systematisch-analysieren:nt-dns-outcomes",
      "netzwerkfehler-systematisch-analysieren:nt-dhcp-dns-separation",
      "netzwerkfehler-systematisch-analysieren:nt-service-transport",
      "netzwerkfehler-systematisch-analysieren:nt-service-symptoms",
      "netzwerkfehler-systematisch-analysieren:nt-service-503",
      "netzwerkfehler-systematisch-analysieren:nt-practice-refused",
      "netzwerkfehler-systematisch-analysieren:nt-practice-http",
      "netzwerkfehler-systematisch-analysieren:nt-practice-local-incidents"
    ]
  },
  {
    "id": "arbeitsplatz-hardware-abschlussquiz", "moduleSlug": "arbeitsplatz-hardware", "title": "Arbeitsplatz & Hardware Abschlussquiz", "description": "Prüfe Hardwareauswahl, Kompatibilität, Schnittstellen und Grundrechnungen.",
    "questionIds": ["arbeitsplatz-hardware:cpu-comparison", "arbeitsplatz-hardware:von-neumann", "arbeitsplatz-hardware:ram-storage", "arbeitsplatz-hardware:compatibility", "arbeitsplatz-hardware:m2-nvme", "arbeitsplatz-hardware:storage-choice", "arbeitsplatz-hardware:thin-client", "arbeitsplatz-hardware:peripherals", "arbeitsplatz-hardware:office-procurement", "arbeitsplatz-hardware:bottleneck", "arbeitsplatz-hardware:power-energy", "arbeitsplatz-hardware:gb-gib-transfer"]
  },
  {
    "id": "storage-und-raid-abschlussquiz", "moduleSlug": "storage-und-raid", "title": "Storage & RAID Abschlussquiz", "description": "Prüfe RAID-Level, Kapazitäten, Rebuild und die Abgrenzung zu Backup.",
    "questionIds": ["storage-und-raid:concepts", "storage-und-raid:degraded", "storage-und-raid:raid0", "storage-und-raid:raid1-delete", "storage-und-raid:raid5-capacity", "storage-und-raid:raid6-properties", "storage-und-raid:raid10-failure", "storage-und-raid:hot-spare", "storage-und-raid:mixed-raid5", "storage-und-raid:four-drive-capacities", "storage-und-raid:choose", "storage-und-raid:not-backup"]
  },
  {
    "id": "it-sicherheit-abschlussquiz", "moduleSlug": "it-sicherheit", "title": "IT-Sicherheit Abschlussquiz", "description": "Prüfe Schutzziele, Bedrohungen, Hardening und Kryptografie.",
    "questionIds": ["it-sicherheit:disciplines", "it-sicherheit:cia-auth", "it-sicherheit:malware-spread", "it-sicherheit:ransom-response", "it-sicherheit:mitm", "it-sicherheit:phishing-zero-day", "it-sicherheit:hardening", "it-sicherheit:mfa-segmentation", "it-sicherheit:hash", "it-sicherheit:crypto-models", "it-sicherheit:https-trust", "it-sicherheit:ssh-telnet"]
  },
  {
    "id": "datenschutz-abschlussquiz", "moduleSlug": "datenschutz", "title": "Datenschutz Abschlussquiz", "description": "Prüfe Grundsätze, Betroffenenrechte, Pseudonymisierung und Praxisfälle.",
    "questionIds": ["datenschutz:personal-data", "datenschutz:processing-context", "datenschutz:minimization", "datenschutz:principles", "datenschutz:rights", "datenschutz:rights-not-absolute", "datenschutz:pseudonym", "datenschutz:anonymous", "datenschutz:security-difference", "datenschutz:stolen-notebook", "datenschutz:wrong-recipient", "datenschutz:former-employee"]
  },
  {
    "id": "programmierung-und-pseudocode-abschlussquiz", "moduleSlug": "programmierung-und-pseudocode", "title": "Programmierung & Pseudocode Abschlussquiz", "description": "Prüfe Algorithmen, Kontrollstrukturen, Funktionen, Listen und OOP-Grundlagen.",
    "questionIds": ["programmierung-und-pseudocode:algorithm-properties", "programmierung-und-pseudocode:assignment-output", "programmierung-und-pseudocode:data-type", "programmierung-und-pseudocode:boolean-logic", "programmierung-und-pseudocode:condition-boundary", "programmierung-und-pseudocode:switch-use", "programmierung-und-pseudocode:loop-iterations", "programmierung-und-pseudocode:do-while", "programmierung-und-pseudocode:function-interface", "programmierung-und-pseudocode:list-index", "programmierung-und-pseudocode:oop-elements", "programmierung-und-pseudocode:error-analysis"]
  },
  {
    "id": "uml-und-datenmodellierung-abschlussquiz", "moduleSlug": "uml-und-datenmodellierung", "title": "UML & Datenmodellierung Abschlussquiz", "description": "Prüfe UML-Diagramme, ER-Modelle, Kardinalitäten und relationale Schlüssel.",
    "questionIds": ["uml-und-datenmodellierung:model-purpose", "uml-und-datenmodellierung:diagram-choice", "uml-und-datenmodellierung:use-case-elements", "uml-und-datenmodellierung:use-case-view", "uml-und-datenmodellierung:class-elements", "uml-und-datenmodellierung:class-multiplicity", "uml-und-datenmodellierung:activity-decision", "uml-und-datenmodellierung:activity-parallel", "uml-und-datenmodellierung:er-cardinality", "uml-und-datenmodellierung:many-to-many", "uml-und-datenmodellierung:key-roles", "uml-und-datenmodellierung:redundancy"]
  },
  {
    "id": "projektmanagement-abschlussquiz", "moduleSlug": "projektmanagement", "title": "Projektmanagement Abschlussquiz", "description": "Prüfe Ziele, Planung, Controlling, Netzpläne und Vorgehensmodelle.",
    "questionIds": ["projektmanagement:project-characteristics", "projektmanagement:smart-goal", "projektmanagement:magic-triangle", "projektmanagement:stakeholder-strategy", "projektmanagement:requirements-documents", "projektmanagement:work-package", "projektmanagement:gantt-purpose", "projektmanagement:controlling", "projektmanagement:network-duration", "projektmanagement:critical-path", "projektmanagement:scrum-elements", "projektmanagement:method-choice"]
  },
  {
    "id": "wirtschaftlichkeit-und-beschaffung-abschlussquiz", "moduleSlug": "wirtschaftlichkeit-und-beschaffung", "title": "Wirtschaftlichkeit & Beschaffung Abschlussquiz", "description": "Prüfe Kennzahlen, Angebotsrechnung, TCO, Nutzwertanalyse und Bezugsentscheidungen.",
    "questionIds": ["wirtschaftlichkeit-und-beschaffung:profit", "wirtschaftlichkeit-und-beschaffung:contribution-margin", "wirtschaftlichkeit-und-beschaffung:discount-skonto-tax", "wirtschaftlichkeit-und-beschaffung:net-gross", "wirtschaftlichkeit-und-beschaffung:tco", "wirtschaftlichkeit-und-beschaffung:payback", "wirtschaftlichkeit-und-beschaffung:offer-comparison", "wirtschaftlichkeit-und-beschaffung:warranty-guarantee", "wirtschaftlichkeit-und-beschaffung:utility-score", "wirtschaftlichkeit-und-beschaffung:utility-rules", "wirtschaftlichkeit-und-beschaffung:buy-rent-lease", "wirtschaftlichkeit-und-beschaffung:make-or-buy"]
  },
  {
    "id": "software-und-lizenzierung-abschlussquiz", "moduleSlug": "software-und-lizenzierung", "title": "Software & Lizenzierung Abschlussquiz", "description": "Prüfe Softwareklassen, Auswahlkriterien, Lizenzmodelle und den verantwortungsvollen KI-Einsatz.",
    "questionIds": ["software-und-lizenzierung:software-category", "software-und-lizenzierung:business-apps", "software-und-lizenzierung:interoperability", "software-und-lizenzierung:selection-criteria", "software-und-lizenzierung:open-source", "software-und-lizenzierung:proprietary", "software-und-lizenzierung:concurrent", "software-und-lizenzierung:license-models", "software-und-lizenzierung:named-mismatch", "software-und-lizenzierung:device-scenario", "software-und-lizenzierung:ai-verification", "software-und-lizenzierung:ai-data"]
  },
  {
    "id": "virtualisierung-und-cloud-abschlussquiz", "moduleSlug": "virtualisierung-und-cloud", "title": "Virtualisierung & Cloud Abschlussquiz", "description": "Prüfe Hypervisoren, VM-/Containerarchitektur und Cloud-Service- sowie Bereitstellungsmodelle.",
    "questionIds": ["virtualisierung-und-cloud:hypervisor-role", "virtualisierung-und-cloud:hypervisor-type", "virtualisierung-und-cloud:virtual-resources", "virtualisierung-und-cloud:snapshot", "virtualisierung-und-cloud:vm-container", "virtualisierung-und-cloud:architecture-tradeoffs", "virtualisierung-und-cloud:container-registry", "virtualisierung-und-cloud:container-state", "virtualisierung-und-cloud:service-model", "virtualisierung-und-cloud:deployment-models", "virtualisierung-und-cloud:elasticity", "virtualisierung-und-cloud:cloud-boundaries"]
  },
  {
    "id": "kundenauftrag-kommunikation-und-vertraege-abschlussquiz", "moduleSlug": "kundenauftrag-kommunikation-und-vertraege", "title": "Kundenauftrag, Kommunikation & Verträge Abschlussquiz", "description": "Prüfe Anforderungen, Kommunikation, Vertragsgrundlagen, SLA und Einweisung.",
    "questionIds": ["kundenauftrag-kommunikation-und-vertraege:functional-requirement", "kundenauftrag-kommunikation-und-vertraege:question-types", "kundenauftrag-kommunikation-und-vertraege:requirement-solution", "kundenauftrag-kommunikation-und-vertraege:priority", "kundenauftrag-kommunikation-und-vertraege:feedback", "kundenauftrag-kommunikation-und-vertraege:technical-english", "kundenauftrag-kommunikation-und-vertraege:offer-acceptance", "kundenauftrag-kommunikation-und-vertraege:contract-models", "kundenauftrag-kommunikation-und-vertraege:service-work", "kundenauftrag-kommunikation-und-vertraege:warranty-guarantee", "kundenauftrag-kommunikation-und-vertraege:sla-response", "kundenauftrag-kommunikation-und-vertraege:instruction"]
  },
  {
    "id": "qualitaetssicherung-und-uebergabe-abschlussquiz", "moduleSlug": "qualitaetssicherung-und-uebergabe", "title": "Qualitätssicherung & Übergabe Abschlussquiz", "description": "Prüfe PDCA, Testfälle, Serviceprozesse, Abnahme und sichere Dokumentation.",
    "questionIds": ["qualitaetssicherung-und-uebergabe:qa-qm", "qualitaetssicherung-und-uebergabe:pdca-check", "qualitaetssicherung-und-uebergabe:test-case-fields", "qualitaetssicherung-und-uebergabe:expected-before", "qualitaetssicherung-und-uebergabe:integration-test", "qualitaetssicherung-und-uebergabe:acceptance-test", "qualitaetssicherung-und-uebergabe:defect-record", "qualitaetssicherung-und-uebergabe:incident-problem", "qualitaetssicherung-und-uebergabe:priority", "qualitaetssicherung-und-uebergabe:acceptance-record", "qualitaetssicherung-und-uebergabe:technical-acceptance", "qualitaetssicherung-und-uebergabe:documentation"]
  },
  {
    "id": "datenmengen-zahlensysteme-uebertragungsrechnungen-abschlussquiz",
    "moduleSlug": "datenmengen-zahlensysteme-uebertragungsrechnungen",
    "title": "Datenmengen & Zahlensysteme Abschlussquiz",
    "description": "Prüfe Dateneinheiten, Übertragungsrechnungen, Zahlensysteme sowie Medien- und Textrepräsentation.",
    "questionIds": [
      "datenmengen-zahlensysteme-uebertragungsrechnungen:bit-byte-relation",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:si-iec-rate",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:decimal-conversion",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:terabyte-gibibyte",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:megabit-megabyte-rate",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:transfer-duration",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:binary-decimal",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:hex-binary-mappings",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:image-size",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:audio-compression",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:unicode-utf8",
      "datenmengen-zahlensysteme-uebertragungsrechnungen:integrated-rollout"
    ]
  },
  {
    "id": "clientinstallation-boot-datentraeger-abschlussquiz",
    "moduleSlug": "clientinstallation-boot-datentraeger",
    "title": "Clientinstallation, Boot & Datenträger Abschlussquiz",
    "description": "Prüfe Firmware, Bootkette, Partitionierung, Dateisysteme, Installation und die anschließende Client-Abnahme.",
    "questionIds": [
      "clientinstallation-boot-datentraeger:firmware-post",
      "clientinstallation-boot-datentraeger:boot-media-selection",
      "clientinstallation-boot-datentraeger:boot-chain",
      "clientinstallation-boot-datentraeger:boot-manager-role",
      "clientinstallation-boot-datentraeger:secure-boot",
      "clientinstallation-boot-datentraeger:gpt-mbr",
      "clientinstallation-boot-datentraeger:storage-levels",
      "clientinstallation-boot-datentraeger:modern-disk-scenario",
      "clientinstallation-boot-datentraeger:partition-format",
      "clientinstallation-boot-datentraeger:filesystem-use",
      "clientinstallation-boot-datentraeger:efi-system-partition",
      "clientinstallation-boot-datentraeger:installation-preparation",
      "clientinstallation-boot-datentraeger:installation-order",
      "clientinstallation-boot-datentraeger:driver-context",
      "clientinstallation-boot-datentraeger:post-installation-validation"
    ]
  }
] as const satisfies readonly ModuleCompletionDefinition[];
