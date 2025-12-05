# Boutique en ligne (branche « safe »)

Cette branche montre la mise en œuvre sécurisée des principaux flux d’une boutique e-commerce. Toutes les requêtes SQL utilisent des instructions préparées, la validation des entrées et des conversions de types strictes pour bloquer les attaques par injection.

## Démarrage

```bash
npm install
npm start
# Ouvrir http://localhost:1337
```

Le serveur écoute sur le port `1337` et alimente une base SQLite en mémoire. Le bouton « Réinitialiser la boutique » recharge un jeu de données comprenant :

- **Utilisateurs** : `admin`, `alice`, `bob` (mots de passe en clair pour la démonstration)
- **Produits** : 4 articles avec prix et stock
- **Commandes** : quelques achats existants

## Parcours en trois pages

| Étape | Page           | Route API             | Points clés de sécurisation                                            |
| ----- | -------------- | --------------------- | ---------------------------------------------------------------------- |
| 1     | `login.html`   | `/api/login`          | Requête préparée, valeurs liées, pas d’exfiltration de mot de passe    |
| 2     | `catalog.html` | `/api/searchProducts` | Clause `LIKE` paramétrée, encodage des caractères spéciaux côté client |
|       |                | `/api/updatePrice`    | Conversion numérique stricte, exception si entrée invalide             |
| 3     | `orders.html`  | `/api/placeOrder`     | Vérifications type/borne, calcul du total côté serveur                 |

Chaque page propose les mêmes payloads qu’en branche `unsafe`, mais montre comment la validation et les requêtes paramétrées neutralisent l’injection. `index.html` sert de tableau de bord : navigation Connexion → Catalogue → Commandes et vue d’ensemble de l’état (utilisateurs, produits, commandes).

## Points pédagogiques

- Visualisation temps réel du catalogue, des commandes et des comptes pour vérifier l’intégrité des données.
- Journalisation côté serveur (`console.log`) mettant en évidence les requêtes paramétrées exécutées.
- Possibilité de réinitialiser la base pour repartir d’un état sain après les tests.

Adaptez cette implémentation sécurisée à vos propres projets (hashage des mots de passe, contrôle d’accès, tests automatisés) afin de comparer directement avec la branche `unsafe`.
