"""Implements the default configuration"""

import configparser
import os

from common.data_model import Configuration as ConfigurationModel


class Configuration:
    """Represents the default configuration"""

    def __init__(self):
        config_obj = {
            "application_name": os.environ.get("APPLICATION_NAME", "uttertuple"),
            "logger_configuration": {"log_level": os.environ.get("LOG_LEVEL", "DEBUG")},
            "server_configuration": {
                "host": os.environ.get("HOST", "0.0.0.0"), 
                "port": os.environ.get("PORT", "8082"),
                "reload": os.environ.get("RELOAD", "false"),
                "num_workers": os.environ.get("NUM_WORKERS", 1),
            },
            "api_v1_str": os.environ.get("API_V1_STR"),
            "project_name": os.environ.get("PROJECT_NAME"),
            # "openai_configuration": {
            #     "api_key": os.environ.get("OPENAI_API_KEY"),
            #     "model_name": os.environ.get("OPENAI_MODEL_NAME"),
            #     "embedding_model_name": os.environ.get("OPENAI_EMBEDDING_MODEL_NAME"),
            # },

            # "anthropicai_configuration": {
            #     "api_key": os.environ.get("ANTHROPIC_API_KEY", "ADD_ANTHROPIC_API_KEY"),
            #     "model_name": os.environ.get("ANTHROPIC_MODEL_NAME", "ADD_ANTHROPIC_MODEL_NAME"),
            # },
            # "geminiai_configuration": {
            #     "api_key": os.environ.get("GEMINI_API_KEY", "ADD_GEMINI_API_KEY"),
            #     "model_name": os.environ.get("GEMINI_MODEL_NAME", "ADD_GEMINI_MODEL_NAME"),
            # },
            # "pinecone_configuration": {
            #     "api_key": os.environ.get("PINECONE_API_KEY", "ADD_PINECONE_API_KEY"),
            #     "index": os.environ.get("PINECONE_INDEX", "ADD_PINECONE_INDEX"),
            #     "namespace": os.environ.get("PINECONE_NAMESPACE", "ADD_PINECONE_NAMESPACE"),
            #     "spec_cloud": os.environ.get("PINECONE_SPEC_CLOUD", "ADD_PINECONE_SPEC_CLOUD"),
            #     "spec_region": os.environ.get("PINECONE_SPEC_REGION", "ADD_PINECONE_SPEC_REGION"),
            #     "metric": os.environ.get("PINECONE_METRIC", "ADD_PINECONE_METRIC"),
            #     "timeout": os.environ.get("PINECONE_TIMEOUT", 10),
            # },

            "postgresql_configuration": {
                "host": os.environ.get("POSTGRES_HOST"),
                "port": os.environ.get("POSTGRES_PORT"),
                "username": os.environ.get("POSTGRES_USERNAME"),
                "password": os.environ.get("POSTGRES_PASSWRD"),
                "db": os.environ.get("POSTGRES_DB"),
                "app_schema": os.environ.get("POSTGRES_APP_SCHEMA")
            },
            "encryption_key": os.environ.get("ENCRYPTION_KEY"),
            "access_token_expire_minutes": int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES")),
            "secret_key": os.environ.get("SECRET_KEY"),
            "jwt_algorithm": os.environ.get("JWT_ALGORITHM"),
            "jwt_secret_key": os.environ.get("JWT_SECRET_KEY"),
            "environment": os.environ.get("ENVIRONMENT"),
        }
        self._configuration = ConfigurationModel(**config_obj)
        self._config = configparser.ConfigParser()  # Read the config.ini file
        self._config.read(os.environ.get("CONFIG_INI_PATH"))

    def configuration(self):
        """Returns the configuration"""
        return self._configuration

    def config_ini(self):
        """Returns the config from ini file"""
        return self._config
