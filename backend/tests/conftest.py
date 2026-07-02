import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import TestingConfig


@pytest.fixture(scope='session')
def app():
    return create_app(TestingConfig)


@pytest.fixture()
def client(app):
    return app.test_client()


def register_and_login(client, username):
    client.post('/api/auth/register', json={
        'username': username,
        'email': f'{username}@test.local',
        'password': 'Test1234',
    })
    resp = client.post('/api/auth/login', json={'username': username, 'password': 'Test1234'})
    assert resp.status_code == 200, resp.get_json()
    return client


@pytest.fixture()
def alice(app):
    c = app.test_client()
    return register_and_login(c, 'alice')


def switch_user(client, username):
    """Log the shared test client into a different account.

    Two concurrent test_clients leak session state across each other in this
    Flask/flask-login version, so multi-user tests must run sequentially on
    one client: act as A, switch_user(client, 'b'), act as B.
    """
    client.post('/api/auth/logout')
    return register_and_login(client, username)
