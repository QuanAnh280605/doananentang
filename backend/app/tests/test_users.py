from fastapi.testclient import TestClient


def test_create_user(client: TestClient) -> None:
  response = client.post(
    '/api/users',
    json={'email': 'alice@example.com', 'full_name': 'Alice Example'},
  )

  assert response.status_code == 201
  payload = response.json()
  assert payload['email'] == 'alice@example.com'
  assert payload['full_name'] == 'Alice Example'
  assert payload['id'] == 1


def test_list_users(client: TestClient) -> None:
  client.post('/api/users', json={'email': 'alice@example.com', 'full_name': 'Alice Example'})
  client.post('/api/users', json={'email': 'bob@example.com', 'full_name': 'Bob Example'})

  response = client.get('/api/users')

  assert response.status_code == 200
  payload = response.json()
  assert len(payload) == 2
  assert payload[0]['email'] == 'alice@example.com'
  assert payload[1]['email'] == 'bob@example.com'


def test_get_user(client: TestClient) -> None:
  create_response = client.post(
    '/api/users',
    json={'email': 'alice@example.com', 'full_name': 'Alice Example'},
  )
  user_id = create_response.json()['id']

  response = client.get(f'/api/users/{user_id}')

  assert response.status_code == 200
  assert response.json()['email'] == 'alice@example.com'


def test_reject_duplicate_email(client: TestClient) -> None:
  client.post('/api/users', json={'email': 'alice@example.com', 'full_name': 'Alice Example'})

  response = client.post('/api/users', json={'email': 'alice@example.com', 'full_name': 'Alice Duplicate'})

  assert response.status_code == 409
  assert response.json() == {'detail': 'Email already exists'}
