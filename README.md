# Boutique en ligne (branche « unsafe »)

Cette branche illustre les erreurs classiques qui exposent une boutique e-commerce aux injections SQL : concaténation côté serveur, absence de validation, et fuite d’informations sensibles.

## Démarrage

```bash
npm install
npm start
# Ouvrir http://localhost:1337
```

## Surfaces vulnérables

| Fonction          | Route API             | Exemple de payload                          | Impact attendu                     |
| ----------------- | --------------------- | ------------------------------------------- | ---------------------------------- |
| Connexion         | `/api/login`          | `' OR '1'='1`                               | Authentification sans mot de passe |
| Recherche produit | `/api/searchProducts` | `%' UNION SELECT id, username, password...` | Exfiltration des comptes           |
| Mise à jour prix  | `/api/updatePrice`    | `0; UPDATE Products SET price=0 WHERE 1=1`  | Prix remis à zéro                  |
| Création commande | `/api/placeOrder`     | `1); INSERT INTO Orders(...); --`           | Commande frauduleuse               |

Les requêtes SQL sont construites par concaténation directe, ce qui permet aux payloads d’être exécutés tels quels. La base SQLite en mémoire peut être réinitialisée à tout moment via le bouton « Réinitialiser la boutique ».

Comparez cette implémentation avec la branche `safe` pour mettre en évidence l’efficacité des requêtes paramétrées et des contrôles d’entrée.
