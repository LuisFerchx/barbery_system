"""
Tests for docker-compose.yml configuration changes.

Validates the `extra_hosts` entry added to the backend service to allow
the container to resolve `host.docker.internal` to the host machine's
gateway IP via `host-gateway`.
"""

import pathlib
import re

import pytest
import yaml

COMPOSE_FILE = pathlib.Path(__file__).parent.parent.parent / "docker-compose.yml"
EXPECTED_EXTRA_HOST_ENTRY = "host.docker.internal:host-gateway"


@pytest.fixture(scope="module")
def compose_config():
    """Load and parse docker-compose.yml once for all tests in this module."""
    with open(COMPOSE_FILE, "r") as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="module")
def backend_service(compose_config):
    """Return the backend service config dict."""
    return compose_config["services"]["backend"]


@pytest.fixture(scope="module")
def frontend_service(compose_config):
    """Return the frontend service config dict."""
    return compose_config["services"]["frontend"]


class TestBackendExtraHosts:
    """Tests for the extra_hosts entry added to the backend service."""

    def test_backend_has_extra_hosts_key(self, backend_service):
        """Backend service must define the extra_hosts mapping."""
        assert "extra_hosts" in backend_service, (
            "backend service is missing the 'extra_hosts' key"
        )

    def test_backend_extra_hosts_is_a_list(self, backend_service):
        """extra_hosts value must be a list."""
        assert isinstance(backend_service["extra_hosts"], list), (
            "'extra_hosts' must be a list of host entries"
        )

    def test_backend_extra_hosts_contains_host_docker_internal(self, backend_service):
        """The required host.docker.internal:host-gateway entry must be present."""
        assert EXPECTED_EXTRA_HOST_ENTRY in backend_service["extra_hosts"], (
            f"expected '{EXPECTED_EXTRA_HOST_ENTRY}' in extra_hosts but got: "
            f"{backend_service['extra_hosts']}"
        )

    def test_backend_extra_hosts_entry_format(self, backend_service):
        """Each extra_hosts entry must follow the 'hostname:ip_or_special' format."""
        for entry in backend_service["extra_hosts"]:
            assert re.match(r"^[^:]+:[^:]+$", entry), (
                f"extra_hosts entry '{entry}' does not match 'hostname:target' format"
            )

    def test_backend_extra_hosts_uses_host_gateway_special_value(self, backend_service):
        """The host.docker.internal entry must resolve via the host-gateway special value."""
        matching = [
            e for e in backend_service["extra_hosts"]
            if e.startswith("host.docker.internal:")
        ]
        assert matching, "No entry for 'host.docker.internal' found in extra_hosts"
        assert matching[0] == EXPECTED_EXTRA_HOST_ENTRY, (
            f"expected 'host.docker.internal:host-gateway' but got '{matching[0]}'"
        )

    def test_backend_extra_hosts_has_exactly_one_entry(self, backend_service):
        """extra_hosts should contain exactly one entry (boundary check)."""
        assert len(backend_service["extra_hosts"]) == 1, (
            f"expected exactly 1 extra_hosts entry, found {len(backend_service['extra_hosts'])}: "
            f"{backend_service['extra_hosts']}"
        )

    def test_no_duplicate_extra_hosts_entries(self, backend_service):
        """extra_hosts must not contain duplicate entries."""
        entries = backend_service["extra_hosts"]
        assert len(entries) == len(set(entries)), (
            f"Duplicate entries found in extra_hosts: {entries}"
        )


class TestFrontendServiceUnchanged:
    """Regression tests ensuring extra_hosts was not accidentally added to frontend."""

    def test_frontend_does_not_have_extra_hosts(self, frontend_service):
        """The frontend service must not have an extra_hosts key (was not part of this PR)."""
        assert "extra_hosts" not in frontend_service, (
            "frontend service unexpectedly has 'extra_hosts' — this was not part of the PR change"
        )


class TestDockerComposeStructure:
    """Sanity tests for overall docker-compose.yml validity after the change."""

    def test_compose_has_services_key(self, compose_config):
        """Top-level 'services' key must exist."""
        assert "services" in compose_config

    def test_compose_has_both_services(self, compose_config):
        """Both backend and frontend services must be present."""
        assert "backend" in compose_config["services"]
        assert "frontend" in compose_config["services"]

    def test_backend_retains_required_keys_after_change(self, backend_service):
        """Backend service must still have all required keys after adding extra_hosts."""
        required_keys = {"build", "env_file", "ports", "restart", "extra_hosts"}
        missing = required_keys - backend_service.keys()
        assert not missing, f"Backend service is missing keys: {missing}"

    def test_backend_port_mapping_unchanged(self, backend_service):
        """Backend port mapping 8001:8001 must not have been altered by this change."""
        assert "8001:8001" in backend_service["ports"]

    def test_backend_restart_policy_unchanged(self, backend_service):
        """Backend restart policy must remain 'unless-stopped'."""
        assert backend_service["restart"] == "unless-stopped"

    def test_backend_env_file_unchanged(self, backend_service):
        """Backend env_file must still point to ./backend/.env."""
        assert "./backend/.env" in backend_service["env_file"]

    def test_backend_build_context_unchanged(self, backend_service):
        """Backend build context must remain ./backend."""
        assert backend_service["build"]["context"] == "./backend"
