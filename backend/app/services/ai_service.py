import logging
from app.core.config import settings
from app.services.graph_service import graph_service
# We'll assume Groq/LangChain integration here as requested
from langchain_community.chat_models import ChatGroq
from langchain.schema import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.groq_model
        )

    async def investigate_account(self, account_id: str) -> str:
        """
        Queries the graph and returns a natural language summary of why an account was flagged.
        """
        subgraph = graph_service.get_account_subgraph(account_id)
        
        # Format graph data for LLM
        context = f"Analyzing Account: {account_id}\nConnections:\n"
        for record in subgraph:
            node = record["neighbor"]
            rel = record["r"]
            context += f"- Sent {rel['amount']} {rel['currency']} to {node['id']} at {rel['timestamp']}\n"

        prompt = f"""
        You are VERA (Verification Engine for Risk Analysis), an AML expert agent.
        Review the following transaction graph for an account and provide a concise natural language summary
        of potential risks, specifically looking for 'mule' behavior or 'fraud hub' patterns.
        
        Graph Context:
        {context}
        
        Summary:
        """
        
        messages = [
            SystemMessage(content="You are a senior AML compliance investigator."),
            HumanMessage(content=prompt)
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"AI Investigation failed: {e}")
            return "Unable to perform AI investigation at this time."

ai_service = AIService()
