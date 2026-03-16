from enum import Enum
class Environment(str, Enum):
    LOCAL = "LOCAL"
    DEV = "DEV"
    PROD = "PROD"