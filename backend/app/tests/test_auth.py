from fastapi.testclient import TestClient


def test_register_with_email_returns_access_token(client: TestClient) -> None:
  response = client.post(
    '/api/auth/register',
    json={
      'contact': 'alice@example.com',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  assert response.status_code == 201
  payload = response.json()
  assert payload['token_type'] == 'bearer'
  assert payload['access_token']
  assert payload['user']['email'] == 'alice@example.com'
  assert payload['user']['phone'] is None


def test_register_rejects_duplicate_phone(client: TestClient) -> None:
  client.post(
    '/api/auth/register',
    json={
      'contact': '0987654321',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  response = client.post(
    '/api/auth/register',
    json={
      'contact': '0987654321',
      'password': 'secret456',
      'first_name': 'Alice',
      'last_name': 'Duplicate',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  assert response.status_code == 409
  assert response.json() == {'detail': 'Phone already exists'}


def test_register_rejects_invalid_contact_format(client: TestClient) -> None:
  response = client.post(
    '/api/auth/register',
    json={
      'contact': 'not-a-valid-contact',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  assert response.status_code == 422
  assert response.json() == {'detail': 'Contact must be a valid email or phone number'}


def test_login_with_phone_returns_access_token(client: TestClient) -> None:
  client.post(
    '/api/auth/register',
    json={
      'contact': '0987654321',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  response = client.post(
    '/api/auth/login',
    json={
      'identifier': '0987654321',
      'password': 'secret123',
    },
  )

  assert response.status_code == 200
  payload = response.json()
  assert payload['token_type'] == 'bearer'
  assert payload['access_token']
  assert payload['user']['phone'] == '0987654321'


def test_login_rejects_invalid_identifier_format(client: TestClient) -> None:
  response = client.post(
    '/api/auth/login',
    json={
      'identifier': 'invalid-identifier',
      'password': 'secret123',
    },
  )

  assert response.status_code == 422
  assert response.json() == {'detail': 'Contact must be a valid email or phone number'}


def test_login_rejects_invalid_password(client: TestClient) -> None:
  client.post(
    '/api/auth/register',
    json={
      'contact': 'alice@example.com',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  response = client.post(
    '/api/auth/login',
    json={
      'identifier': 'alice@example.com',
      'password': 'wrong-password',
    },
  )

  assert response.status_code == 401
  assert response.json() == {'detail': 'Invalid credentials'}


def test_register_login_me_happy_path(client: TestClient) -> None:
  register_response = client.post(
    '/api/auth/register',
    json={
      'contact': 'alice@example.com',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )
  access_token = register_response.json()['access_token']

  response = client.get(
    '/api/auth/me',
    headers={'Authorization': f'Bearer {access_token}'},
  )

  assert response.status_code == 200
  payload = response.json()
  assert payload['email'] == 'alice@example.com'
  assert payload['first_name'] == 'Alice'
  assert payload['last_name'] == 'Example'
