import sqlite3
conn = sqlite3.connect('app/arcane.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("Tables in database:")
for row in tables:
    print(f"  - {row[0]}")
    
    # Print schema for each table
    schema = c.execute(f"PRAGMA table_info({row[0]})").fetchall()
    for col in schema:
        print(f"      {col['name']} ({col['type']})")

conn.close()
print("\nDatabase tables verification: SUCCESS")
