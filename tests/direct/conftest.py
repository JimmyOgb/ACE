import os
import tempfile

import pytest


@pytest.fixture(scope="session", autouse=True)
def _windows_gltest_stdin_compatibility():
    """Defer temp-file deletion for genlayer-test's Windows stdin shim."""
    if os.name != "nt":
        yield
        return

    from gltest.direct import loader

    original = loader._inject_message_to_fd0
    retained_paths = []

    def inject_message(vm):
        from genlayer.py import calldata
        from genlayer.py.types import Address

        sender_addr = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
        contract_addr = (
            Address(vm._contract_address)
            if isinstance(vm._contract_address, bytes)
            else vm._contract_address
        )
        origin_addr = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
        encoded = calldata.encode(
            {
                "contract_address": contract_addr,
                "sender_address": sender_addr,
                "origin_address": origin_addr,
                "stack": [],
                "value": vm._value,
                "datetime": vm._datetime,
                "is_init": False,
                "chain_id": vm._chain_id,
                "entry_kind": 0,
                "entry_data": b"",
                "entry_stage_data": None,
            }
        )
        fd, path = tempfile.mkstemp()
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        vm._original_stdin_fd = os.dup(0)
        os.dup2(fd, 0)
        os.close(fd)
        retained_paths.append(path)

    loader._inject_message_to_fd0 = inject_message
    try:
        yield
    finally:
        loader._inject_message_to_fd0 = original
        for path in retained_paths:
            try:
                os.unlink(path)
            except (FileNotFoundError, PermissionError):
                pass
