# Auth Manager

Auth Manager is a FastAPI-based authentication system with AWS Cognito integration providing comprehensive user authentication and organization management features.

## Features

- User registration and authentication via AWS Cognito
- Email and Google OAuth authentication
- JWT-based claims with custom attributes
- Organization management (creation, updating, deletion)
- Default organization for each user
- Multi-organization membership with user roles
- Role-based access control (RBAC) 
- Organization invitation system

## Setup

### Prerequisites

- Python 3.8+
- AWS Account with Cognito User Pool
- PostgreSQL database
- (Optional) Google OAuth credentials for Google login

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/auth-manager.git
cd auth-manager
```

2. Create a virtual environment and install dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Configure your environment variables
```bash
cp .env.example .env
```
Edit the `.env` file with your specific configuration values.

4. Setup the database
```bash
alembic upgrade head
```

5. Run the server
```bash
uvicorn app.main:app --reload
```

## API Documentation

API documentation is available at `/docs` or `/redoc` when the server is running.

## AWS Cognito Setup

1. Create a Cognito User Pool in AWS Console
2. Set up an App Client with appropriate settings
3. Configure the User Pool ID, App Client ID, and App Client Secret in your `.env` file

## Google OAuth Setup (Optional)

1. Create a project in Google Cloud Console
2. Set up OAuth 2.0 credentials
3. Configure the redirect URI to match your application's callback URL
4. Add the Google Client ID and Secret to your `.env` file
