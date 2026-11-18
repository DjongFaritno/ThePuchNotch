# Installing thepuchnotch

See the [Fedora installation steps](../README.md#install-on-fedora).
Install from this repository, as your normal user, with `./install.sh`; log out and
back in after installation. Do not run the installer with sudo.

## Migrating

The installer imports thenotch data/configuration once and copies its GSettings
only when ThePuchNotch has no preferences yet. Existing destination files are never
overwritten. The previous extension and daemon are disabled; their files are kept.
The migration marker is `~/.local/share/thepuchnotch/.migrated-thenotch`.
Absolute shelf or cover paths may still reference the retained old data directory.
Do not delete it until you have verified those files in the new installation.

Isle remains the credited upstream project. Its extension is disabled to avoid an
overlapping island, but its data is not copied or deleted.

## Diagnosis

```sh
~/.local/bin/thepuchnotchd --doctor
systemctl --user status thepuchnotchd
journalctl --user -u thepuchnotchd -n 80
```

To undo the migration, disable ThePuchNotch and re-enable the retained thenotch
extension/service. Data subsequently created in ThePuchNotch is not merged back.

GitHub release downloads use DjongFaritno/ThePuchNotch. Until a binary release is
published, use the source installer. The About page does not claim an unpublished
version is downloadable.
