# Database Tavola

Le migrazioni SQL descrivono lo schema del database in modo riproducibile.

## Prima configurazione

1. Apri il progetto nella dashboard Supabase.
2. Vai in **SQL Editor** e crea una nuova query.
3. Copia il contenuto di `migrations/202610080001_identity_and_family.sql`.
4. Premi **Run** una sola volta.

Esegui le migrazioni in ordine. La prima crea profili, famiglie, componenti,
esigenze alimentari e preferenze personali. Le successive correggono le policy e
aggiungono ricette, ingredienti, voti, menu, alternative e storico dei pasti.
Ogni tabella privata usa Row Level Security: un utente autenticato può leggere
solo le famiglie alle quali appartiene.

Non inserire mai nel client la password del database, una secret key o la
service-role key.
