# Azubi Lab Betriebsrunbook

Dieses Runbook beschreibt zwei validierte Betriebswege auf **einem selbst gehosteten Linux-Server**. `compose.production.yml` ist die portable Compose-/Podman-Referenzbereitstellung. `deploy/swarm-stack.yml` bildet den sanitisierten Docker-Swarm-Betriebsweg auf einem beispielhaften `swarm-manager` ab und basiert auf dem real verwendeten Self-Hosting-Ansatz. Beide Varianten bestehen aus genau einer Azubi-Lab-Anwendungsinstanz und PostgreSQL 17; PostgreSQL besitzt absichtlich keinen Host-Port.

Die bestehenden Abschnitte verwenden `docker compose`. Mit installiertem Compose-Provider kann stattdessen `podman compose` verwendet werden. Die Compose-Datei nutzt keine Docker-Socket-Mounts und keine Docker-spezifische API. Für einen Swarm-Betrieb gilt der folgende Abschnitt; die zentrale Traefik-Installation wird nicht durch dieses Repository verwaltet.

## Docker Swarm / swarm-manager deployment

### Architektur und Ausfallverhalten

Der Stackname ist `azubi-lab`. Der Stack enthält dauerhaft genau zwei Services:

- `azubi-lab_app`: eine Replik, nicht privilegierter Image-Benutzer UID/GID 1000, Netzwerke `proxy` und `azubi-lab-backend`.
- `azubi-lab_postgres`: eine PostgreSQL-17-Replik, ausschließlich `azubi-lab-backend`.

Beide Services tragen die harte Placement-Constraint `node.hostname == swarm-manager`. PostgreSQL, Evidence und private Profilbilder verwenden lokale Bind-Mounts auf diesem Host. Ist `swarm-manager` nicht `Ready/Active`, bleiben Tasks absichtlich ausstehend und Azubi Lab ist nicht verfügbar. Swarm darf zustandsbehaftete Tasks nicht auf andere Nodes mit leeren lokalen Pfaden verschieben. Diese Architektur ist bewusst **nicht hochverfügbar**; mehrere App-Repliken wären ohne verteilten privaten Dateispeicher falsch.

Das vorhandene Overlay `proxy` und eine zentral betriebene Traefik-Installation werden vorausgesetzt und nicht von diesem Repository verwaltet. Der Stack erzeugt nur das private, interne Overlay `azubi-lab-backend`. Weder Port 3000 noch 5432 wird am Host beziehungsweise über das Routing Mesh veröffentlicht.

### Verzeichnisse auf swarm-manager

Der Release-/Stackstand liegt unter `/srv/azubi-lab/app`. Live-Daten und Backups liegen getrennt davon:

| Zweck | Hostpfad | Containerpfad | Eigentümer/Modus |
| --- | --- | --- | --- |
| PostgreSQL | `/srv/azubi-lab/data/postgres` | `/var/lib/postgresql/data` | UID/GID 999, `0700` |
| Evidence | `/srv/azubi-lab/data/evidence` | `/data/evidence` | UID/GID 1000, `0700` |
| Profilbilder | `/srv/azubi-lab/data/profile-images` | `/data/profile-images` | UID/GID 1000, `0700` |
| Backups | `/srv/azubi-lab/data/backups` | nur temporär `/backups` | UID/GID 1000, `0700` |

Die UID 1000 stammt aus dem App-Image; die UID 999 ist der `postgres`-Benutzer des verwendeten Debian-basierten `postgres:17`-Images und muss bei einem abweichenden PostgreSQL-Image erneut geprüft werden. Die Pfade werden vom Stack und vom read-only Preflight **nicht** automatisch angelegt:

```bash
sudo install -d -m 750 -o <deployment-user> -g <deployment-group> /srv/azubi-lab/app
sudo install -d -m 700 -o 999 -g 999 /srv/azubi-lab/data/postgres
sudo install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/data/evidence
sudo install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/data/profile-images
sudo install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/data/backups
```

Keiner dieser Pfade liegt unter einem Webroot. Evidence und Profilbilder werden nicht statisch über Traefik ausgeliefert; allein die authentifizierten Anwendungsrouten dürfen darauf zugreifen. Kein Pfad benötigt `0777`.

### Swarm Secrets und nicht geheime Konfiguration

Kopiere `deploy/swarm.env.example` nach `/srv/azubi-lab/app/swarm.env`, setze dort reales Image-Tag, die internen und öffentlichen Host-/Resolver-Werte, und schütze die Datei mit `0600`. Für die beiden Routen sind `AZUBI_LAB_HOST=azubi.internal.example`, `TRAEFIK_CERTRESOLVER=internalresolver`, `AZUBI_LAB_PUBLIC_HOST=azubi.example.com` und `TRAEFIK_PUBLIC_CERTRESOLVER=publicresolver` vorgesehen. Die Datei enthält ausschließlich nicht geheime Werte und Docker-Secret-Namen:

```bash
install -m 600 -o <deployment-user> -g <deployment-group> deploy/swarm.env.example /srv/azubi-lab/app/swarm.env
set -a
. /srv/azubi-lab/app/swarm.env
set +a
```

`docker stack deploy` lädt keine projektlokale `.env` automatisch. Die Werte müssen deshalb wie oben in der aufrufenden Manager-Shell exportiert sein. `docker stack config --compose-file deploy/swarm-stack.yml` führt die gleiche Variablensubstitution aus und zeigt die gerenderte Servicekonfiguration. In dieser Lösung erscheinen dort Hostname, Image, Resolver und **Namen** der Secrets, nicht deren Inhalte.

Die vier geheimen Werte werden als externe Docker Secrets erzeugt. Das VAPID-Schlüsselpaar wird einmal erzeugt; nur der öffentliche Schlüssel darf anschließend in `swarm.env` stehen:

```bash
read -r -s AZUBI_LAB_POSTGRES_PASSWORD
printf '%s' "$AZUBI_LAB_POSTGRES_PASSWORD" | docker secret create azubi-lab-postgres-password-v1 -
unset AZUBI_LAB_POSTGRES_PASSWORD

read -r -s AZUBI_LAB_DATABASE_URL
printf '%s' "$AZUBI_LAB_DATABASE_URL" | docker secret create azubi-lab-database-url-v1 -
unset AZUBI_LAB_DATABASE_URL

openssl rand -base64 48 | docker secret create azubi-lab-auth-secret-v1 -

install -d -m 700 /etc/azubi-lab/secrets
vapid_file=$(mktemp /etc/azubi-lab/secrets/vapid.XXXXXX.json)
vapid_private_key_file=/etc/azubi-lab/secrets/web-push-vapid-private-key
chmod 600 "$vapid_file"
npm ci
./node_modules/.bin/web-push generate-vapid-keys --json > "$vapid_file"
node -e 'const fs=require("node:fs");process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).privateKey)' "$vapid_file" > "$vapid_private_key_file"
chmod 600 "$vapid_private_key_file"
docker secret create azubi-lab-web-push-vapid-private-key-v1 "$vapid_private_key_file"
node -e 'const fs=require("node:fs");process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).publicKey)' "$vapid_file"
rm "$vapid_file"
unset vapid_file vapid_private_key_file
```

Die letzte Node-Ausgabe ist ausschließlich der nicht geheime öffentliche VAPID-Schlüssel. Übertrage ihn als `WEB_PUSH_VAPID_PUBLIC_KEY` nach `swarm.env`, setze dort einen betreibereigenen `WEB_PUSH_VAPID_SUBJECT` als `mailto:`- oder `https:`-URI und lasse `AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET` auf den erzeugten Secret-Namen zeigen. Der private Schlüssel wird weder ausgegeben noch in `swarm.env` gespeichert. Das geschützte temporäre JSON wird erst nach erfolgreicher Secret-Erzeugung entfernt. Auf einem reinen Swarm-Host kann die private Schlüsseldatei nach erfolgreicher Secret-Erzeugung aus dem Arbeitsverzeichnis entfernt und muss stattdessen in der externen Geheimnisablage gesichert werden; die portable Compose-Variante verwendet ihren geschützten absoluten Pfad als `WEB_PUSH_VAPID_PRIVATE_KEY_FILE`. Diese Befehle sind Operatoranweisungen; sie werden nicht beim Build oder Deployment automatisch ausgeführt.

Die Datenbank-URL verwendet den Swarm-Service-DNS-Namen `azubi-lab_postgres`, zum Beispiel konzeptionell `postgresql://<user>:<url-codiertes-passwort>@azubi-lab_postgres:5432/<db>`. Das Passwort in der URL muss mit dem PostgreSQL-Secret übereinstimmen und bei Sonderzeichen URL-codiert sein. Echte Werte dürfen nicht in der Shell-History, der Env-Datei oder Git landen.

Docker Secrets werden den Tasks als Dateien unter `/run/secrets` bereitgestellt. Der App-Entry-Point liest `DATABASE_URL_FILE`, `AUTH_SECRET_FILE` und `WEB_PUSH_VAPID_PRIVATE_KEY_FILE`, die PostgreSQL-Initialisierung `POSTGRES_PASSWORD_FILE`; die portable Compose-Variante behält ihre bisherigen direkten Umgebungsvariablen, mountet den neuen privaten VAPID-Schlüssel aber ebenfalls als Compose Secret. Docker-Umgebungsvariablen sind **nicht** gleichwertig zu Docker Secrets: Klartext-Variablen würden in der Swarm-Service-Spezifikation gespeichert und wären für Manager über `docker service inspect` sichtbar. Aus diesem Grund werden die vier kritischen Werte nicht per Stack-Interpolation übertragen. Swarm-Manager bleiben hochprivilegiert und können Secrets an neue Services delegieren.

Swarm Secrets sind unveränderlich. Für Rotation wird ein neues versioniertes Secret erzeugt, sein Name in `swarm.env` geändert, der Stack neu ausgerollt und das alte Secret erst entfernt, wenn kein Service es mehr verwendet.

### Image-Strategie und read-only Preflight

Baue auf `swarm-manager` ein unveränderlich benanntes Release-Image und verwende das Git-SHA, nicht `latest`:

```bash
git_sha=$(git rev-parse --short=12 HEAD)
docker build -f Containerfile -t "azubi-lab:$git_sha" .
docker image inspect "azubi-lab:$git_sha"
```

Da App und operative App-Jobs auf `swarm-manager` festgesetzt sind, ist ein dort vorhandenes lokales Image zusammen mit `--resolve-image never` ausreichend. Das Tag darf nie für andere Bytes wiederverwendet werden. Sobald Placement auf weitere Nodes erweitert wird, ist ein Registry-Push beziehungsweise ein für alle zulässigen Nodes erreichbares Registry-Image zwingend; dieses Repository richtet keine Registry ein. Ein privates Registry-Image wird vorab auf `swarm-manager` authentifiziert gepullt und anschließend ebenfalls über sein unveränderliches Tag referenziert.

Nach Export von `swarm.env` prüft der Preflight ausschließlich lesend: aktiven Manager, lokalen Hostnamen, Zustand von `swarm-manager`, das bestehende `proxy`-Overlay, optional ein bestehendes Backend-Netz, Storage-Eigentümer/Modi, Secret-Metadaten, lokales App-Image und `docker stack config`:

```bash
scripts/ops/swarm-preflight.sh
```

Er erzeugt weder Netze noch Verzeichnisse, Secrets, Images, Services oder Stacks.

### Traefik-Integration

Alle Traefik-Labels stehen unter `deploy.labels` des App-Services, wie vom Swarm-Provider benötigt. Beide HTTPS-Router verwenden EntryPoint `websecure`, TLS, das Overlay `proxy` und denselben Traefik-Service `azubi-lab` mit internem Zielport 3000:

- Intern: `azubi-lab` verwendet ``Host(`${AZUBI_LAB_HOST}`)`` beziehungsweise `https://azubi.internal.example` und `${TRAEFIK_CERTRESOLVER}` beziehungsweise `internalresolver` mit der privaten Step-CA.
- Öffentlich: `azubi-lab-public` verwendet ``Host(`${AZUBI_LAB_PUBLIC_HOST}`)`` beziehungsweise `https://azubi.example.com` und `${TRAEFIK_PUBLIC_CERTRESOLVER}` beziehungsweise `publicresolver` für ein öffentlich vertrauenswürdiges ACME-Zertifikat.

Azubi Lab provisioniert weder DNS noch Zertifikatsresolver. Beides wird außerhalb dieses Repositorys durch die jeweilige Betreiberin oder den jeweiligen Betreiber bereitgestellt. Die Hostnamen `azubi.internal.example` und `azubi.example.com` sind ausschließlich neutrale Beispiele; die öffentliche Route ist für Zugriffe ohne privates VPN beziehungsweise internes Overlay vorgesehen.

`AUTH_TRUST_HOST=true` bleibt für die kontrollierte Traefik-Weiterleitung aktiviert. Der Stack setzt außerdem `AUTH_RATE_LIMIT_TRUST_PROXY=true`, weil die App ohne veröffentlichten Port ausschließlich hinter dem kontrollierten Traefik-Overlay erreichbar ist. Nur in dieser Topologie verwendet die Anwendung den von Traefik rechts angefügten letzten `X-Forwarded-For`-Wert als pseudonymisierte Netzwerkdimension; bei direktem lokalem Zugriff bleibt diese Option `false`. `PASSWORD_RESET_ORIGIN` wird im Swarm-Stack ausschließlich aus dem zuvor validierten öffentlichen Host als `https://${AZUBI_LAB_PUBLIC_HOST}` gebildet; Reset-Links werden niemals aus einem eingehenden `Host`-Header abgeleitet. Authentifizierte Browsersitzungen sind host-spezifisch: Eine Anmeldung auf `azubi.internal.example` wird nicht automatisch als Anmeldung auf `azubi.example.com` übernommen. Es wird keine Traefik-Basic-Auth vor die Anwendung gesetzt; die Anwendungsanmeldung bleibt maßgeblich. Weder App-Port 3000 noch PostgreSQL-Port 5432 wird am Host veröffentlicht, und der Evidence-Pfad wird nicht durch Traefik bereitgestellt.

Fehlgeschlagene bzw. teure Login- und Reset-Versuche werden in PostgreSQL über 15-Minuten-Fenster begrenzt. Die Buckets kombinieren anwendungsweite, normalisierte Login-/Token- und – hinter dem vertrauenswürdigen Proxy – Netzwerkdimensionen. Für Login gelten 300 Versuche anwendungsweit, 10 pro Kennung, 60 pro Netzwerk und 6 pro Kombination aus Kennung und Netzwerk. Für die öffentliche Reset-Einlösung gelten 120 Versuche anwendungsweit, 5 pro Token und 20 pro Netzwerk. Erfolgreiche Anmeldung löscht die Kennungs- und Kombinations-Buckets, nicht jedoch die allgemeinen Schutz-Buckets. Diese Werte erlauben normale Schulungsraum-Anmeldungen und mehrere Tippfehler, bremsen aber gezielte teure Versuche ohne dauerhafte Kontosperre. PostgreSQL speichert ausschließlich mit `AUTH_SECRET` HMAC-pseudonymisierte Schlüssel, niemals Login-Kennungen, Token oder IP-Adressen. Abgelaufene Buckets werden bei nachfolgenden Prüfungen nach 24 Stunden Karenz automatisch entfernt. Das schützt teure Anwendungspfade vor Missbrauch über Neustarts und Replikate hinweg, ersetzt aber keinen vorgelagerten Schutz gegen volumetrische DDoS-Angriffe.

Es gibt keinen zusätzlichen `web`-Router und keine anwendungsspezifische Redirect-Middleware. Die dokumentierte Annahme ist, dass das zentrale Traefik bereits global HTTP nach HTTPS umleitet. Falls diese Infrastrukturannahme nicht stimmt, wird die zentrale Traefik-Konfiguration separat korrigiert, nicht blind im App-Stack dupliziert. Die Health-Endpunkte bleiben normale App-Routen; es wird kein zweiter öffentlicher Health-Service erzeugt.

### Erste Swarm-Bereitstellung

1. Release nach `/srv/azubi-lab/app` bereitstellen und das SHA-getaggte Image auf `swarm-manager` bauen oder pullen.
2. Die vier persistenten Pfade mit den oben genannten Eigentümern und Rechten vorbereiten.
3. `swarm.env` und die vier Docker Secrets vorbereiten und in die Manager-Shell exportieren.
4. Vorhandenes Traefik-Netz ausschließlich prüfen: `docker network inspect proxy`. Nicht neu erzeugen oder Traefik-Dateien verändern.
5. App zunächst deklarativ auf 0 halten und den Stack deployen. So kann keine neue, noch nicht migrierte App Traffic annehmen:

   ```bash
   export AZUBI_LAB_APP_REPLICAS=0
   scripts/ops/swarm-preflight.sh
   docker stack deploy --resolve-image never --compose-file deploy/swarm-stack.yml azubi-lab
   docker service ps azubi-lab_postgres
   ```

6. Warten, bis der PostgreSQL-Task `Running` und sein Container-Healthcheck `healthy` ist. `scripts/ops/swarm-migrate.sh` prüft dies nochmals und verweigert andernfalls den Start.
7. Migrationen genau einmal über einen temporären `replicated-job` mit neuem App-Image, privatem Backend-Netz, Docker Secrets und swarm-manager-Constraint ausführen:

   ```bash
   scripts/ops/swarm-migrate.sh
   ```

8. Falls noch kein Admin existiert, ein einmaliges Passwort-Secret erzeugen und den ebenfalls temporären Bootstrap-Job ausführen:

   ```bash
   export ADMIN_LOGIN='<admin-login>'
   export ADMIN_DISPLAY_NAME='<anzeigename>'
   export AZUBI_LAB_ADMIN_PASSWORD_SECRET="azubi-lab-admin-password-$(date -u +%Y%m%d%H%M%S)"
   read -r -s ADMIN_PASSWORD
   printf '%s' "$ADMIN_PASSWORD" | docker secret create "$AZUBI_LAB_ADMIN_PASSWORD_SECRET" -
   unset ADMIN_PASSWORD
   scripts/ops/swarm-seed-admin.sh
   docker secret rm "$AZUBI_LAB_ADMIN_PASSWORD_SECRET"
   unset ADMIN_LOGIN ADMIN_DISPLAY_NAME AZUBI_LAB_ADMIN_PASSWORD_SECRET
   ```

9. Erst danach die gewünschte App-Replik auf 1 setzen und die deklarative Konfiguration erneut ausrollen:

   ```bash
   export AZUBI_LAB_APP_REPLICAS=1
   docker stack deploy --resolve-image never --compose-file deploy/swarm-stack.yml azubi-lab
   ```

10. `docker stack services azubi-lab`, `docker service ps azubi-lab_app` und `docker service ps azubi-lab_postgres` müssen jeweils `1/1` beziehungsweise einen gesunden laufenden Task zeigen.
11. Interne Readiness über den auf `swarm-manager` aufgelösten Task und anschließend beide Traefik-Routen mit `curl --fail --silent "https://$AZUBI_LAB_HOST/api/health/ready"` und `curl --fail --silent "https://$AZUBI_LAB_PUBLIC_HOST/api/health/ready"` prüfen. Den öffentlichen Aufruf zusätzlich von einem Gerät außerhalb des privaten Zugangsnetzes testen.
12. Für `azubi.internal.example` die private Step-CA-Kette und für `azubi.example.com` die öffentlich vertrauenswürdige ACME-Kette prüfen; es darf keinen Host-Port für App oder PostgreSQL geben.
13. Einen Lernenden-, Werkstattleiter- und Admin-Login samt der unten dokumentierten Rollengrenzen prüfen.
14. Als autorisierter Nutzer einen Evidence-Anhang schreiben und wieder herunterladen; der Hostpfad bleibt direkt unzugänglich.

Die Jobs `swarm-migrate.sh` und `swarm-seed-admin.sh` entfernen ihren temporären Service nach Abschluss. Nach einem harten Abbruch wird ein übrig gebliebener, eindeutig zeitgestempelter Job zunächst mit `docker service ps`/`docker service logs` untersucht und anschließend explizit mit `docker service rm <job>` entfernt.

### Benachrichtigungs-Scheduler im Swarm

Installiere `deploy/systemd/azubi-lab-notifications-swarm.service.example` nach Ersetzen von Benutzer und Projektpfad als `/etc/systemd/system/azubi-lab-notifications.service`. Die bestehende tägliche Timer-Vorlage bleibt unverändert:

```bash
sudo install -m 644 deploy/systemd/azubi-lab-notifications.timer.example /etc/systemd/system/azubi-lab-notifications.timer
sudo install -m 644 deploy/systemd/azubi-lab-notifications-swarm.service.example /etc/systemd/system/azubi-lab-notifications.service
sudo systemctl daemon-reload
sudo systemctl enable --now azubi-lab-notifications.timer
systemctl list-timers azubi-lab-notifications.timer
journalctl -u azubi-lab-notifications.service
```

Der Helper löst exakt den einen laufenden, gesunden App-Task auf `swarm-manager` auf und führt darin `npm run notifications:generate` aus. Bei 0 oder mehreren Tasks, fremdem Node oder fehlerhafter Health schlägt der systemd-Run sichtbar fehl. Der Generator bleibt täglich, idempotent und konkurrenzsicher. Der Dienst kann als nicht-root Deployment-Benutzer laufen, benötigt aber Zugriff auf den Manager-Docker-Socket; Mitgliedschaft in der Docker-Gruppe ist faktisch hochprivilegiert und muss entsprechend begrenzt werden. Der Socket wird niemals in einen Azubi-Lab-Container gemountet.

### Konsistentes Swarm-Backup

PostgreSQL-Dump, Evidence-Archiv und Profilbild-Archiv bilden nur bei gestoppten Schreibern einen konsistenten Satz. Stoppe deshalb Timer, App und alle manuellen Migrations-/Bootstrap-Jobs; PostgreSQL läuft für `pg_dump` weiter:

```bash
sudo systemctl stop azubi-lab-notifications.timer
docker service scale azubi-lab_app=0
export AZUBI_LAB_BACKUP_CONFIRMED=APP_WRITES_STOPPED
scripts/ops/swarm-backup.sh
unset AZUBI_LAB_BACKUP_CONFIRMED
docker service scale azubi-lab_app=1
sudo systemctl start azubi-lab-notifications.timer
```

`swarm-backup.sh` verweigert den Lauf, wenn die deklarierte App-Replik nicht 0 oder PostgreSQL nicht gesund ist. Es startet einen einzelnen temporären PostgreSQL-17-Job auf dem privaten Overlay, bindet Evidence und Profilbilder read-only sowie Backups getrennt read-write ein und nutzt `PGPASSWORD_FILE`. Das Manifest enthält für Profilbilder die eigenen Einträge `profile_images_archive` und `profile_images_sha256`. Der unveränderte Guard `APP_WRITES_STOPPED`, Checksummen, Manifest, `0600`-Artefakte und `0700`-Sätze bleiben aktiv. Bei Fehlern App und Timer nicht automatisch starten, sondern Job-Logs und den unvollständigen, niemals überschriebenen Sicherungssatz untersuchen.

Ein externer, nicht von diesem Repository verwalteter Deploy-Helper muss vor einem entsprechenden Produktivlauf ebenfalls `profile_images_archive` und `profile_images_sha256` als verpflichtende Manifestfelder prüfen und die SHA-256 des Archivs verifizieren. Bis dieser Betreiber-Follow-up erledigt ist, darf dessen bisherige Backup-Verifikation nicht als vollständige Prüfung eines neuen Sicherungssatzes gelten.

### Guarded Swarm-Restore

Restore bleibt ausschließlich für eine **leere** PostgreSQL-, eine **leere** Evidence- und eine **leere** Profilbild-Zielstruktur erlaubt. Bei einer Wiederherstellung auf demselben Host werden die alten Live-Pfade nach App-/DB-Stopp umbenannt und als rückholbare Kopie behalten; sie werden nicht gelöscht:

```bash
sudo systemctl stop azubi-lab-notifications.timer
docker service scale azubi-lab_app=0
docker service scale azubi-lab_postgres=0
restore_stamp=$(date -u +%Y%m%d%H%M%S)
sudo mv /srv/azubi-lab/data/postgres "/srv/azubi-lab/data/postgres.pre-restore-$restore_stamp"
sudo mv /srv/azubi-lab/data/evidence "/srv/azubi-lab/data/evidence.pre-restore-$restore_stamp"
sudo mv /srv/azubi-lab/data/profile-images "/srv/azubi-lab/data/profile-images.pre-restore-$restore_stamp"
sudo install -d -m 700 -o 999 -g 999 /srv/azubi-lab/data/postgres
sudo install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/data/evidence
sudo install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/data/profile-images
docker service scale azubi-lab_postgres=1
```

Nach gesundem PostgreSQL-Task den gewählten, unveränderten Sicherungssatz wiederherstellen:

```bash
export AZUBI_LAB_RESTORE_CONFIRM=RESTORE_TO_EMPTY_TARGET
scripts/ops/swarm-restore.sh azubi-lab-backup-<UTC-timestamp>
unset AZUBI_LAB_RESTORE_CONFIRM
scripts/ops/swarm-migrate.sh
docker service scale azubi-lab_app=1
sudo systemctl start azubi-lab-notifications.timer
```

Der Restore-Job bindet Backups read-only ein. Der bestehende Helper prüft `RESTORE_TO_EMPTY_TARGET`, leere Public-Tabellen, leere Evidence-/Profilbild-Ziele, Pfade, reguläre Dateitypen und alle SHA-256-Prüfsummen, führt `pg_restore --exit-on-error` aus und extrahiert nur UUID-basierte WebP-Dateien ohne Pfadtraversal. Anschließend verifiziert er jedes gespeicherte Evidence-Objekt und setzt Verzeichnisse/Dateien auf `0700`/`0600`. Der Migrationslauf danach dient als Checksum-/Versionsprüfung. Erst nach Readiness, Login, Fachdatensicht, Evidence-Download und Avatarprüfung darf die App produktiv bleiben; die `pre-restore`-Pfade werden erst nach separat bestätigter Abnahme und gemäß Aufbewahrungsregel behandelt.

### Swarm-Update und Rollback

1. Wartungsfenster beginnen und Benachrichtigungs-Timer stoppen.
2. `azubi-lab_app` auf 0 skalieren und mit dem alten Image-Kontext `swarm-backup.sh` ausführen.
3. Neues Image mit neuem Commit-SHA-Tag bauen oder pullen; das alte Tag nicht überschreiben.
4. `AZUBI_LAB_IMAGE` in der geschützten `swarm.env` auf das neue unveränderliche Tag setzen und erneut exportieren.
5. Bei weiterhin 0 App-Repliken `scripts/ops/swarm-migrate.sh` mit dem neuen Image ausführen.
6. `AZUBI_LAB_APP_REPLICAS=1` setzen und `docker stack deploy --resolve-image never --compose-file deploy/swarm-stack.yml azubi-lab` ausführen.
7. Servicezustand, Placement und Health prüfen.
8. Readiness und HTTPS-Smoke-Test ausführen.
9. Lernenden-/Werkstattleiter-/Admin-Authentifizierung und die Rollengrenzen prüfen.
10. Autorisierten Evidence-Download prüfen und erst danach den Timer starten.

Ein altes Container-Image ist **kein Datenbankschema-Rollback**. Wurde eine inkompatible Migration angewendet, besteht die verlässliche Wiederherstellung aus dem vor dem Upgrade erzeugten Gesamtsicherungsstand in neuen leeren PostgreSQL-/Evidence-/Profilbild-Zielen. Das alte Image darf erst gegen diesen wiederhergestellten Stand gestartet werden.

### Swarm-Sicherheit und Fehlersuche

- PostgreSQL hängt ausschließlich am internen Overlay; App hängt am Backend und am vorhandenen `proxy`. Es gibt keine `ports`-Definition.
- Nur Traefik erreicht App-Port 3000 über `proxy`. Die expliziten Service-Labels nennen Netzwerk und Zielport; PostgreSQL hat keine Traefik-Labels.
- Die App läuft als UID 1000 und verliert alle Linux-Capabilities. Temporäre Jobs laufen ebenfalls nicht privilegiert und mit `cap-drop ALL`.
- `security_opt: no-new-privileges` bleibt in der portablen Compose-Definition. Das von `docker stack deploy` verwendete Legacy-Compose-v3-Backend unterstützt `security_opt` nicht als Swarm-Serviceoption zuverlässig; die Swarm-Datei behauptet diese Härtung daher nicht. Ein daemonweites `no-new-privileges` wäre eine separate Betreiberentscheidung und wird hier nicht automatisch verändert.
- PostgreSQL behält sein offizielles Entry-Point-/Rechtemodell und unveränderte Durability-Einstellungen. Keine Anwendung mountet den Docker-Socket.
- Deployment, Secrets, Jobs und Scheduler benötigen Manager-Rechte beziehungsweise Docker-Socket-Zugriff. Diese Berechtigung ist administrativ, auch wenn der Unix-Benutzer nicht root heißt.
- Bei `0/1` zuerst `docker service ps --no-trunc <service>` und `docker service logs <service>` prüfen. Placement-Fehler bedeuten häufig, dass `swarm-manager` nicht Ready/Active oder der lokale Pfad dort unzugänglich ist.
- Mit `docker network inspect proxy` und `docker network inspect azubi-lab-backend` Scope, Treiber und `Internal` prüfen. PostgreSQL darf nie in `proxy` erscheinen.
- Traefik-Routing wird über `docker service inspect azubi-lab_app` und die Logs der zentral betriebenen Traefik-Instanz untersucht. Router-Hostname und Resolver stammen aus der exportierten Konfiguration; die externe Traefik-Installation wird von diesem Repository nicht verwaltet.
- Vor jedem Deploy `scripts/ops/swarm-preflight.sh` und bei Bedarf bewusst `docker stack config --compose-file deploy/swarm-stack.yml` ausführen. Gerenderte Konfiguration nicht in Tickets oder Logs kopieren, falls künftig doch sensible Umgebungswerte ergänzt werden.

## Produktionskonfiguration

Lege die Produktionsumgebung **außerhalb des Repositorys** an, beispielsweise unter `/etc/azubi-lab/azubi-lab.env`, und beschränke sie auf den Deployment-Benutzer:

```bash
install -m 600 -o <deployment-user> -g <deployment-group> .env.example /etc/azubi-lab/azubi-lab.env
openssl rand -base64 32
```

Übertrage die OpenSSL-Ausgabe manuell als `AUTH_SECRET` in die geschützte Datei. Lege keine echte Ausgabe im Repository ab. Erforderlich sind:

- `DATABASE_URL`: interne URL mit Host `postgres`; Sonderzeichen im Passwort müssen URL-codiert sein.
- `AUTH_SECRET`: dauerhaft verwahrtes, starkes Auth.js-Geheimnis.
- `AUTH_TRUST_HOST=true`: nur verwenden, wenn der vorgeschaltete Proxy kontrolliert und vertrauenswürdig ist.
- `PASSWORD_RESET_ORIGIN`: kanonischer, externer HTTPS-Origin ohne Pfad, Query oder Zugangsdaten, zum Beispiel `https://azubi.example.test`. Die Anwendung verwendet ihn für admin-generierte Reset-Links und leitet ihn nicht aus Request-Headern ab.
- `WEB_PUSH_VAPID_PUBLIC_KEY`: öffentlicher URL-safe-Base64-VAPID-Schlüssel; er darf zur Laufzeit an angemeldete Browser ausgeliefert werden.
- `WEB_PUSH_VAPID_PRIVATE_KEY_FILE`: absoluter, nur für den Betreiber lesbarer Hostpfad zur Datei mit dem privaten VAPID-Schlüssel. Compose mountet sie als Secret; in Swarm zeigt dieselbe Container-Variable auf das externe Docker Secret.
- `WEB_PUSH_VAPID_SUBJECT`: Betreiberkontakt als gültige `mailto:`- oder `https:`-URI.
- `EVIDENCE_STORAGE_DIR=/data/evidence`: im Container fest auf das private Evidence-Volume abgebildet.
- `PROFILE_IMAGE_STORAGE_DIR=/data/profile-images`: im Container fest auf den privaten, nicht statisch ausgelieferten Profilbildspeicher abgebildet.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Initialisierung der offiziellen PostgreSQL-Instanz.
- `BACKUP_DIR`: absolutes, nicht öffentlich ausgeliefertes Host-Verzeichnis für Sicherungssätze.
- `AZUBI_LAB_IMAGE`: explizites Release-, Versions- oder Commit-SHA-Tag; nicht nur `latest`.
- `PROXY_NETWORK`: vorhandenes externes Container-Netz des Reverse Proxys, standardmäßig `azubi-lab-proxy`.

`DATABASE_URL`, `POSTGRES_*`, `AUTH_SECRET` und das VAPID-Schlüsselpaar müssen konsistent bleiben. Das Startskript prüft die kritischen App-Werte einschließlich eines gesetzten HTTPS-Reset-Origins und der VAPID-Konfiguration, ohne geheime Inhalte auszugeben. Ein verlorenes `AUTH_SECRET` macht bestehende Auth.js-Sitzungen ungültig; Passwort-Hashes und Konten in PostgreSQL bleiben verwendbar. Eine VAPID-Rotation ist ein bewusster Betreiberwechsel: vorhandene Geräte-Abos können danach eine erneute Aktivierung benötigen.

### Rollen und Kontowiederherstellung

Die Anwendungsrollen sind `learner` (Lernender), `observer` (Betrachter), `instructor` (Werkstattleiter) und `admin` (Administrator). Betrachter besitzen ausschließlich die schreibgeschützte Produktvorschau und eigene Profil-/Avatarfunktionen, aber keine Lernenden-XP. Werkstattleiter verwalten Challenges, Reviews, Rubriken und erlaubte Zuweisungen und sehen die für die Ausbildung erforderlichen Fortschrittsdaten. Kontenerstellung, Sperrung/Reaktivierung, Rollenverwaltung und Passwort-Reset-Links bleiben ausschließlich Administratoren vorbehalten. Rollen werden für jede privilegierte Serveraktion aus dem aktuellen PostgreSQL-Datensatz geprüft; die Sitzung enthält keine maßgebliche Rollenfreigabe.

Kontowiederherstellung erfolgt operativ so:

1. Der Nutzer kontaktiert einen Administrator über einen separat vereinbarten Kanal.
2. Der Administrator öffnet `/admin/konten`, wählt das Zielkonto und erzeugt einen einmaligen Reset-Link.
3. Der Administrator übermittelt den nur einmal angezeigten Link ausschließlich an die vorgesehene Person. Der Link läuft nach 30 Minuten ab.
4. Der Nutzer öffnet den Link und setzt ein neues Passwort. Der Token wird transaktional verbraucht; alle weiteren offenen Tokens des Kontos werden ungültig.
5. `auth_version` wird erhöht, bisherige Sitzungen verlieren den geschützten Zugriff und der Nutzer meldet sich mit dem neuen Passwort erneut an.

Der Klartext-Token und die vollständige URL werden weder in PostgreSQL noch in Logs gespeichert. Der Link trägt den Token in einem URL-Fragment, das nicht Bestandteil des HTTP-Requests ist; der Browser entfernt es vor der Formulareingabe aus der sichtbaren URL und sendet den Token erst im POST der Server Action. Reset-Seiten senden zusätzlich `Cache-Control: no-store` und `Referrer-Policy: no-referrer`. Es gibt keine öffentliche Selbstregistrierung und in dieser Version keine automatische Passwort-Wiederherstellung per E-Mail oder SMTP.

## Verzeichnisse, Benutzer und Rechte

Die Anwendung läuft als nicht privilegierter Image-Benutzer `node` mit UID/GID 1000. Evidence- und Profilbild-Volumes werden mit `0700`, neue Objekte mit `0600` verwendet. Es ist kein `chmod 777` erforderlich. Bereite das externe Backup-Verzeichnis passend vor:

```bash
install -d -m 700 -o 1000 -g 1000 /srv/azubi-lab/backups
```

Bei rootless Podman müssen Bind-Mount-Eigentümer gegebenenfalls über `podman unshare chown 1000:1000 <backup-dir>` abgebildet werden. Evidence- und Profilbildspeicher werden nicht unter `public` oder `.next` eingebunden und dürfen weder vom Reverse Proxy noch als statische Host-Verzeichnisse veröffentlicht werden. Der App-Container benötigt keinen privilegierten Modus und keinen Zugriff auf andere Hostpfade.

Kontolöschung ist derzeit ein externer/manueller Vorgang. Die Datenbank entfernt Präferenzen und Belohnungshistorie per `ON DELETE CASCADE`; die WebP-Datei ist davon transaktional getrennt. `scripts/ops/report-orphan-profile-images.sh` listet deshalb nach manuellen Kontolöschungen ausschließlich verwaiste UUID-Dateien auf und löscht nichts. Ein Operator prüft die Ausgabe und entfernt bestätigte Live-Orphans separat; historische Backupkopien bleiben bis zum Ablauf der jeweiligen Aufbewahrungsfrist erhalten.

## Erstbereitstellung

1. Repository oder signiertes Release auf dem Server bereitstellen und Node-/Image-Tag festlegen.
2. Produktionsumgebung und Backup-Verzeichnis wie oben anlegen.
3. Das Proxy-Netz einmalig erzeugen und den externen Reverse Proxy ebenfalls daran anbinden:

   ```bash
   docker network create azubi-lab-proxy
   ```

4. Reproduzierbares Image mit `npm ci` und Webpack bauen:

   ```bash
   docker build -f Containerfile -t azubi-lab:<release-or-commit-sha> .
   ```

5. Nur PostgreSQL starten und dessen Healthcheck abwarten:

   ```bash
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml up -d postgres
   ```

6. Migrationen genau einmal als expliziten Operator-Schritt ausführen:

   ```bash
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml run --rm app npm run db:migrate
   ```

7. Erstes Administrationskonto ohne Standardzugang anlegen. `ADMIN_PASSWORD` nicht in die Compose-Datei schreiben; Werte nur für diesen Prozess aus einer geschützten Eingabeumgebung übergeben:

   ```bash
   read -r ADMIN_LOGIN
   read -r ADMIN_DISPLAY_NAME
   read -r -s ADMIN_PASSWORD
   export ADMIN_LOGIN ADMIN_DISPLAY_NAME ADMIN_PASSWORD
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml run --rm -e ADMIN_LOGIN -e ADMIN_DISPLAY_NAME -e ADMIN_PASSWORD app npm run db:seed-admin
   unset ADMIN_LOGIN ADMIN_DISPLAY_NAME ADMIN_PASSWORD
   ```

8. Anwendung starten:

   ```bash
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml up -d app
   ```

Das Compose-Netz `backend` ist intern; nur App und PostgreSQL sind dort verbunden. Der Proxy erreicht `app:3000` über `azubi-lab-proxy`. Er muss den ursprünglichen `Host` sowie korrekte `X-Forwarded-Host`, `X-Forwarded-Proto` und `X-Forwarded-For` weitergeben. Extern ist ausschließlich HTTPS vorgesehen. Sichere, HTTP-only und SameSite-Cookie-Eigenschaften von Auth.js werden nicht abgeschwächt. HSTS sollte erst nach verifizierter HTTPS-Konfiguration am TLS-Proxy aktiviert werden.

## Start, Stop und Logs

```bash
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml stop
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml start
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml logs --tail=200 app postgres
```

Die Prozesse schreiben ausschließlich auf stdout/stderr; Rotation und Aufbewahrung übernimmt Container-Runtime beziehungsweise systemd. Für normales Stoppen niemals `down -v` verwenden: `-v` zerstört PostgreSQL-, Evidence- und Profilbild-Volumes. PostgreSQL bleibt ohne veröffentlichten Port über folgenden sicheren Weg erreichbar:

```bash
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml exec postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Keine PostgreSQL-Dauerhaltbarkeitsoption (`fsync`, `synchronous_commit`, `full_page_writes`) wird deaktiviert. Container verwenden UTC; fachliche Zeitpunkte bleiben `timestamptz`, der Benachrichtigungs-Digest verwendet weiterhin vollständige UTC-Tage und die UI formatiert lokal.

## Healthchecks und Smoke-Test

- `GET /api/health`: Liveness, minimal `200 {"status":"ok"}`.
- `GET /api/health/ready`: Readiness; prüft `SELECT 1` und Lese-/Schreibzugänglichkeit des Evidence-Verzeichnisses ohne Testdatei. Fehler liefern nur `503 {"status":"unavailable"}`.

```bash
curl --fail --silent https://<production-host>/api/health
curl --fail --silent https://<production-host>/api/health/ready
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(async r=>{console.log(r.status);if(!r.ok)process.exit(1)})"
```

Danach im Browser Lernenden-, Werkstattleiter- und Admin-Anmeldung prüfen. Der Werkstattleiter muss Trainer-Dashboard, Challenge-Management, Reviews, Zuweisungen und autorisierte Evidence-Downloads erreichen, aber weder `/admin/konten` noch Reset- oder Rollensteuerungen. Der Administrator muss einen Einmal-Link erzeugen können; nach erfolgreichem Reset müssen Wiederverwendung und alte Sitzung scheitern. Der Health-Endpunkt nennt weder Version, Benutzerzahlen, Schema, Pfade noch Konfigurationsnamen.

## Benachrichtigungs-Scheduler

Vorlagen liegen unter `deploy/systemd/`. Ersetze darin ausschließlich Deployment-Benutzer, Projektpfad, Produktions-Env-Pfad und bei Bedarf `docker` durch `podman`; kopiere sie danach nach `/etc/systemd/system`.

```bash
systemctl daemon-reload
systemctl enable --now azubi-lab-notifications.timer
systemctl list-timers azubi-lab-notifications.timer
systemctl status azubi-lab-notifications.service
journalctl -u azubi-lab-notifications.service
```

Der Timer ruft täglich `npm run notifications:generate` im bereits laufenden App-Container auf. Ein täglicher Lauf genügt für die aktuellen 24-/72-Stunden-Fenster; der Generator ist idempotent und konkurrenzsicher. Fehler führen zu einem von null verschiedenen Service-Status und werden im Journal untersucht. Der Dienst läuft als unprivilegierter Deployment-Benutzer mit Zugriff auf dessen Container-Runtime, nicht als root. Externes Alerting ist nicht Bestandteil des Systems.

## Konsistentes Gesamtbackup

PostgreSQL-Metadaten, Evidence-Bytes und Profilbilder liegen in getrennten Speichern und bilden keine gemeinsame transaktionale Momentaufnahme. Für den kleinen Einzelserver wird deshalb die App kurz gestoppt. So entstehen während Dump und Archiven keine neuen Abgaben oder Avatarersetzungen. Scheduler und administrative Einmalbefehle dürfen währenddessen nicht laufen.

```bash
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml stop app
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml --profile operations run --rm -e AZUBI_LAB_BACKUP_CONFIRMED=APP_WRITES_STOPPED backup
docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml start app
```

Der Helper verwendet `pg_dump --format=custom`, je ein gzip-komprimiertes Tar-Archiv für Evidence und Profilbilder ohne Symlink-Folge sowie einen abschließend geschriebenen `manifest.txt` mit UTC-Zeit, Dateinamen, SHA-256-Prüfsummen, Image- und Migrationskontext. Jeder Lauf erzeugt ein neues `azubi-lab-backup-<timestamp>`-Verzeichnis; vorhandene Sätze werden nie überschrieben oder automatisch gelöscht. Ein fehlender/unlesbarer Profilbildspeicher lässt den Lauf fehlschlagen. Artefakte und Verzeichnis werden mit `0600` beziehungsweise `0700` angelegt.

Sicherungssätze enthalten private Lerndaten. Bewahre sie außerhalb des Webroots und außerhalb des Live-Datenbank-Volumes auf, kopiere sie auf getrennten, vertrauenswürdigen Speicher und nutze nach Möglichkeit die Verschlüsselung des Backup-Datenträgers. Nicht in Git oder öffentliche Synchronisationsdienste übertragen. Eine sinnvolle, aber rein operatorseitige Richtlinie ist: sieben tägliche, vier wöchentliche und mehrere monatliche geprüfte Sicherungen. Dieses Projekt löscht keine Backups automatisch.

## Guarded Restore auf ein leeres Ziel

Der Restore-Helper verweigert bestehende Public-Tabellen, nicht leere Evidence-/Profilbild-Ziele, unpassende Prüfsummen, Symlinks, unerwartete Archivpfade und fehlende explizite Bestätigung. Er überschreibt niemals beiläufig Live-Daten. Bei einem fehlgeschlagenen Restore wird das unvollständige Ziel verworfen und erneut leer angelegt.

1. App und Scheduler stoppen.
2. Einen gewählten Sicherungssatz unverändert in `BACKUP_DIR` bereitstellen.
3. **Neue, leere** PostgreSQL-, Evidence- und Profilbild-Volumes verwenden; nicht die Live-Volumes leeren.
4. PostgreSQL starten und `docker compose create app` ausführen, damit beide privaten Dateivolumes mit der nicht privilegierten Eigentümerschaft initialisiert werden.
5. Restore ausführen:

   ```bash
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml up -d postgres
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml create app
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml --profile operations run --rm -e AZUBI_LAB_RESTORE_CONFIRM=RESTORE_TO_EMPTY_TARGET restore /backups/azubi-lab-backup-<UTC-timestamp>
   ```

6. Der Helper prüft Dump- und beide Archiv-Checksummen sowie sichere Archivpfade, stellt mit `pg_restore --exit-on-error` wieder her, setzt `0700/0600` und vergleicht jeden in PostgreSQL gespeicherten Evidence-SHA-256 mit den wiederhergestellten Bytes.
7. Migrationen als Checksum-/Versionsprüfung ausführen; erwartbar sind ausschließlich „Already applied“-Meldungen:

   ```bash
   docker compose --env-file /etc/azubi-lab/azubi-lab.env -f compose.production.yml run --rm app npm run db:migrate
   ```

8. App starten, beide Healthchecks, Anmeldung, Fortschritt, Challenge-Historie, Benachrichtigungen, autorisierten Evidence-Download und eigenes Profilbild prüfen.

Wenn nur die Datenbank wiederhergestellt wird, bleiben Anhangsmetadaten erhalten; der autorisierte Download liefert für fehlende Bytes sicher `410`. Abweichende Evidence-Bytes werden durch den gespeicherten SHA-256 erkannt. Fehlende Avatarbytes führen sicher zur Initialen-Fallbackanzeige. Eine vollständige Wiederherstellung benötigt deshalb immer Dump, Evidence-Archiv **und** Profilbild-Archiv aus demselben Sicherungssatz.

## Sicheres Update

1. Release/Commit festhalten und neue Image-Version vorbereiten, aber noch nicht aktivieren.
2. App-Schreibzugriffe stoppen und ein vollständiges, extern kopiertes Backup erzeugen.
3. Neues explizit getaggtes Image bauen oder vertrauenswürdig beziehen.
4. `AZUBI_LAB_IMAGE` auf das neue Tag setzen.
5. Migrationen mit dem neuen Image einmalig ausführen.
6. Nur nach erfolgreicher Migration `compose up -d app` ausführen.
7. Readiness, Anmeldung, Dashboards und Evidence-Download prüfen.

Das Migrationssystem ist forward-only. Schlägt eine Migration fehl, darf die neue App nicht blind starten. Down-Migrationen existieren nicht; das Wiederherstellen des vor dem Update erzeugten Gesamtsicherungsstands in **neue leere Volumes** ist der verlässliche Rollback. Ein altes Image allein macht bereits angewendete Schemaänderungen nicht rückgängig.

## Desaster-Recovery

Nach einem Serverplattenausfall werden benötigt:

- verifizierter Quellstand oder explizit getaggtes Image,
- Produktionskonfiguration und erhaltenes `AUTH_SECRET` aus separater Geheimnisablage,
- PostgreSQL-Dump,
- Evidence-Archiv, Profilbild-Archiv und Manifest desselben Sicherungssatzes.

Auf einem neuen Server Netzwerk, leere Volumes und Backup-Verzeichnis anlegen, danach den Guarded-Restore-Ablauf ausführen. Ein erhaltenes `AUTH_SECRET` ermöglicht Sitzungskontinuität, soweit Cookies noch existieren. Bei bewusst neuem oder verlorenem Secret werden alte Sitzungen ungültig; Benutzerkonten und Passwort-Hashes sind nicht verloren und Benutzer können sich erneut anmelden.

## Fehlersuche und Kapazität

- PostgreSQL nicht bereit: `compose ps`, PostgreSQL-Healthcheck und `compose logs postgres` prüfen; keine festen Sleeps verwenden.
- App nicht bereit: `compose logs app`, DB-Health, private Volume-Rechte und die geschützte Produktionskonfiguration prüfen. Logausgaben enthalten keine Secret-Werte.
- Evidence `410`: Metadaten vorhanden, Objekt fehlt oder Hash stimmt nicht; Backup-/Storage-Integrität untersuchen, nicht den privaten Pfad veröffentlichen.
- Avatar fehlt oder Upload scheitert: `/data/profile-images` beziehungsweise den Host-Bind-Mount auf UID/GID 1000 und Modus `0700` prüfen. Login und Lernen bleiben bei einem Ausfall verfügbar; die UI nutzt den Initialen-Fallback.
- Migrationen prüfen: `compose run --rm app npm run db:migrate`; der Befehl zeigt nur Dateinamen und Checksum-Abweichungen, keine Lerndaten.
- Notification-Fehler: systemd-Service und Journal prüfen; kein `--force`-ähnlicher Reparaturlauf ist nötig, da der Generator idempotent ist.

Als Startwert für eine kleine Instanz sind ungefähr 1–2 CPU-Kerne und 1–2 GiB RAM für App plus PostgreSQL plausibel, müssen aber anhand realer Upload-, Build- und Nutzerlast beobachtet werden. Es werden bewusst keine engen Compose-Limits erzwungen, die Node.js in OOM-Situationen bringen könnten. PostgreSQL-Poolgröße 10, fünf Sekunden Verbindungsaufbau-Timeout und 30 Sekunden Idle-Timeout bleiben konservativ für eine einzelne App-Instanz.

Uploadgrenzen, Dateiendungs-/MIME-/Signaturprüfung, zufällige Storage-Schlüssel und authentifizierte Besitzprüfung bleiben aktiv. Das Evidence-Volume benötigt keine ausführbare Mount-Option; wenn die Host-/Runtime-Konfiguration es unterstützt, ist `noexec` eine zusätzliche sinnvolle Betreibermaßnahme. Ein Virenscanner ist nicht enthalten. Response-Header setzen `nosniff`, Frame-Schutz, restriktive Referrer- und Permissions-Policy. Eine robuste nonce-basierte CSP bleibt künftige Härtung; HSTS gehört nach erfolgreicher TLS-Prüfung an den Reverse Proxy.
