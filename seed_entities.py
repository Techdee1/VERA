import pandas as pd
import os
from sqlalchemy import create_engine, MetaData, Table, select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

db_url = os.environ.get('POSTGRES_URL')
if not db_url.startswith('postgresql+psycopg2://'):
    db_url = db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)

engine = create_engine(db_url)
metadata = MetaData()
metadata.reflect(bind=engine)
entities_table = metadata.tables['entities']

df = pd.read_csv('data/synthetic/entities.csv')
# Keep only columns that exist in the table
table_columns = [c.name for c in entities_table.columns]
df = df[[c for c in df.columns if c in table_columns]]
entities_data = df.to_dict(orient='records')

inserted_count = 0
skipped_count = 0

with engine.connect() as conn:
    for row in entities_data:
        stmt = pg_insert(entities_table).values(row).on_conflict_do_nothing()
        res = conn.execute(stmt)
        if res.rowcount > 0:
            inserted_count += 1
        else:
            skipped_count += 1
    conn.commit()

    total_count = conn.execute(select(func.count()).select_from(entities_table)).scalar()

print(f"Inserted: {inserted_count}")
print(f"Skipped: {skipped_count}")
print(f"Final Total: {total_count}")
