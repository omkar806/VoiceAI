import json
import sys
import time

import requests
from rich.console import Console
from rich.table import Table

console = Console()

BASE_URL = "http://localhost:8000/api/v1"

# Mock data for testing
test_user = {"email": "test@example.com", "password": "Test123456"}

test_organization = {"name": "Test Organization", "description": "This is a test organization"}


# Test endpoints
def test_register():
    console.print("[bold blue]Testing user registration...[/bold blue]")
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_login():
    console.print("[bold blue]Testing user login...[/bold blue]")
    response = requests.post(f"{BASE_URL}/auth/login", json=test_user)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_refresh_token(refresh_token):
    console.print("[bold blue]Testing token refresh...[/bold blue]")
    response = requests.post(f"{BASE_URL}/auth/refresh", json={"refresh_token": refresh_token})
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_create_organization(token):
    console.print("[bold blue]Testing organization creation...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/organizations", headers=headers, json=test_organization)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_get_organizations(token):
    console.print("[bold blue]Testing get organizations...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/organizations", headers=headers)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_get_organization(token, organization_id):
    console.print("[bold blue]Testing get organization details...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/organizations/{organization_id}", headers=headers)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_update_organization(token, organization_id):
    console.print("[bold blue]Testing update organization...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/organizations/{organization_id}", headers=headers, json={"name": "Updated Organization Name"})
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_invite_to_organization(token, organization_id):
    console.print("[bold blue]Testing invite to organization...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/organizations/{organization_id}/invite", headers=headers, json={"email": "invited@example.com", "role": "member"})
    print_response(response)
    return response.json() if response.status_code < 300 else None


def test_get_organization_users(token, organization_id):
    console.print("[bold blue]Testing get organization users...[/bold blue]")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/organizations/{organization_id}/users", headers=headers)
    print_response(response)
    return response.json() if response.status_code < 300 else None


def print_response(response):
    try:
        json_response = response.json()
        status = "✅" if response.status_code < 300 else "❌"
        console.print(f"Status Code: {response.status_code} {status}")
        console.print(f"Response: {json.dumps(json_response, indent=2)}")
    except ValueError:
        console.print(f"Status Code: {response.status_code}")
        console.print(f"Response: {response.text}")
    print("\n")


def main():
    console.print("[bold green]Starting API Tests[/bold green]")

    try:
        # Wait for API to be ready
        console.print("Waiting for API to be ready...")
        retry_count = 0
        while retry_count < 10:
            try:
                requests.get(f"{BASE_URL}/docs")
                break
            except requests.exceptions.ConnectionError:
                retry_count += 1
                time.sleep(2)
                console.print(f"Retrying connection {retry_count}/10...")

        if retry_count == 10:
            console.print("[bold red]API not available after multiple retries. Exiting.[/bold red]")
            sys.exit(1)

        # Test registration and login flow
        reg_result = test_register()

        # Wait a bit before login
        time.sleep(1)

        login_result = test_login()
        if not login_result:
            console.print("[bold red]Login failed, cannot continue tests[/bold red]")
            return

        token = login_result.get("access_token")
        refresh_token = login_result.get("refresh_token")

        # Test token refresh
        refresh_result = test_refresh_token(refresh_token)
        if refresh_result:
            token = refresh_result.get("access_token")

        # Test organization creation
        organization = test_create_organization(token)
        if not organization:
            console.print("[bold red]Organization creation failed, cannot continue organization tests[/bold red]")
            return

        organization_id = organization.get("id")

        # Test get organizations
        test_get_organizations(token)

        # Test get organization details
        test_get_organization(token, organization_id)

        # Test update organization
        test_update_organization(token, organization_id)

        # Test invite to organization
        test_invite_to_organization(token, organization_id)

        # Test get organization users
        test_get_organization_users(token, organization_id)

        console.print("[bold green]All tests completed![/bold green]")

    except Exception as e:
        console.print(f"[bold red]Test failed with error: {str(e)}[/bold red]")


if __name__ == "__main__":
    main()
