from fastapi.testclient import TestClient


def test_create_user(client: TestClient) -> None:
  response = client.post(
    '/api/users',
    json={
      'email': 'alice@example.com',
      'phone': None,
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  assert response.status_code == 201
  payload = response.json()
  assert payload['email'] == 'alice@example.com'
  assert payload['phone'] is None
  assert payload['first_name'] == 'Alice'
  assert payload['last_name'] == 'Example'
  assert payload['birth_date'] == '2000-01-02'
  assert payload['gender'] == 'female'
  assert payload['id'] == 1


def test_list_users(client: TestClient) -> None:
  client.post(
    '/api/users',
    json={
      'email': 'alice@example.com',
      'phone': None,
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )
  client.post(
    '/api/users',
    json={
      'email': None,
      'phone': '0987654321',
      'password': 'secret123',
      'first_name': 'Bob',
      'last_name': 'Example',
      'birth_date': '1999-03-04',
      'gender': 'male',
    },
  )

  response = client.get('/api/users')

  assert response.status_code == 200
  payload = response.json()
  assert len(payload) == 2
  assert payload[0]['email'] == 'alice@example.com'
  assert payload[1]['phone'] == '0987654321'


def test_get_user(client: TestClient) -> None:
  create_response = client.post(
    '/api/users',
    json={
      'email': 'alice@example.com',
      'phone': None,
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )
  user_id = create_response.json()['id']

  response = client.get(f'/api/users/{user_id}')

  assert response.status_code == 200
  assert response.json()['email'] == 'alice@example.com'


def test_reject_duplicate_email(client: TestClient) -> None:
  client.post(
    '/api/users',
    json={
      'email': 'alice@example.com',
      'phone': None,
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  response = client.post(
    '/api/users',
    json={
      'email': 'alice@example.com',
      'phone': None,
      'password': 'secret456',
      'first_name': 'Alice',
      'last_name': 'Duplicate',
      'birth_date': '2000-05-06',
      'gender': 'female',
    },
  )

  assert response.status_code == 409
  assert response.json() == {'detail': 'Email already exists'}


def test_reject_duplicate_phone(client: TestClient) -> None:
  client.post(
    '/api/users',
    json={
      'email': None,
      'phone': '0987654321',
      'password': 'secret123',
      'first_name': 'Alice',
      'last_name': 'Example',
      'birth_date': '2000-01-02',
      'gender': 'female',
    },
  )

  response = client.post(
    '/api/users',
    json={
      'email': None,
      'phone': '0987654321',
      'password': 'secret456',
      'first_name': 'Alice',
      'last_name': 'Duplicate',
      'birth_date': '2000-05-06',
      'gender': 'female',
    },
  )

  assert response.status_code == 409
  assert response.json() == {'detail': 'Phone already exists'}
