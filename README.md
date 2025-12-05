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

## Routes disponibles

| Fonction          | Route API             | Points clés de sécurisation                                            |
| ----------------- | --------------------- | ---------------------------------------------------------------------- |
| Connexion         | `/api/login`          | Requête préparée, valeurs liées, pas d’exfiltration de mot de passe    |
| Recherche produit | `/api/searchProducts` | Clause `LIKE` paramétrée, encodage des caractères spéciaux côté client |
| Mise à jour prix  | `/api/updatePrice`    | Conversion numérique stricte, exception si entrée invalide             |
| Création commande | `/api/placeOrder`     | Vérifications type/borne, calcul du total côté serveur                 |

La page `index.html` propose un formulaire par fonctionnalité. Les « payloads bloqués » permettent de tester des injections classiques (`' OR '1'='1`, `UNION SELECT`, etc.) et d’observer qu’aucune requête malveillante n’est exécutée.

## Points pédagogiques

- Visualisation temps réel du catalogue, des commandes et des comptes pour vérifier l’intégrité des données.
- Journalisation côté serveur (`console.log`) mettant en évidence les requêtes paramétrées exécutées.
- Possibilité de réinitialiser la base pour repartir d’un état sain après les tests.

Adaptez cette implémentation sécurisée à vos propres projets (hashage des mots de passe, contrôle d’accès, tests automatisés) afin de comparer directement avec la branche `unsafe`.
