from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.core.neo4j_client import neo4j_driver


class GraphService:
    @staticmethod
    def upsert_entity_node(
        entity_id: UUID,
        entity_type: str,
        full_name: str | None,
        address: str | None,
    ) -> None:
        query = """
        MERGE (e:Entity {entity_id: $entity_id})
        SET e.entity_type = $entity_type,
            e.full_name = $full_name,
            e.address = $address,
            e.updated_at = datetime($updated_at)
        """
        with neo4j_driver.session() as session:
            session.run(
                query,
                entity_id=str(entity_id),
                entity_type=entity_type,
                full_name=full_name,
                address=address,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )

    @staticmethod
    def upsert_transaction_edge(
        source_entity_id: UUID,
        destination_entity_id: UUID,
        transaction_id: UUID,
        reference: str,
        amount: Decimal,
        currency: str,
        occurred_at: datetime,
        channel: str | None,
    ) -> None:
        query = """
        MATCH (src:Entity {entity_id: $source_entity_id})
        MATCH (dst:Entity {entity_id: $destination_entity_id})
        MERGE (src)-[r:TRANSACTS_WITH {reference: $reference}]->(dst)
        SET r.transaction_id = $transaction_id,
            r.amount = toFloat($amount),
            r.currency = $currency,
            r.occurred_at = datetime($occurred_at),
            r.channel = $channel,
            r.updated_at = datetime($updated_at)
        """
        with neo4j_driver.session() as session:
            session.run(
                query,
                source_entity_id=str(source_entity_id),
                destination_entity_id=str(destination_entity_id),
                transaction_id=str(transaction_id),
                reference=reference,
                amount=f"{amount:.2f}",
                currency=currency,
                occurred_at=occurred_at.isoformat(),
                channel=channel,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )


graph_service = GraphService()
