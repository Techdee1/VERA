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

    def upsert_squad_transaction(self, sender_id: str, receiver_id: str, tx_data: dict):
        query = """
        MERGE (s:Account {id: $sender_id})
        MERGE (r:Account {id: $receiver_id})
        CREATE (s)-[t:TRANSACTION {
            amount: $amount,
            currency: $currency,
            reference: $reference,
            timestamp: datetime($timestamp),
            trust_score: $trust_score
        }]->(r)
        SET s.last_updated = datetime($timestamp),
            r.last_updated = datetime($timestamp)
        """
        # Initial trust score calculation or placeholder
        trust_score = self.calculate_trust_score(sender_id) 
        
        with neo4j_driver.session() as session:
            session.run(
                query,
                sender_id=sender_id,
                receiver_id=receiver_id,
                amount=tx_data["amount"],
                currency=tx_data["currency"],
                reference=tx_data["reference"],
                timestamp=tx_data["timestamp"],
                trust_score=trust_score
            )

    def calculate_trust_score(self, account_id: str) -> float:
        """
        Calculates Eigenvector Centrality to detect if a node is becoming a 'fraud hub'.
        High centrality in a network of flagged nodes indicates low trust.
        """
        # We use GDS if available, otherwise a cypher approximation or a simplified metric
        # For this refactor, we implement a Cypher query that computes a centrality-like score
        query = """
        MATCH (a:Account {id: $account_id})
        OPTIONAL MATCH (a)-[:TRANSACTION]-(neighbor)
        WITH a, count(neighbor) as degree, collect(neighbor) as neighbors
        UNWIND neighbors as n
        OPTIONAL MATCH (n)-[:TRANSACTION]-(nn)
        WITH a, degree, count(nn) as neighbor_degree
        RETURN degree * 0.4 + neighbor_degree * 0.6 as hub_score
        """
        # In a real scenario, we'd use CALL gds.eigenvector.stream...
        # Here we return a normalized trust score (1.0 - hub_score/max_expected)
        with neo4j_driver.session() as session:
            result = session.run(query, account_id=account_id).single()
            if result and result["hub_score"]:
                # Simple normalization for demo purposes
                hub_score = result["hub_score"]
                trust_score = max(0.0, 1.0 - (hub_score / 100.0))
                return trust_score
            return 1.0

    def get_account_subgraph(self, account_id: str):
        query = """
        MATCH (a:Account {id: $account_id})-[r:TRANSACTION]-(neighbor)
        RETURN a, r, neighbor
        LIMIT 20
        """
        with neo4j_driver.session() as session:
            return list(session.run(query, account_id=account_id))

graph_service = GraphService()
