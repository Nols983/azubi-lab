const layerCards = [
  ["Anwendungen · Dienste · Shell", "Programme im User Space nutzen Systemfunktionen."],
  ["User Space", "Normaler Ausführungsraum für Anwendungen, Shells, Dienste und viele Werkzeuge."],
  ["Linux-Kernel", "Verwaltet Prozesse, Speicher, Geräte, Dateisysteme und Netzwerkzugriffe."],
  ["Hardware", "CPU, Arbeitsspeicher, Datenträger und Netzwerkgeräte."],
] as const;

export function LinuxSystemLayers() {
  return <figure className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6"><figcaption className="font-bold text-slate-950">Vereinfachtes Systemmodell</figcaption><ol className="mt-4 grid gap-2">{layerCards.map(([title, text], index) => <li key={title} className={`rounded-xl border p-4 ${index === 2 ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}><strong className="block text-slate-950">{title}</strong><span className="mt-1 block text-sm leading-6 text-slate-600">{text}</span>{index < layerCards.length - 1 && <span aria-hidden="true" className="mt-2 block text-center font-bold text-slate-500">↓</span>}</li>)}</ol><aside className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6"><strong>Distribution:</strong> integriert den Kernel mit einer kuratierten User-Space-Umgebung, Softwareverwaltung und weiteren Komponenten. Nicht jede Distribution enthält dieselbe Auswahl.</aside></figure>;
}

export function DistributionOverview() {
  const items = [["Ubuntu", "Debian-Familie", "APT/dpkg", "häufig auf Desktop und Server"], ["Fedora", "RPM-Ökosystem", "DNF", "regelmäßige Releases"], ["Arch Linux", "eigenständige Distribution", "pacman", "Rolling-Release-Modell"]] as const;
  return <figure className="mt-6"><figcaption className="font-bold text-slate-950">Neutrale Beispiele für Distributionsunterschiede</figcaption><div className="mt-4 grid gap-4 md:grid-cols-3">{items.map(([name, family, packages, model]) => <article key={name} className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{name}</h3><ul className="mt-3 space-y-2 text-sm leading-6"><li>{family}</li><li>Paketumgebung: {packages}</li><li>{model}</li></ul></article>)}</div></figure>;
}

export function TerminalSessionExample() {
  return <figure className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"><figcaption className="border-b border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200">Beispiel einer sicheren Terminalsitzung</figcaption><pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-100" aria-label="Terminalausgabe mit pwd, ls und cd"><code>{`$ pwd
/home/azubi

$ ls
Dokumente  Downloads  Projekte

$ cd Projekte

$ pwd
/home/azubi/Projekte`}</code></pre><p className="border-t border-slate-700 p-4 text-sm leading-6 text-slate-300"><strong className="text-white">$</strong> ist hier der Prompt, danach folgt der Befehl; die nächsten Zeilen sind Ausgaben. Das Aussehen des Prompts ist konfigurierbar.</p></figure>;
}

export function FilesystemHierarchyOverview() {
  const groups = [["Nutzerdaten", ["/home", "/root"]], ["Konfiguration", ["/etc"]], ["Veränderliche/temporäre Daten", ["/var", "/tmp"]], ["Programme und System", ["/usr", "/bin", "/sbin"]], ["Kernel und Geräte", ["/proc", "/sys", "/dev"]], ["Start und Einhängepunkte", ["/boot", "/mnt", "/media"]]] as const;
  return <><figure className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><figcaption className="font-bold text-slate-950">Ein gemeinsamer Verzeichnisbaum</figcaption><ul className="mt-4 border-l-2 border-blue-300 pl-4"><li><code className="font-bold">/</code><ul className="mt-3 grid gap-2 sm:grid-cols-2">{["home/azubi", "root", "etc", "var", "usr", "tmp", "dev", "proc", "sys", "boot"].map((path) => <li key={path} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><code>/{path}</code></li>)}</ul></li></ul></figure><div className="mt-6 grid gap-4 sm:grid-cols-2">{groups.map(([title, paths]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-2 break-words text-sm leading-6">{paths.map((path, index) => <span key={path}>{index > 0 && " · "}<code>{path}</code></span>)}</p></article>)}</div></>;
}
