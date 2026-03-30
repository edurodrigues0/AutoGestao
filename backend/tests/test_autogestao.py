"""AutoGestão API Tests - Full backend coverage"""
import pytest
import requests
import os
import time

TS = int(time.time())

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def auth_session(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@autogestao.com", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    # cookies are set automatically in session
    return session

# ---- Auth ----

def test_login_success(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@autogestao.com", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    # login returns user fields directly or nested in "user"
    user = data.get("user", data)
    assert user.get("role") == "admin"
    print(f"Login OK: {user.get('email')}")

def test_login_wrong_password(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@autogestao.com", "password": "wrong"})
    assert resp.status_code == 401
    print("Wrong password returns 401 OK")

def test_get_me(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@autogestao.com"
    assert data["role"] == "admin"
    print(f"GET /me OK: {data['email']}")

# ---- Billing ----

def test_billing_plans(session):
    resp = session.get(f"{BASE_URL}/api/billing/plans")
    assert resp.status_code == 200
    data = resp.json()
    assert "plans" in data
    assert len(data["plans"]) == 3
    keys = [p["id"] for p in data["plans"]]
    assert "basic" in keys
    assert "pro" in keys
    assert "premium" in keys
    # Verify prices
    price_map = {p["id"]: p["price"] for p in data["plans"]}
    assert price_map["basic"] == 69.90
    assert price_map["pro"] == 149.90
    assert price_map["premium"] == 249.90
    print(f"Plans OK: {keys} with prices {price_map}")

def test_billing_subscription(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/billing/subscription")
    assert resp.status_code == 200
    data = resp.json()
    assert "plan" in data
    assert "status" in data
    assert "plan_name" in data
    print(f"Subscription OK: plan={data['plan']}, status={data['status']}")

def test_billing_checkout_returns_url(auth_session):
    """POST /api/billing/checkout must return checkout_url pointing to Asaas sandbox"""
    resp = auth_session.post(f"{BASE_URL}/api/billing/checkout", json={})
    assert resp.status_code == 200, f"Checkout failed: {resp.status_code} | {resp.text}"
    data = resp.json()
    assert "checkout_url" in data, f"Missing checkout_url in response: {data}"
    assert data["checkout_url"].startswith("https://"), f"Invalid URL: {data['checkout_url']}"
    assert "asaas" in data["checkout_url"], f"URL doesn't point to Asaas: {data['checkout_url']}"
    assert "checkout_id" in data
    assert "plan" in data
    print(f"Checkout OK: url={data['checkout_url']}, plan={data['plan']}")

def test_billing_plan_upgrade(auth_session):
    """PUT /api/billing/plan - switch plan"""
    resp = auth_session.put(f"{BASE_URL}/api/billing/plan", json={"plan": "pro"})
    assert resp.status_code == 200
    # Revert back to basic
    auth_session.put(f"{BASE_URL}/api/billing/plan", json={"plan": "basic"})
    print("Plan upgrade OK")

# ---- Dashboard ----

def test_admin_dashboard(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/dashboard/admin")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_services" in data or "services_count" in data or "stats" in data or "total_revenue" in data
    print(f"Admin dashboard OK: {list(data.keys())}")

# ---- Settings ----

def test_get_settings(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "commission_type" in data or "workspace" in data or "name" in data
    print(f"Settings OK: {list(data.keys())}")

def test_update_settings(auth_session):
    resp = auth_session.put(f"{BASE_URL}/api/settings", json={"commission_type": "fixed", "commission_percentage": 10.0})
    assert resp.status_code == 200
    print("PUT settings OK")

# ---- Mechanics ----

def test_create_mechanic(auth_session):
    resp = auth_session.post(f"{BASE_URL}/api/mechanics", json={
        "name": "TEST_Mechanic Silva",
        "email": f"test_mech_{TS}@test.com",
        "password": "mech123"
    })
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "id" in data or "_id" in data
    print(f"Create mechanic OK: {data.get('name')}")
    return data

def test_list_mechanics(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/mechanics")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) or "mechanics" in data
    print(f"List mechanics OK")

# ---- Services ----

def test_create_service(auth_session):
    resp = auth_session.post(f"{BASE_URL}/api/services", json={
        "client_name": "TEST_Cliente Teste",
        "description": "Troca de óleo",
        "value": 150.0
    })
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "id" in data or "_id" in data
    print(f"Create service OK: {data.get('client_name')}")

def test_list_services(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/services")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) or "services" in data
    print("List services OK")

# ---- Reports ----

def test_export_excel(auth_session):
    resp = auth_session.get(f"{BASE_URL}/api/reports/export?format=excel")
    assert resp.status_code == 200
    assert "spreadsheet" in resp.headers.get("Content-Type", "") or "octet-stream" in resp.headers.get("Content-Type", "")
    print(f"Export Excel OK, content-type: {resp.headers.get('Content-Type')}")

# ---- Register Workspace ----

def test_register_workspace(session):
    resp = session.post(f"{BASE_URL}/api/auth/register-workspace", json={
        "name": "TEST_Oficina Teste",
        "owner_name": "TEST_Dono Teste",
        "email": f"test_ws_{TS}@test.com",
        "password": "test123",
        "plan": "basic"
    })
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "user" in data or "workspace" in data or "id" in data
    print(f"Register workspace OK: {list(data.keys())}")

# ---- Mechanic Dashboard ----

def test_mechanic_dashboard(session):
    """Login as mechanic (if exists) and check dashboard"""
    # Try to login as mechanic created in previous test
    mech_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": f"test_mech_{TS}@test.com",
        "password": "mech123"
    })
    if mech_resp.status_code != 200:
        pytest.skip("Mechanic login failed - skipping mechanic dashboard test")
    
    resp = session.get(f"{BASE_URL}/api/dashboard/mechanic")
    assert resp.status_code == 200
    data = resp.json()
    print(f"Mechanic dashboard OK: {list(data.keys())}")
