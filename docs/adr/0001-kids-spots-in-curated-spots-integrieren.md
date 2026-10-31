# Kids Spots in CuratedSpot integrieren

Kids Spots sind keine eigene Entität und kein eigenes Modul, sondern eine Qualifizierung eines bestehenden Curated Spot über ein eingebettetes, optionales Kids-Profil. Ausschlaggebend war, dass Name, Foto, Adresse und Link bereits im CuratedSpot vorhanden sind — ein separates Kids-Modul hätte Pflege, Uploads, Suche und Ratings verdoppelt und Orte wie den Tiergarten, die sowohl normaler als auch Kids Spot sind, zu doppelt gepflegten Datensätzen gemacht.

**Konsequenzen:** Dieselben Daten tragen zwei Sichten (allgemeine Spot-Ansicht und Kids-Ansicht mit eigener Sichtbarkeitsregel). Wer das Kids-Profil entfernt, löscht den Spot nicht. Bestands-Spots werden nicht automatisch zu Kids Spots — die Qualifizierung erfolgt ausschließlich redaktionell.
