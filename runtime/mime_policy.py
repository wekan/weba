"""Bounded native branch of the source MIME detector; no filename or temp file."""
import os
import re
import selectors
import signal
import subprocess
import time

HEADER_BYTES = 64 * 1024
_MIME_SPACE = '\t\n\v\f\r \u00a0\u1680' + ''.join(map(chr, range(0x2000, 0x200b))) + '\u2028\u2029\u202f\u205f\u3000\ufeff'
_MIME_TOKEN = re.compile(r'[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+\Z', re.ASCII)


def detect_native_mime(buffer):
    """Match nativeMime(['--mime-type', '-b', '-'], first 64KiB), or None.

    The primary file-type engine and portable libmagic branch are separate.
    Selectors bound stdin writes as well as stdout/stderr and the total deadline.
    """
    if not isinstance(buffer, (bytes, bytearray, memoryview)):
        raise TypeError('Expected file bytes')
    view = memoryview(buffer)
    if not view.c_contiguous:
        raise TypeError("Expected contiguous file bytes")
    data = bytes(view.cast("B")[:HEADER_BYTES])
    child = None
    watcher = selectors.DefaultSelector()
    streams = []
    output = bytearray()
    error_output = bytearray()
    deadline = time.monotonic() + 2
    try:
        environment = os.environ.copy()
        if environment.get('SNAP') and not environment.get('MAGIC'):
            for relative in ('usr/lib/file/magic.mgc', 'usr/share/misc/magic.mgc', 'usr/share/file/magic.mgc'):
                candidate = os.path.join(environment['SNAP'], relative)
                if os.path.exists(candidate):
                    environment['MAGIC'] = candidate
                    break
        child = subprocess.Popen(['file', '--mime-type', '-b', '-'], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 start_new_session=True, env=environment)
        streams = [child.stdin, child.stdout, child.stderr]
        for stream in streams:
            os.set_blocking(stream.fileno(), False)
        watcher.register(child.stdout, selectors.EVENT_READ, output)
        watcher.register(child.stderr, selectors.EVENT_READ, error_output)
        if data:
            watcher.register(child.stdin, selectors.EVENT_WRITE, None)
        else:
            child.stdin.close()
        offset = 0
        while watcher.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            for key, mask in watcher.select(remaining):
                stream = key.fileobj
                if mask & selectors.EVENT_WRITE:
                    try:
                        sent = os.write(stream.fileno(), data[offset:offset + 4096])
                    except BlockingIOError:
                        continue
                    except BrokenPipeError:
                        sent = 0
                    offset += sent
                    if not sent or offset == len(data):
                        watcher.unregister(stream)
                        stream.close()
                else:
                    try:
                        chunk = os.read(stream.fileno(), 4097)
                    except BlockingIOError:
                        continue
                    if not chunk:
                        watcher.unregister(stream)
                        stream.close()
                    else:
                        key.data.extend(chunk)
                        if len(key.data) > 4096:
                            return None
        # Observe exit without reaping yet: keep this PID reserved until the
        # finally block kills its owned process group and collects the child.
        while True:
            status = os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            if status is not None:
                if status.si_code != os.CLD_EXITED or status.si_status != 0:
                    return None
                break
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            time.sleep(min(0.01, remaining))
        mime = output.decode('utf-8', 'replace').strip(_MIME_SPACE).lower()
        return mime if _MIME_TOKEN.fullmatch(mime) else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None
    finally:
        watcher.close()
        if child is not None:
            # Own session: include any descendants a failed detector left behind.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            for stream in streams:
                if not stream.closed:
                    stream.close()
            try:
                child.wait(timeout=0.5)
            except subprocess.TimeoutExpired:
                pass
