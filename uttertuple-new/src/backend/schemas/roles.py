from enum import Enum

class ExtendedEnum(Enum):

    @classmethod
    def list(cls):
        return list(map(lambda c: c.value, cls))

class Roles(ExtendedEnum):
    "Represents roles"
    ADMIN: str = "admin"
    MEMBER: str = "member"