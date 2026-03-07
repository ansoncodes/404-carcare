"""Utility helpers for security audit logging."""

from apps.core.audit import AuditLog


def get_client_ip(request) -> str | None:
    """Extract client IP from the request (handles proxies)."""
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_unauthorized_access(user, resource_type: str, resource_id: str, request, details: str = ""):
    """Record an unauthorized access attempt."""
    AuditLog.objects.create(
        user=user,
        action=AuditLog.Action.UNAUTHORIZED_ACCESS,
        resource_type=resource_type,
        resource_id=str(resource_id),
        ip_address=get_client_ip(request),
        details=details,
    )


def log_cross_airport_attempt(user, resource_type: str, resource_id: str, request, details: str = ""):
    """Record a cross-airport access attempt."""
    AuditLog.objects.create(
        user=user,
        action=AuditLog.Action.CROSS_AIRPORT_ATTEMPT,
        resource_type=resource_type,
        resource_id=str(resource_id),
        ip_address=get_client_ip(request),
        details=details,
    )


def log_supervisor_reassignment(user, request, old_airport, new_airport, details: str = ""):
    """Record a supervisor reassignment event."""
    AuditLog.objects.create(
        user=user,
        action=AuditLog.Action.SUPERVISOR_REASSIGNED,
        resource_type="supervisor",
        resource_id=str(user.id),
        ip_address=get_client_ip(request),
        details=details or f"Reassigned from {old_airport} to {new_airport}",
    )
