# TicTac

Suivi des heures supplémentaires et des gardes. Application web en un seul fichier (`index.html`), utilisable hors ligne.

- Les données sont enregistrées uniquement dans le navigateur (localStorage) : rien n'est envoyé sur un serveur.
- `sw.js` est le service worker qui met la page en cache pour l'ouvrir sans réseau.
- Sauvegarde et restauration : onglet Paramètres → Données → Exporter / Importer.
