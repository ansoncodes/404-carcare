from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware


def _anonymous_user():
    from django.contrib.auth.models import AnonymousUser

    return AnonymousUser()


@database_sync_to_async
def get_user_from_token(token_key):
    from apps.accounts.models import CustomUser
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    from rest_framework_simplejwt.tokens import AccessToken

    try:
        token = AccessToken(token_key)
        user_id = token['user_id']
        return CustomUser.objects.get(id=user_id)
    except (InvalidToken, TokenError, CustomUser.DoesNotExist):
        return _anonymous_user()


class JWTAuthMiddleware(BaseMiddleware):
    @staticmethod
    def _extract_token(scope):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [])
        if token_list:
            return token_list[0]

        headers = dict(scope.get('headers', []))
        auth_header = headers.get(b'authorization')
        if not auth_header:
            return None

        try:
            scheme, token = auth_header.decode().split(' ', 1)
        except ValueError:
            return None
        if scheme.lower() != 'bearer':
            return None
        return token.strip()

    async def __call__(self, scope, receive, send):
        token = self._extract_token(scope)
        if token:
            scope['user'] = await get_user_from_token(token)
        elif 'user' not in scope:
            scope['user'] = _anonymous_user()

        return await super().__call__(scope, receive, send)
