import argparse
import gzip
import io
import os
import re
import sys
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple
from urllib.parse import urljoin

import requests
from requests import exceptions as req_exc
from xml.etree import ElementTree as ET


DEFAULT_BASE = "https://hotrodan.com"
SITEMAP_CANDIDATES: Sequence[str] = (
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap/sitemap.xml",
)

# Keep
ALLOW_PATTERNS = [
    r"^https?://[^/]+/blogs/",          # blog posts
    r"^https?://[^/]+/products/",       # products
    r"^https?://[^/]+/pages/",          # pages (often includes help center articles)
    r"^https?://[^/]+/collections/",    # collections
    r"^https?://[^/]+/(help|support)/", # explicit help/support sections
    r"^https?://[^/]+/faqs?/",          # FAQ routes
]

# Drop
BLOCK_PATTERNS = [
    r"\?(?:.*(?:variant|utm|ref|gclid|yclid|fbclid|filter)=)",  # junky params / filtered dupes
    r"/cart", r"/checkout", r"/account", r"/admin", r"/policies",
    r"/cdn/", r"\.json$", r"/apps/",
]

USER_AGENT = "HRAN-crawler/1.0"


def _env_flag(name: str) -> bool:
    value = os.getenv(name, "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _build_session(disable_proxies: bool) -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    if disable_proxies:
        session.trust_env = False
    return session


_SESSION_WITH_PROXIES = _build_session(False)
_SESSION_NO_PROXY = _build_session(True)


def _should_retry_without_proxy(exc: Exception) -> bool:
    if isinstance(exc, req_exc.ProxyError):
        return True
    if isinstance(exc, req_exc.HTTPError):
        if exc.response is not None and exc.response.status_code == 403:
            text = "" if exc.response is None else exc.response.text
            if "Tunnel connection failed" in str(exc) or "Tunnel connection failed" in text:
                return True
    return False


def _request(url: str, timeout: int, disable_proxies: bool) -> requests.Response:
    session = _SESSION_NO_PROXY if disable_proxies else _SESSION_WITH_PROXIES
    proxies = {"http": "", "https": ""} if disable_proxies else None
    response = session.get(url, timeout=timeout, allow_redirects=True, proxies=proxies)
    response.raise_for_status()
    return response


def fetch(url: str, timeout: int = 20, *, disable_proxies: Optional[bool] = None) -> requests.Response:
    if disable_proxies is None:
        disable_proxies = _env_flag("DISCOVER_URLS_DISABLE_PROXIES")

    try:
        return _request(url, timeout, disable_proxies=disable_proxies)
    except req_exc.RequestException as exc:
        if not disable_proxies and _should_retry_without_proxy(exc):
            print(f"Retrying {url} without proxies due to {exc.__class__.__name__} ...")
            return _request(url, timeout, disable_proxies=True)
        raise


def _looks_like_gzip(response: requests.Response) -> bool:
    headers = {key.lower(): value for key, value in response.headers.items()}
    content_encoding = headers.get("content-encoding", "").lower()
    if "gzip" in content_encoding:
        return True
    content_type = headers.get("content-type", "").lower()
    if "gzip" in content_type or "x-gzip" in content_type:
        return True
    if response.url.lower().endswith(".gz"):
        return True
    return response.content[:2] == b"\x1f\x8b"


def _response_xml_text(response: requests.Response) -> str:
    content = response.content
    if _looks_like_gzip(response):
        try:
            content = gzip.decompress(content)
        except OSError:
            with io.BytesIO(content) as buf:
                with gzip.GzipFile(fileobj=buf) as gz:
                    content = gz.read()
    encoding = response.encoding or "utf-8"
    try:
        return content.decode(encoding)
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="replace")


def fetch_xml(url: str, timeout: int = 20, *, disable_proxies: Optional[bool] = None) -> Tuple[str, requests.Response]:
    response = fetch(url, timeout, disable_proxies=disable_proxies)
    return _response_xml_text(response), response


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    if tag.startswith("{"):
        return tag.strip("{}")
    return tag


def _child_text(element: ET.Element, candidates: Iterable[str]) -> Optional[str]:
    lookup = {name.lower() for name in candidates}
    for child in element:
        if _local_name(child.tag).lower() in lookup and child.text:
            return child.text
    return None


def _discover_from_sitemap(
    url: str,
    *,
    timeout: int,
    disable_proxies: Optional[bool],
    seen_sitemaps: Optional[Set[str]] = None,
) -> List[Tuple[str, str]]:
    queue: List[str] = [url]
    visited: Set[str] = set() if seen_sitemaps is None else seen_sitemaps
    discovered: List[Tuple[str, str]] = []

    while queue:
        current = queue.pop()
        if current in visited:
            continue
        visited.add(current)
        try:
            xml_text, response = fetch_xml(current, timeout=timeout, disable_proxies=disable_proxies)
        except req_exc.RequestException as exc:
            print(f"Failed to fetch sitemap {current}: {exc.__class__.__name__}: {exc}")
            continue
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as exc:
            print(f"Failed to parse sitemap {current}: {exc}")
            continue

        root_name = _local_name(root.tag).lower()
        if root_name == "sitemapindex":
            for child in root:
                if _local_name(child.tag).lower() != "sitemap":
                    continue
                loc = _child_text(child, {"loc"})
                if not loc:
                    continue
                absolute = urljoin(response.url, loc.strip())
                queue.append(absolute)
        elif root_name == "urlset":
            for child in root:
                if _local_name(child.tag).lower() != "url":
                    continue
                loc = _child_text(child, {"loc"})
                if not loc:
                    continue
                lastmod = _child_text(child, {"lastmod"}) or ""
                absolute = urljoin(response.url, loc.strip())
                discovered.append((absolute, lastmod.strip()))
        else:
            print(f"Ignoring {current}: unexpected root tag '{root.tag}'")
    return discovered


def find_sitemaps(base: str, *, timeout: int, disable_proxies: Optional[bool]) -> List[str]:
    good: List[str] = []
    errors: List[str] = []
    for path in SITEMAP_CANDIDATES:
        url = urljoin(base, path)
        try:
            xml_text, _ = fetch_xml(url, timeout=timeout, disable_proxies=disable_proxies)
            if xml_text.strip().startswith("<"):
                good.append(url)
        except req_exc.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            errors.append(f"{url} → HTTP {status}")
        except req_exc.RequestException as exc:
            errors.append(f"{url} → {exc.__class__.__name__}: {exc}")
        except Exception as exc:  # pragma: no cover - defensive catch-all
            errors.append(f"{url} → {exc.__class__.__name__}: {exc}")
    if not good and errors:
        print("Checked sitemap candidates but none succeeded:")
        for msg in errors[:3]:
            print(f" - {msg}")
        if len(errors) > 3:
            print(f" - … {len(errors) - 3} more similar errors suppressed")
    return good

def allowed(url: str) -> bool:
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, url, flags=re.I):
            return False
    for pattern in ALLOW_PATTERNS:
        if re.search(pattern, url, flags=re.I):
            return True
    return False


def _discover_urls(
    sitemaps: Sequence[str],
    *,
    timeout: int,
    disable_proxies: Optional[bool],
) -> Dict[str, str]:
    seen: Dict[str, str] = {}
    visited_sitemaps: Set[str] = set()
    for sitemap_url in sitemaps:
        for url, lastmod in _discover_from_sitemap(
            sitemap_url,
            timeout=timeout,
            disable_proxies=disable_proxies,
            seen_sitemaps=visited_sitemaps,
        ):
            if allowed(url):
                seen[url] = lastmod
    return seen


def _extend_with_extras(seed: List[str], extras: Sequence[str], base: str) -> None:
    for url in extras:
        candidate = url.strip()
        if not candidate:
            continue
        if candidate.startswith("/"):
            candidate = urljoin(base, candidate)
        if candidate not in seed:
            seed.append(candidate)


def _parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Discover crawlable HotRodAN URLs from sitemaps.")
    parser.add_argument(
        "--base",
        help="Base URL to probe for default sitemap candidates (default: env DISCOVER_URLS_BASE or https://hotrodan.com)",
    )
    parser.add_argument(
        "--sitemap",
        action="append",
        dest="sitemaps",
        default=None,
        help="Explicit sitemap URL to include (can be used multiple times)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.getenv("DISCOVER_URLS_TIMEOUT", "20")),
        help="Request timeout in seconds (default 20 or DISCOVER_URLS_TIMEOUT).",
    )
    parser.add_argument(
        "--disable-proxies",
        action="store_true",
        default=False,
        help="Disable proxies for all requests (overrides DISCOVER_URLS_DISABLE_PROXIES).",
    )
    parser.add_argument(
        "--output",
        default=".",
        help="Directory to write urls.txt and urls_with_lastmod.tsv (default current directory).",
    )
    return parser.parse_args(argv)


def _resolve_base(base_arg: Optional[str]) -> str:
    base = base_arg or os.getenv("DISCOVER_URLS_BASE") or DEFAULT_BASE
    base = base.strip()
    if not base:
        return DEFAULT_BASE
    if not base.endswith("/"):
        base = base + "/"
    return base


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(argv)
    base = _resolve_base(args.base)
    if args.disable_proxies:
        disable_proxies = True
    else:
        disable_proxies = _env_flag("DISCOVER_URLS_DISABLE_PROXIES")

    seeds = list(find_sitemaps(base, timeout=args.timeout, disable_proxies=disable_proxies))

    extras: List[str] = []
    if args.sitemaps:
        extras.extend(args.sitemaps)
    env_extra = os.getenv("DISCOVER_URLS_EXTRA_SITEMAPS", "")
    if env_extra:
        extras.extend(part for part in (item.strip() for item in env_extra.split(",")) if part)
    _extend_with_extras(seeds, extras, base)

    if not seeds:
        print("No sitemap found. Aborting.")
        return 2

    discovered = _discover_urls(seeds, timeout=args.timeout, disable_proxies=disable_proxies)

    urls = sorted(discovered.keys())
    print(f"Discovered {len(urls)} URLs after filtering.")

    output_dir = os.path.abspath(args.output)
    os.makedirs(output_dir, exist_ok=True)
    urls_path = os.path.join(output_dir, "urls.txt")
    tsv_path = os.path.join(output_dir, "urls_with_lastmod.tsv")

    with open(urls_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(urls))
        if urls:
            handle.write("\n")

    with open(tsv_path, "w", encoding="utf-8") as handle:
        for url in urls:
            handle.write(f"{url}\t{discovered[url]}\n")

    print(f"Wrote {urls_path} and {tsv_path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
