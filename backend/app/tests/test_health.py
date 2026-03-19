from fastapi.testclient import TestClient


def test_read_health(client: TestClient) -> None:
  response = client.get('/api/health')

  assert response.status_code == 200
  assert response.json() == {'status': 'ok'}


def test_read_database_health(client: TestClient) -> None:
  response = client.get('/api/health/db')

  assert response.status_code == 200
  assert response.json() == {'status': 'ok'}


def test_cors_preflight_allows_frontend_origin(client: TestClient) -> None:
  response = client.options(
    '/api/health',
    headers={
      'Origin': 'http://localhost:8081',
      'Access-Control-Request-Method': 'GET',
    },
  )

  assert response.status_code == 200
  assert response.headers['access-control-allow-origin'] == 'http://localhost:8081'
