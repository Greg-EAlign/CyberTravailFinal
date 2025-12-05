# Boutique en ligne (branche « unsafe »)

Cette branche illustre les erreurs classiques qui exposent une boutique e-commerce aux injections SQL : concaténation côté serveur, absence de validation, et fuite d’informations sensibles.

## Démarrage

```bash
npm install
npm start
# Ouvrir http://localhost:1337
```

## Parcours en trois pages

| Étape | Page           | Route API             | Exemple de payload                          | Impact attendu                     |
| ----- | -------------- | --------------------- | ------------------------------------------- | ---------------------------------- |
| 1     | `login.html`   | `/api/login`          | `' OR '1'='1`                               | Authentification sans mot de passe |
| 2     | `catalog.html` | `/api/searchProducts` | `%' UNION SELECT id, username, password...` | Exfiltration des comptes           |
|       |                | `/api/updatePrice`    | `0; UPDATE Products SET price=0 WHERE 1=1`  | Prix remis à zéro                  |
| 3     | `orders.html`  | `/api/placeOrder`     | `1); INSERT INTO Orders(...); --`           | Commande frauduleuse               |

Chaque page met en évidence la surface d’attaque correspondante et propose des boutons « payload » pour déclencher immédiatement les injections. Le fichier `index.html` sert de point d’entrée et affiche l’état global (utilisateurs, produits, commandes) ainsi qu’une navigation Connexion → Catalogue → Commandes.

Les requêtes SQL sont construites par concaténation directe, ce qui permet aux payloads d’être exécutés tels quels. La base SQLite en mémoire peut être réinitialisée à tout moment via les boutons « Réinitialiser la boutique » présents sur chaque page.

Comparez cette implémentation avec la branche `safe` pour mettre en évidence l’efficacité des requêtes paramétrées et des contrôles d’entrée.
