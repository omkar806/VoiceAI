from app.db.dependencies import get_async_db
from app.schemas.user import (
    GoogleCallback,
    TokenData,
    TokenRefresh,
    UserConfirm,
    UserCreate,
    UserLogin,
    UserResendConfirmation,
)
from app.services.cognito import CognitoService
from app.services.user import UserService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_async_db)):
    """
    Register a new user.
    """
    user_service = UserService(db)
    result = await user_service.register_user(user_data.email, user_data.password)
    print(f"result: {result}")
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    return result


@router.post("/confirm", response_model=dict)
async def confirm_registration(confirmation_data: UserConfirm, db: AsyncSession = Depends(get_async_db)):
    """
    Confirm user registration with verification code.
    """
    user_service = UserService(db)
    result = await user_service.confirm_registration(confirmation_data.email, confirmation_data.confirmation_code)

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    return {"message": "User confirmed successfully"}


@router.post("/resend-confirmation", response_model=dict)
async def resend_confirmation(resend_data: UserResendConfirmation, db: AsyncSession = Depends(get_async_db)):
    """
    Resend confirmation code to user's email.
    """
    user_service = UserService(db)
    result = await user_service.resend_confirmation(resend_data.email)

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    return {"message": "Confirmation code resent successfully"}


@router.post("/login", response_model=TokenData)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_async_db)):
    """
    Authenticate a user and return tokens.
    """
    user_service = UserService(db)
    result = await user_service.login(login_data.email, login_data.password)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.post("/refresh", response_model=TokenData)
async def refresh_token(token_data: TokenRefresh, db: AsyncSession = Depends(get_async_db)):
    """
    Refresh tokens using a refresh token.
    """
    user_service = UserService(db)
    result = await user_service.refresh_token(token_data.refresh_token)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.get("/google")
async def google_login():
    """
    Get Google OAuth URL for login.
    """
    cognito_service = CognitoService()
    auth_url = await cognito_service.google_auth_url()
    return {"url": auth_url}


@router.post("/google/callback", response_model=TokenData)
async def google_callback(callback_data: GoogleCallback, db: AsyncSession = Depends(get_async_db)):
    """
    Process Google OAuth callback.
    """
    user_service = UserService(db)
    result = await user_service.google_login(callback_data.code)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result
