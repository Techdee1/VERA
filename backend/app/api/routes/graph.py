from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.neo4j_client import neo4j_driver

router = APIRouter()


class SubgraphRequest(BaseModel):
    entity_ids: list[str]


@router.get("/graph")
def get_full_graph(limit: int = 500):
    """
    Get the full graph with nodes and edges.
    Limited to prevent overwhelming the frontend.
    """
    query = """
    MATCH (e:Entity)
    WITH e LIMIT $limit
    OPTIONAL MATCH (e)-[r:TRANSACTS_WITH]->(target:Entity)
    RETURN 
        collect(DISTINCT {
            id: e.entity_id,
            label: e.full_name,
            type: e.entity_type,
            address: e.address
        }) as nodes,
        collect(DISTINCT {
            source: e.entity_id,
            target: target.entity_id,
            amount: r.amount,
            reference: r.reference,
            occurred_at: toString(r.occurred_at)
        }) as links
    """
    
    try:
        with neo4j_driver.session() as session:
            result = session.run(query, limit=limit)
            record = result.single()
            
            if not record:
                return {"nodes": [], "links": []}
            
            nodes = [n for n in record["nodes"] if n["id"]]
            links = [l for l in record["links"] if l["source"] and l["target"]]
            
            return {"nodes": nodes, "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph query failed: {str(e)}")


@router.post("/graph/subgraph")
def get_subgraph(request: SubgraphRequest):
    """
    Get a subgraph for specific entity IDs and their immediate neighbors.
    """
    if not request.entity_ids:
        return {"nodes": [], "links": []}
    
    query = """
    MATCH (e:Entity)
    WHERE e.entity_id IN $entity_ids
    OPTIONAL MATCH (e)-[r:TRANSACTS_WITH]-(neighbor:Entity)
    RETURN 
        collect(DISTINCT {
            id: e.entity_id,
            label: e.full_name,
            type: e.entity_type,
            address: e.address
        }) + collect(DISTINCT {
            id: neighbor.entity_id,
            label: neighbor.full_name,
            type: neighbor.entity_type,
            address: neighbor.address
        }) as nodes,
        collect(DISTINCT {
            source: startNode(r).entity_id,
            target: endNode(r).entity_id,
            amount: r.amount,
            reference: r.reference,
            occurred_at: toString(r.occurred_at)
        }) as links
    """
    
    try:
        with neo4j_driver.session() as session:
            result = session.run(query, entity_ids=request.entity_ids)
            record = result.single()
            
            if not record:
                return {"nodes": [], "links": []}
            
            nodes = [n for n in record["nodes"] if n["id"]]
            links = [l for l in record["links"] if l["source"] and l["target"]]
            
            # Remove duplicates
            unique_nodes = {n["id"]: n for n in nodes}.values()
            unique_links = []
            seen = set()
            for link in links:
                key = (link["source"], link["target"], link["reference"])
                if key not in seen:
                    seen.add(key)
                    unique_links.append(link)
            
            return {"nodes": list(unique_nodes), "links": unique_links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subgraph query failed: {str(e)}")
