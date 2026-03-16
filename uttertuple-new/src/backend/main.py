import logging

from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from common.config import Configuration
from argparse import ArgumentParser
from dotenv import load_dotenv
from database.db_init import Database
from security.manager import SecurityManager
from settings.manager import SettingsManager
from call_agents.manager import CallAgentManager
from providers.manager import ProviderManager
from workflow.manager import WorkflowManager
from settings.controller import SettingsRestController
from providers.controller import ProvidersRestController
from call_agents.controller import CallAgentRestController
from workflow.controller import WorkflowRestController
from auth.manager import AuthManager
from auth.controller import AuthRestController
from user.controller import UserRestController
from user.manager import UserManager
from agents.controller import AgentsRestController
from agents.manager import AgentManager
from RAG.controller import RAGRestController
from RAG.manager import RAGManager
from RAG.db_service import RAGVectorDBModelService, RAGFileUploadModelService
from ai_chat_builder.manager import AIChatBuilderManager
from ai_chat_builder.controller import AIChatBuilderRestController
from common.models import Environment
parser = ArgumentParser(description="Runs the BOT service")
parser.add_argument("-e", "--env", help="Path to .env file", default="./etc/.env")
args = parser.parse_args()
load_dotenv(args.env)

api_router = APIRouter()

config= Configuration()

# initializing the database
db = Database(config)
db.init_db()
db_session = db.scoped


security_manager = SecurityManager(config)



auth_manager = AuthManager(config)

settings_manager = SettingsManager(config,db_session,security_manager)
settings_controller = SettingsRestController(settings_manager,auth_manager)
settings_controller.prepare(api_router)

provider_manager = ProviderManager(db_session,security_manager)
providers_controller = ProvidersRestController(auth_manager,db_session,provider_manager)
providers_controller.prepare(api_router)

call_agent_manager = CallAgentManager(config,db_session,provider_manager)
call_agents_controller = CallAgentRestController(call_agent_manager,auth_manager)
call_agents_controller.prepare(api_router)


# rag_manager = RAGManager(db_session,config,security_manager)
workflow_manager = WorkflowManager(db_session,provider_manager)
workflow_controller = WorkflowRestController(auth_manager,workflow_manager)
workflow_controller.prepare(api_router)

user_manager = UserManager(db_session,security_manager)
user_controller = UserRestController(auth_manager,user_manager)
user_controller.prepare(api_router)

agent_manager = AgentManager(config,db_session)
agent_controller = AgentsRestController(agent_manager,auth_manager)
agent_controller.prepare(api_router)

rag_vector_db_service = RAGVectorDBModelService(security_manager,db_session)
rag_file_upload_service = RAGFileUploadModelService(security_manager,db_session)
rag_manager = RAGManager(rag_vector_db_service,rag_file_upload_service)
rag_controller = RAGRestController(db_session,rag_manager,auth_manager)
rag_controller.prepare(api_router)

auth_controller = AuthRestController(db_session,config,auth_manager,user_manager,security_manager)
auth_controller.prepare(api_router)

ai_chat_builder_manager = AIChatBuilderManager(db_session,provider_manager,agent_manager,security_manager,workflow_manager)
ai_chat_builder_controller = AIChatBuilderRestController(ai_chat_builder_manager,auth_manager)
ai_chat_builder_controller.prepare(api_router)

app = FastAPI(
    title=config.configuration().project_name,
    openapi_url=f"{config.configuration().api_v1_str}/openapi.json",
)

app.include_router(api_router, prefix=config.configuration().api_v1_str)

@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    """Clean up the scoped DB session after each request to prevent transaction leaks."""
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        db.remove_session()
        raise
    finally:
        db.remove_session()

@app.get("/health")
async def health():
    return {"status": "ok"}

# Set all CORS enabled origins

app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3002","http://localhost:3015","https://dev.uttertuple.com"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
 

if __name__ == "__main__":
    if config.configuration().environment == Environment.LOCAL.value:
        uvicorn.run("main:app", host=config.configuration().server_configuration.host, timeout_keep_alive=600, port=int(config.configuration().server_configuration.port), reload=True)
    elif config.configuration().environment == Environment.DEV.value or config.configuration().environment == Environment.PROD.value:
        uvicorn.run(app, host=config.configuration().server_configuration.host, timeout_keep_alive=600, port=int(config.configuration().server_configuration.port))