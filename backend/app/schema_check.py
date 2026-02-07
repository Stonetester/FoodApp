from sqlalchemy import inspect

EXPECTED_FRIEND_REQUEST_COLUMNS = {
    "id",
    "sender_id",
    "receiver_id",
    "status",
    "created_at",
}

EXPECTED_FRIENDSHIP_COLUMNS = {
    "user_id",
    "friend_id",
    "created_at",
}

def _get_columns(conn, table_name):
    inspector = inspect(conn)
    columns = inspector.get_columns(table_name)
    return {column["name"] for column in columns}

def ensure_social_schema(conn, apply=False):
    if apply:
        raise RuntimeError(
            "Schema mutation is disabled. Run manual SQL migrations instead."
        )

    issues = []

    if not inspect(conn).has_table("friend_requests"):
        issues.append("Missing table: friend_requests")
    else:
        columns = _get_columns(conn, "friend_requests")
        missing = EXPECTED_FRIEND_REQUEST_COLUMNS - columns
        extra = {"requester_id", "recipient_id"} & columns
        if missing:
            issues.append(
                f"friend_requests missing columns: {', '.join(sorted(missing))}"
            )
        if extra:
            issues.append(
                f"friend_requests has legacy columns: {', '.join(sorted(extra))}"
            )

    if not inspect(conn).has_table("friendships"):
        issues.append("Missing table: friendships")
    else:
        columns = _get_columns(conn, "friendships")
        missing = EXPECTED_FRIENDSHIP_COLUMNS - columns
        if missing:
            issues.append(
                f"friendships missing columns: {', '.join(sorted(missing))}"
            )
        if "id" in columns:
            issues.append("friendships has unexpected column: id")

    if issues:
        message = "Schema check failed:\n- " + "\n- ".join(issues)
        raise RuntimeError(message)
